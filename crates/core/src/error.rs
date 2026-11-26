use thiserror::Error;

/// Every error the core crate returns.
#[derive(Debug, Error)]
pub enum Error {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    #[error("backup error: {0}")]
    Io(#[from] std::io::Error),

    #[error(
        "this database was made by a newer Kintsugi (database version {db}, this app knows up to {app})"
    )]
    NewerDatabase { db: i64, app: i64 },
}

pub type Result<T> = std::result::Result<T, Error>;
