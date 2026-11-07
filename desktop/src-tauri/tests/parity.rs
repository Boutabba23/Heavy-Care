// Contract-parity tests for the Electron -> Tauri port.
// Each test exercises the same code path the IPC commands use.
use heavy_care_desktop_lib::db;
use serde_json::{json, Value};
use std::path::PathBuf;

fn test_db(tag: &str) -> (PathBuf, db::Db) {
    let dir = std::env::temp_dir().join(format!("hc-test-{}-{}", std::process::id(), tag));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    (dir, db::init(dir.clone()).unwrap())
}

#[test]
fn insert_then_select_roundtrip() {
    let (_d, db) = test_db("roundtrip");
    let res = db::handle_query(
        &db,
        &json!({
            "action": "insert",
            "table": "machines",
            "payload": { "code": "M1", "designation": "Pelle", "marque": "CAT", "type": "330" }
        }),
    );
    assert!(res["error"].is_null(), "{:?}", res);
    let rows = res["data"].as_array().unwrap();
    assert_eq!(rows.len(), 1);
    assert!(!rows[0]["id"].as_str().unwrap_or("").is_empty());
    assert!(!rows[0]["created_at"].as_str().unwrap_or("").is_empty());
    assert_eq!(rows[0]["code"], "M1");

    let sel = db::handle_query(
        &db,
        &json!({ "action": "select", "table": "machines", "filters": [{ "col": "code", "op": "eq", "val": "M1" }] }),
    );
    assert_eq!(sel["data"].as_array().unwrap().len(), 1);
}

#[test]
fn json_columns_serialize_and_parse() {
    let (_d, db) = test_db("jsoncols");
    let res = db::handle_query(
        &db,
        &json!({
            "action": "insert",
            "table": "machines",
            "payload": { "code": "M2", "designation": "x", "marque": "y", "type": "z",
                         "assigned_filters": [{ "id": "f1", "name": "Atmos" }] }
        }),
    );
    assert!(res["error"].is_null(), "{:?}", res);
    let sel = db::handle_query(
        &db,
        &json!({ "action": "select", "table": "machines", "filters": [{ "col": "code", "op": "eq", "val": "M2" }] }),
    );
    let row = &sel["data"][0];
    assert!(
        row["assigned_filters"].is_array(),
        "assigned_filters should come back as array, got {:?}",
        row["assigned_filters"]
    );
    assert_eq!(row["assigned_filters"][0]["id"], "f1");
}

#[test]
fn update_delete_and_upsert() {
    let (_d, db) = test_db("crud");
    db::handle_query(
        &db,
        &json!({
            "action": "insert",
            "table": "oil_stocks",
            "payload": { "id": "oil-x", "type": "T", "current_level": 50, "total_barrels": 2, "alert_threshold": 10 }
        }),
    );

    let upd = db::handle_query(
        &db,
        &json!({
            "action": "update",
            "table": "oil_stocks",
            "payload": { "current_level": 45 },
            "filters": [{ "col": "id", "op": "eq", "val": "oil-x" }]
        }),
    );
    assert!(upd["error"].is_null(), "{:?}", upd);
    let row = db::query_one(&db, "oil_stocks", "id = ?", &[json!("oil-x")]).unwrap();
    assert_eq!(row["current_level"], 45);
    // updated_at must have been stamped
    assert!(!row["updated_at"].as_str().unwrap_or("").is_empty());

    let up = db::handle_query(
        &db,
        &json!({
            "action": "upsert",
            "table": "oil_stocks",
            "payload": { "id": "oil-x", "type": "T", "current_level": 60, "total_barrels": 2, "alert_threshold": 10 },
            "onConflict": ["id"]
        }),
    );
    assert!(up["error"].is_null(), "upsert failed: {:?}", up);
    let row = db::query_one(&db, "oil_stocks", "id = ?", &[json!("oil-x")]).unwrap();
    assert_eq!(row["current_level"], 60);

    let del = db::handle_query(
        &db,
        &json!({
            "action": "delete",
            "table": "oil_stocks",
            "filters": [{ "col": "id", "op": "eq", "val": "oil-x" }]
        }),
    );
    assert!(del["error"].is_null(), "{:?}", del);
    assert!(db::query_one(&db, "oil_stocks", "id = ?", &[json!("oil-x")]).is_none());
}

#[test]
fn mutations_enqueue_sync_journal() {
    let (_d, db) = test_db("journal");
    db::handle_query(
        &db,
        &json!({
            "action": "insert",
            "table": "machines",
            "payload": { "code": "M9", "designation": "d", "marque": "m", "type": "t" }
        }),
    );
    // local-only inserts (seeding) must NOT journal
    db::handle_query(
        &db,
        &json!({
            "action": "insert",
            "table": "_users",
            "payload": { "id": "u1", "email": "a@b.c", "password_hash": "x" }
        }),
    );
    assert_eq!(db::pending_count(&db), 1);
    let item = db::pending_queue(&db, "", &[]).remove(0);
    assert_eq!(item["table_name"], "machines");
    assert_eq!(item["op"], "insert");
    let payload: Value =
        serde_json::from_str(item["payload"].as_str().unwrap()).unwrap();
    assert_eq!(payload["code"], "M9");
}

#[test]
fn offline_account_auth_roundtrip() {
    let (_d, db) = test_db("auth");
    let user = db::create_user(&db, "tech@heavy.care", "secret123");
    assert_eq!(user["email"], "tech@heavy.care");

    assert!(db::verify_user(&db, "tech@heavy.care", "secret123").is_some());
    assert!(db::verify_user(&db, "TECH@heavy.care", "secret123").is_some()); // case-insensitive
    assert!(db::verify_user(&db, "tech@heavy.care", "wrong").is_none());

    db::update_password(&db, user["id"].as_str().unwrap(), "newpass");
    assert!(db::verify_user(&db, "tech@heavy.care", "newpass").is_some());
    assert!(db::verify_user(&db, "tech@heavy.care", "secret123").is_none());
}

#[test]
fn select_single_returns_null_when_missing() {
    let (_d, db) = test_db("single");
    let res = db::handle_query(
        &db,
        &json!({ "action": "select", "table": "machines", "single": true, "filters": [{ "col": "code", "op": "eq", "val": "NOPE" }] }),
    );
    assert!(res["data"].is_null());
}
