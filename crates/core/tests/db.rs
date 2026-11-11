use tracker_core::{health, open, open_in_memory};

#[tokio::test]
async fn health_reports_one_applied_migration() {
    let pool = open_in_memory().await.unwrap();

    let result = health(&pool).await.unwrap();

    assert_eq!(result.applied_migrations, 1);
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
    let dir = std::env::temp_dir().join(format!("kintsugi-test-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("reopen.db");
    let _ = std::fs::remove_file(&path);

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
    assert_eq!(result.applied_migrations, 1);
}
