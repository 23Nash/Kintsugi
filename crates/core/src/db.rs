use std::path::Path;

use serde::Serialize;
use sqlx::SqlitePool;
use sqlx::migrate::Migrator;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::{Connection, SqliteConnection};
use std::time::Duration;

use crate::{Error, Result};

/// Connection pool handed to callers. The shell stores it; it never runs SQL.
pub type Pool = SqlitePool;

/// Migrations embedded from `crates/core/migrations` at compile time.
static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

/// Number of migrations embedded in this build, as opposed to applied to a database.
pub fn migration_count() -> i64 {
    MIGRATOR.iter().count() as i64
}

/// Highest migration version this build knows, or 0 with no migrations.
fn app_version() -> i64 {
    MIGRATOR.iter().map(|m| m.version).max().unwrap_or(0)
}

/// Refuses a file whose migrations table holds a version this build doesn't know.
///
/// Uses a read-only connection, so nothing is written to the file.
async fn refuse_newer_database(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let options = SqliteConnectOptions::new().filename(path).read_only(true);
    let mut conn = SqliteConnection::connect_with(&options).await?;
    let has_table: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
    )
    .fetch_one(&mut conn)
    .await?;
    let mut result = Ok(());
    if has_table > 0 {
        let versions: Vec<i64> = sqlx::query_scalar("SELECT version FROM _sqlx_migrations")
            .fetch_all(&mut conn)
            .await?;
        let known: Vec<i64> = MIGRATOR.iter().map(|m| m.version).collect();
        if let Some(unknown) = versions.into_iter().filter(|v| !known.contains(v)).max() {
            let app = app_version();
            result = Err(if unknown > app {
                Error::NewerDatabase { db: unknown, app }
            } else {
                Error::UnknownMigration { version: unknown }
            });
        }
    }
    conn.close().await?;
    result
}

/// Number of pre-migration backups kept.
const BACKUPS_KEPT: usize = 5;

/// Writes a `VACUUM INTO` backup when the file already has tables and migrations pending.
///
/// The backup goes to a `backups` directory next to the database, named
/// `kintsugi-<utc timestamp>-pre-<target version>.db`; only the newest
/// [`BACKUPS_KEPT`] are kept. A new file, or one with nothing pending, gets none.
/// If a backup for the same target version exists, no new one is written, so a
/// migration that keeps failing cannot push older restore points out.
async fn backup_if_pending(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let options = SqliteConnectOptions::new().filename(path).read_only(true);
    let mut conn = SqliteConnection::connect_with(&options).await?;
    let user_tables: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_one(&mut conn)
    .await?;
    let result = if user_tables > 0 {
        let has_migrations: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
        )
        .fetch_one(&mut conn)
        .await?;
        let applied: Vec<i64> = if has_migrations > 0 {
            sqlx::query_scalar("SELECT version FROM _sqlx_migrations WHERE success = 1")
                .fetch_all(&mut conn)
                .await?
        } else {
            Vec::new()
        };
        if MIGRATOR.iter().any(|m| !applied.contains(&m.version)) {
            write_backup(&mut conn, path).await
        } else {
            Ok(())
        }
    } else {
        Ok(())
    };
    conn.close().await?;
    result
}

/// Backup path for `stamp` and `version` that does not exist yet.
///
/// `VACUUM INTO` refuses an existing file, so a name clash gets a `-<n>` after the stamp.
fn free_backup_path(dir: &Path, stamp: &str, version: i64) -> std::path::PathBuf {
    let first = dir.join(format!("kintsugi-{stamp}-pre-{version}.db"));
    if !first.exists() {
        return first;
    }
    (2..)
        .map(|n| dir.join(format!("kintsugi-{stamp}-{n}-pre-{version}.db")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}

async fn write_backup(conn: &mut SqliteConnection, path: &Path) -> Result<()> {
    let dir = path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("backups");
    std::fs::create_dir_all(&dir)?;
    let stamp: String = sqlx::query_scalar("SELECT strftime('%Y%m%dT%H%M%SZ', 'now')")
        .fetch_one(&mut *conn)
        .await?;
    let suffix = format!("-pre-{}.db", app_version());
    let already = std::fs::read_dir(&dir)?
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .any(|n| n.starts_with("kintsugi-") && n.ends_with(&suffix));
    if already {
        return Ok(());
    }
    let target = free_backup_path(&dir, &stamp, app_version());
    sqlx::query("VACUUM INTO ?")
        .bind(target.to_string_lossy().into_owned())
        .execute(&mut *conn)
        .await?;

    let mut names: Vec<String> = std::fs::read_dir(&dir)?
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| n.starts_with("kintsugi-") && n.ends_with(".db"))
        .collect();
    names.sort();
    let excess = names.len().saturating_sub(BACKUPS_KEPT);
    for name in names.into_iter().take(excess) {
        std::fs::remove_file(dir.join(name))?;
    }
    Ok(())
}

/// Opens (creating if missing) the SQLite file at `path` and runs pending migrations.
///
/// Sets WAL, `synchronous = NORMAL`, foreign keys and a 5 s busy timeout. Refuses,
/// before writing anything, a file made by a newer build. Backs up an existing
/// database before applying pending migrations.
pub async fn open(path: &Path) -> Result<SqlitePool> {
    refuse_newer_database(path).await?;
    backup_if_pending(path).await?;
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new().connect_with(options).await?;
    MIGRATOR.run(&pool).await?;
    Ok(pool)
}

/// Opens a private in-memory database with migrations applied. For tests.
///
/// Each SQLite in-memory connection is its own database, so the pool holds
/// exactly one connection and never closes it.
pub async fn open_in_memory() -> Result<SqlitePool> {
    let options = SqliteConnectOptions::new().in_memory(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .min_connections(1)
        .idle_timeout(None)
        .max_lifetime(None)
        .connect_with(options)
        .await?;
    MIGRATOR.run(&pool).await?;
    Ok(pool)
}

/// Result of [`health`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub applied_migrations: i64,
}

/// Runs a trivial query and reports how many migrations have been applied.
pub async fn health(pool: &SqlitePool) -> Result<Health> {
    sqlx::query("SELECT 1").execute(pool).await?;
    let applied_migrations: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(pool)
            .await?;
    Ok(Health { applied_migrations })
}

#[cfg(test)]
mod tests {
    use super::free_backup_path;

    #[test]
    fn free_backup_path_avoids_existing_names() {
        let dir = std::env::temp_dir().join(format!("kintsugi-free-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let first = free_backup_path(&dir, "20260101T000000Z", 7);
        assert!(first.ends_with("kintsugi-20260101T000000Z-pre-7.db"));
        std::fs::write(&first, b"x").unwrap();
        let second = free_backup_path(&dir, "20260101T000000Z", 7);
        std::fs::write(&second, b"x").unwrap();
        let third = free_backup_path(&dir, "20260101T000000Z", 7);
        let _ = std::fs::remove_dir_all(&dir);
        assert_ne!(first, second);
        assert_ne!(second, third);
        assert_ne!(first, third);
    }
}
