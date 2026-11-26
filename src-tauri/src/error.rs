use serde::Serialize;

/// Error returned to the frontend by every command.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub kind: ErrorKind,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    /// The database could not be opened at startup.
    DatabaseUnavailable,
    /// A database or migration operation failed.
    Database,
    Validation,
    NotFound,
    Network,
    RateLimited,
    Upstream,
    Cancelled,
    Internal,
}

impl CommandError {
    pub fn unavailable(message: &str) -> Self {
        Self {
            kind: ErrorKind::DatabaseUnavailable,
            message: message.to_owned(),
            field: None,
        }
    }
}

impl From<tracker_core::Error> for CommandError {
    fn from(error: tracker_core::Error) -> Self {
        use tracker_core::Error;
        let message = error.to_string();
        let (kind, field) = match error {
            Error::Database(_) | Error::Migration(_) => (ErrorKind::Database, None),
            Error::NewerDatabase { .. } => (ErrorKind::DatabaseUnavailable, None),
            Error::NotFound => (ErrorKind::NotFound, None),
            Error::Validation { field, .. } => (ErrorKind::Validation, field),
            Error::Serialization(_) | Error::Io(_) => (ErrorKind::Internal, None),
        };
        Self {
            kind,
            message,
            field,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Drift test: the TS counterpart is `API_ERROR_KINDS` in
    /// `src/lib/api.ts`, asserted by "lists the error kinds" in
    /// `src/lib/api.test.ts`. Change both lists and both tests together.
    #[test]
    fn serialises_the_exact_kind_list() {
        let kinds = [
            ErrorKind::DatabaseUnavailable,
            ErrorKind::Database,
            ErrorKind::Validation,
            ErrorKind::NotFound,
            ErrorKind::Network,
            ErrorKind::RateLimited,
            ErrorKind::Upstream,
            ErrorKind::Cancelled,
            ErrorKind::Internal,
        ];
        let names: Vec<String> = kinds
            .iter()
            .map(|k| {
                serde_json::to_value(k)
                    .unwrap()
                    .as_str()
                    .unwrap()
                    .to_owned()
            })
            .collect();
        assert_eq!(
            names,
            [
                "databaseUnavailable",
                "database",
                "validation",
                "notFound",
                "network",
                "rateLimited",
                "upstream",
                "cancelled",
                "internal"
            ]
        );
    }

    fn json(error: tracker_core::Error) -> serde_json::Value {
        serde_json::to_value(CommandError::from(error)).unwrap()
    }

    #[test]
    fn maps_each_core_variant_to_its_kind() {
        use tracker_core::Error;
        assert_eq!(
            json(Error::Database(sqlx::Error::RowNotFound))["kind"],
            "database"
        );
        assert_eq!(
            json(Error::Migration(
                sqlx::migrate::MigrateError::VersionMissing(1)
            ))["kind"],
            "database"
        );
        assert_eq!(
            json(Error::NewerDatabase { db: 2, app: 1 })["kind"],
            "databaseUnavailable"
        );
        assert_eq!(json(Error::NotFound)["kind"], "notFound");
        let ser = serde_json::from_str::<u8>("x").unwrap_err();
        assert_eq!(json(Error::Serialization(ser))["kind"], "internal");
        let io = std::io::Error::other("disk full");
        assert_eq!(json(Error::Io(io))["kind"], "internal");
    }

    #[test]
    fn validation_carries_field_and_field_is_otherwise_absent() {
        use tracker_core::Error;
        let with = json(Error::Validation {
            message: "bad".into(),
            field: Some("handle".into()),
        });
        assert_eq!(with["kind"], "validation");
        assert_eq!(with["field"], "handle");
        let without = json(Error::Validation {
            message: "bad".into(),
            field: None,
        });
        assert!(without.get("field").is_none());
        assert!(json(Error::NotFound).get("field").is_none());
    }
}
