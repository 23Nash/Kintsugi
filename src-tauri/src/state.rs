use tracker_core::Pool;

/// Database handle stored in Tauri's managed state.
pub enum DbState {
    Ready(Pool),
    /// Opening failed at startup; the message is shown to the user.
    Failed(String),
}
