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
        if versions.iter().any(|v| !known.contains(v)) {
            let db = versions.into_iter().max().unwrap_or(0);
            result = Err(Error::NewerDatabase {
                db,
                app: app_version(),
            });
        }
    }
    conn.close().await?;
    result
}

/// Opens (creating if missing) the SQLite file at `path` and runs pending migrations.
///
/// Sets WAL, `synchronous = NORMAL`, foreign keys and a 5 s busy timeout. Refuses,
/// before writing anything, a file made by a newer build.
pub async fn open(path: &Path) -> Result<SqlitePool> {
    refuse_newer_database(path).await?;
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
