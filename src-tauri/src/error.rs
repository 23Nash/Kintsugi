use serde::Serialize;

/// Error returned to the frontend by every command.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub kind: ErrorKind,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    /// The database could not be opened at startup.
    DatabaseUnavailable,
    /// A database or migration operation failed.
    Database,
}

impl CommandError {
    pub fn unavailable(message: &str) -> Self {
        Self {
            kind: ErrorKind::DatabaseUnavailable,
            message: message.to_owned(),
        }
    }
}

impl From<tracker_core::Error> for CommandError {
    fn from(error: tracker_core::Error) -> Self {
        Self {
            kind: ErrorKind::Database,
            message: error.to_string(),
        }
    }
}
