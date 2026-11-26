use tracker_core::{Error, health, migration_count, open, open_in_memory};

fn unique_dir(name: &str) -> std::io::Result<std::path::PathBuf> {
    let dir = std::env::temp_dir().join(format!("kintsugi-test-{}-{name}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

#[tokio::test]
async fn health_reports_every_embedded_migration_applied() {
    let pool = open_in_memory().await.unwrap();

    let result = health(&pool).await.unwrap();

    assert_eq!(result.applied_migrations, migration_count());
}

#[tokio::test]
async fn activity_log_row_round_trips() {
    let pool = open_in_memory().await.unwrap();

    let id: i64 =
        sqlx::query_scalar("INSERT INTO activity_log (kind, payload) VALUES (?, ?) RETURNING id")
            .bind("app.opened")
            .bind(r#"{"source":"test"}"#)
            .fetch_one(&pool)
            .await
            .unwrap();

    let (kind, payload, created_at): (String, String, String) =
        sqlx::query_as("SELECT kind, payload, created_at FROM activity_log WHERE id = ?")
            .bind(id)
            .fetch_one(&pool)
            .await
            .unwrap();

    assert_eq!(kind, "app.opened");
    assert_eq!(payload, r#"{"source":"test"}"#);
    assert!(
        created_at.ends_with('Z'),
        "created_at should be UTC: {created_at}"
    );
}

#[tokio::test]
async fn reopening_a_file_does_not_rerun_migrations() {
    let dir = unique_dir("reopen").unwrap();
    let path = dir.join("reopen.db");

    let first = open(&path).await.unwrap();
    sqlx::query("INSERT INTO activity_log (kind, payload) VALUES ('kept', '{}')")
        .execute(&first)
        .await
        .unwrap();
    first.close().await;

    let second = open(&path).await.unwrap();
    let rows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM activity_log")
        .fetch_one(&second)
        .await
        .unwrap();
    let result = health(&second).await.unwrap();
    second.close().await;
    let _ = std::fs::remove_dir_all(&dir);

    assert_eq!(rows, 1);
    assert_eq!(result.applied_migrations, migration_count());
}

#[test]
fn migration_count_matches_the_migration_files() {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
    let files = std::fs::read_dir(dir)
        .unwrap()
        .filter(|e| {
            e.as_ref()
                .unwrap()
                .path()
                .extension()
                .is_some_and(|x| x == "sql")
        })
        .count();

    assert!(migration_count() >= 1);
    assert_eq!(migration_count(), files as i64);
}

#[tokio::test]
async fn file_database_sets_wal_and_pragmas() {
    let dir = unique_dir("pragmas").unwrap();
    let pool = open(&dir.join("p.db")).await.unwrap();

    let mode: String = sqlx::query_scalar("PRAGMA journal_mode")
        .fetch_one(&pool)
        .await
        .unwrap();
    let sync: i64 = sqlx::query_scalar("PRAGMA synchronous")
        .fetch_one(&pool)
        .await
        .unwrap();
    let fk: i64 = sqlx::query_scalar("PRAGMA foreign_keys")
        .fetch_one(&pool)
        .await
        .unwrap();
    let busy: i64 = sqlx::query_scalar("PRAGMA busy_timeout")
        .fetch_one(&pool)
        .await
        .unwrap();
    pool.close().await;
    let _ = std::fs::remove_dir_all(&dir);

    assert_eq!(mode, "wal");
    assert_eq!(sync, 1, "NORMAL");
    assert_eq!(fk, 1);
    assert_eq!(busy, 5000);
}

#[tokio::test]
async fn newer_database_is_refused_without_writing() {
    let dir = unique_dir("newer").unwrap();
    let path = dir.join("n.db");
    let pool = open(&path).await.unwrap();
    sqlx::query("INSERT INTO activity_log (kind, payload) VALUES ('kept', '{}')")
        .execute(&pool)
        .await
        .unwrap();
    let future = 99_990_101_000_000_i64;
    sqlx::query(
        "INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) \
         VALUES (?, 'future', 1, x'00', 0)",
    )
    .bind(future)
    .execute(&pool)
    .await
    .unwrap();
    // Fold the WAL into the main file so the bytes can be compared.
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;
    let before = std::fs::read(&path).unwrap();

    let err = open(&path).await.unwrap_err();

    let after = std::fs::read(&path).unwrap();
    let _ = std::fs::remove_dir_all(&dir);
    match &err {
        Error::NewerDatabase { db, app } => {
            assert_eq!(*db, future);
            assert!(*app < future);
        }
        other => panic!("expected NewerDatabase, got {other:?}"),
    }
    let message = err.to_string();
    assert!(message.contains("newer Kintsugi"), "{message}");
    assert!(message.contains(&future.to_string()), "{message}");
    assert_eq!(before, after, "file must be untouched");
}
