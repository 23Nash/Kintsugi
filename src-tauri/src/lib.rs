//! Tauri shell: startup, managed state, thin commands.
//! No domain logic or SQL here; that lives in `tracker-core`.

mod commands;
mod error;
mod state;

use tauri::Manager;

use crate::state::DbState;

const DB_FILE_NAME: &str = "kintsugi.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .setup(|app| {
            let db = tauri::async_runtime::block_on(open_database(app.handle()));
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::health])
        .run(tauri::generate_context!());

    if let Err(error) = result {
        eprintln!("error while running tauri application: {error}");
        std::process::exit(1);
    }
}

/// Opens the database in the app data directory. A failure is kept in state
/// so the window still opens and the page can show the error.
async fn open_database(app: &tauri::AppHandle) -> DbState {
    let dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(error) => {
            return DbState::Failed(format!("cannot resolve app data directory: {error}"));
        }
    };
    if let Err(error) = std::fs::create_dir_all(&dir) {
        return DbState::Failed(format!("cannot create {}: {error}", dir.display()));
    }
    let path = dir.join(DB_FILE_NAME);
    match tracker_core::open(&path).await {
        Ok(pool) => DbState::Ready(pool),
        Err(error) => DbState::Failed(format!("cannot open {}: {error}", path.display())),
    }
}
