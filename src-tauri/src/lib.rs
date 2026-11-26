//! Tauri shell: startup, managed state, thin commands.
//! No domain logic or SQL here; that lives in `tracker-core`.

mod commands;
mod error;
mod state;

use std::path::{Path, PathBuf};

use tauri::Manager;

use crate::state::DbState;

const DB_FILE_NAME: &str = "kintsugi.db";
const DEV_DB_FILE_NAME: &str = "kintsugi-dev.db";
const DB_PATH_ENV: &str = "KINTSUGI_DB_PATH";

/// Picks the database path. The override wins in any build; otherwise debug
/// builds use the dev database so running the app never touches real data.
fn db_path(app_data_dir: &Path, is_debug: bool, env_override: Option<&str>) -> PathBuf {
    match env_override {
        Some(path) if !path.is_empty() => PathBuf::from(path),
        _ if is_debug => app_data_dir.join(DEV_DB_FILE_NAME),
        _ => app_data_dir.join(DB_FILE_NAME),
    }
}

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
    let env_override = std::env::var(DB_PATH_ENV).ok();
    let path = db_path(&dir, cfg!(debug_assertions), env_override.as_deref());
    if let Some(parent) = path.parent()
        && let Err(error) = std::fs::create_dir_all(parent)
    {
        return DbState::Failed(format!("cannot create {}: {error}", parent.display()));
    }
    match tracker_core::open(&path).await {
        Ok(pool) => DbState::Ready(pool),
        Err(error) => DbState::Failed(format!("cannot open {}: {error}", path.display())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_database_path_by_build_and_override() {
        let dir = Path::new("data");
        let custom = "elsewhere/scratch.db";
        let cases = [
            (true, None, dir.join("kintsugi-dev.db")),
            (false, None, dir.join("kintsugi.db")),
            (true, Some(custom), PathBuf::from(custom)),
            (false, Some(custom), PathBuf::from(custom)),
        ];
        for (is_debug, env_override, expected) in cases {
            assert_eq!(db_path(dir, is_debug, env_override), expected);
        }
    }
}
