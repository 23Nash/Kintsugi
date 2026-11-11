use std::path::Path;

use serde::Serialize;
use sqlx::SqlitePool;
use sqlx::migrate::Migrator;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

use crate::Result;

/// Connection pool handed to callers. The shell stores it; it never runs SQL.
pub type Pool = SqlitePool;

/// Migrations embedded from `crates/core/migrations` at compile time.
static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

/// Opens (creating if missing) the SQLite file at `path` and runs pending migrations.
pub async fn open(path: &Path) -> Result<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true);
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
