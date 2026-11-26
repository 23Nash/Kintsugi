use tracker_core::Pool;

use crate::error::CommandError;

/// Database handle stored in Tauri's managed state.
pub enum DbState {
    Ready(Pool),
    /// Opening failed at startup; the message is shown to the user.
    Failed(String),
}

impl DbState {
    /// The pool, or a `databaseUnavailable` error when startup failed.
    pub fn pool(&self) -> Result<&Pool, CommandError> {
        match self {
            DbState::Ready(pool) => Ok(pool),
            DbState::Failed(message) => Err(CommandError::unavailable(message)),
        }
    }
}
