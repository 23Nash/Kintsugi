//! Thin commands: argument handling and error mapping only.

use tauri::State;
use tracker_core::Health;

use crate::error::CommandError;
use crate::state::DbState;

#[tauri::command]
pub async fn health(db: State<'_, DbState>) -> Result<Health, CommandError> {
    match db.inner() {
        DbState::Ready(pool) => Ok(tracker_core::health(pool).await?),
        DbState::Failed(message) => Err(CommandError::unavailable(message)),
    }
}
