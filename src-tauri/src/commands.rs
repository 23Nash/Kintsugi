//! Thin commands: argument handling and error mapping only.

use tauri::State;
use tracker_core::Health;

use crate::error::CommandError;
use crate::state::DbState;

#[tauri::command]
pub async fn health(db: State<'_, DbState>) -> Result<Health, CommandError> {
    Ok(tracker_core::health(db.pool()?).await?)
}
