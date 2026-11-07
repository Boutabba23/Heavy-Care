// Local SQLite database via rusqlite (native). Port of electron/database.js
// with byte-compatible behavior: same schema, same JSON-columns contract,
// same on-the-fly column creation, same sync-queue journaling.
use rusqlite::{params_from_iter, Connection, Result as SqlResult};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;


pub const DB_NAME: &str = "heavycare.db";

// Columns that hold JSON (arrays / objects) per table — serialized as TEXT
pub const JSON_COLUMNS: &[(&str, &[&str])] = &[
    ("machines", &["assigned_filters"]),
    ("filter_groups", &["references"]),
    ("maintenance_records", &["filters_used", "oils_used"]),
    (
        "machine_monthly_stats",
        &["breakdown_days", "breakdown_hours", "idle_days", "idle_hours"],
    ),
    ("global_monthly_settings", &["intemperie_days"]),
];

pub const SYNCED_TABLES: &[&str] = &[
    "machines",
    "filter_types",
    "filter_groups",
    "maintenance_records",
    "monthly_daily_adjustments",
    "oil_stocks",
    "machine_monthly_stats",
    "global_monthly_settings",
    "spare_parts",
    "spare_part_installations",
];

const DEFAULT_OIL_STOCKS: &[(&str, &str, f64, f64, f64)] = &[
    ("oil-1", "15W40 Moteur", 120.0, 3.0, 20.0),
    ("oil-2", "Hydraulique 46", 15.0, 1.0, 30.0),
    ("oil-3", "Transmission 80W90", 180.0, 2.0, 20.0),
    ("oil-4", "Liquide de Refroidissement", 200.0, 4.0, 20.0),
];

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  designation TEXT NOT NULL,
  marque TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT,
  registration_number TEXT,
  service_hours REAL DEFAULT 0,
  assigned_filters TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS filter_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS filter_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filter_type TEXT,
  original_reference_id TEXT,
  \"references\" TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  machine_id TEXT,
  date TEXT NOT NULL,
  service_hours REAL DEFAULT 0,
  maintenance_range TEXT NOT NULL,
  filters_used TEXT,
  oils_used TEXT,
  downtime_hours REAL DEFAULT 0,
  panne_hours REAL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS monthly_daily_adjustments (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  date TEXT NOT NULL,
  downtime_hours REAL DEFAULT 0,
  panne_hours REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS oil_stocks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  current_level REAL DEFAULT 0,
  total_barrels REAL DEFAULT 0,
  alert_threshold REAL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS machine_monthly_stats (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  month TEXT NOT NULL,
  start_hours REAL DEFAULT 0,
  end_hours REAL DEFAULT 0,
  works_on_weekends INTEGER DEFAULT 0,
  breakdown_days TEXT,
  breakdown_hours TEXT,
  idle_days TEXT,
  idle_hours TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS global_monthly_settings (
  id TEXT PRIMARY KEY,
  month TEXT UNIQUE NOT NULL,
  intemperie_days TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS spare_parts (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  designation TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  unit_price REAL DEFAULT 0,
  stock_quantity REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  location TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS spare_part_installations (
  id TEXT PRIMARY KEY,
  spare_part_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  installation_date TEXT NOT NULL,
  service_hours_at_install REAL,
  installed_by TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS _sync_queue (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  op TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS _users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_status ON _sync_queue(status);
";

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

// SQLite reserves some identifiers (e.g. `references`); always quote columns
pub fn q(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
pub struct Db {
    pub conn: Mutex<Connection>,
    pub db_dir: PathBuf,
    pub columns_cache: Mutex<HashMap<String, Vec<String>>>,
}

pub fn init(db_dir: PathBuf) -> SqlResult<Db> {
    std::fs::create_dir_all(&db_dir).ok();
    let path = db_dir.join(DB_NAME);
    let conn = Connection::open(&path)?;
    conn.execute_batch(SCHEMA)?;

    let db = Db {
        conn: Mutex::new(conn),
        db_dir,
        columns_cache: Mutex::new(HashMap::new()),
    };

    // Seed default oil stocks on first launch (mirrors the web app defaults)
    let seed_marker = db.db_dir.join(".seeded");
    if !seed_marker.exists() {
        if count_rows(&db, "oil_stocks") == 0 {
            for (id, type_, current_level, total_barrels, alert_threshold) in DEFAULT_OIL_STOCKS {
                let _ = insert_row(
                    &db,
                    "oil_stocks",
                    &json!({
                        "id": id,
                        "type": type_,
                        "current_level": current_level,
                        "total_barrels": total_barrels,
                        "alert_threshold": alert_threshold
                    }),
                    false,
                );
            }
        }
        std::fs::write(&seed_marker, format!("seeded {}", now_iso())).ok();
    }
    Ok(db)
}

// ---------------------------------------------------------------------------
// Column introspection — remote schemas evolve, add unknown columns on the fly
// ---------------------------------------------------------------------------
fn get_columns(db: &Db, table: &str) -> Vec<String> {
    if let Some(cols) = db.columns_cache.lock().unwrap().get(table) {
        return cols.clone();
    }
    let cols: Vec<String> = {
        let conn = db.conn.lock().unwrap();
        let mut cols = Vec::new();
        if let Ok(mut stmt) = conn.prepare(&format!("PRAGMA table_info({})", q(table))) {
            if let Ok(rows) = stmt.query_map([], |r| r.get::<_, String>(1)) {
                for name in rows.flatten() {
                    cols.push(name);
                }
            }
        }
        cols
    };
    db.columns_cache
        .lock()
        .unwrap()
        .insert(table.to_string(), cols.clone());
    cols
}

fn ensure_columns(db: &Db, table: &str, row: &Map<String, Value>) {
    let existing: HashSet<String> = get_columns(db, table).into_iter().collect();
    let missing: Vec<&String> = row
        .keys()
        .filter(|k| !existing.contains(*k))
        .collect();
    if missing.is_empty() {
        return;
    }
    {
        let conn = db.conn.lock().unwrap();
        for col in missing {
            if conn
                .execute(&format!("ALTER TABLE {} ADD COLUMN {} TEXT", q(table), q(col)), [])
                .is_ok()
            {
                println!("Added local column {}.{}", table, col);
            }
        }
    }
    db.columns_cache.lock().unwrap().remove(table);
}

// ---------------------------------------------------------------------------
// Row serialization / deserialization
// ---------------------------------------------------------------------------
fn json_cols_for(table: &str) -> Vec<&'static str> {
    JSON_COLUMNS
        .iter()
        .find(|(t, _)| *t == table)
        .map(|(_, cols)| cols.to_vec())
        .unwrap_or_default()
}

// Serialized values in their JSON shape (strings for JSON/object columns,
// numbers for bools) exactly like the sql.js layer produced.
fn serialize_row(db: &Db, table: &str, row: &Map<String, Value>) -> Vec<(String, Value)> {
    let cols = get_columns(db, table);
    let json_cols = json_cols_for(table);
    row.iter()
        .filter(|(k, _)| cols.is_empty() || cols.contains(k))
        .filter(|(_, v)| !v.is_null())
        .filter_map(|(k, v)| {
            let out = if json_cols.contains(&k.as_str()) {
                Some(Value::String(serde_json::to_string(&json!(v)).unwrap()))
            } else {
                Some(v.clone())
            };
            out.map(|o| (k.clone(), o))
        })
        .collect()
}

// JSON value -> rusqlite parameter handling is done via ToSql with a wrapper:
// strings stay TEXT, numbers become INTEGER when they are integral,
// booleans become 0/1 (mirrors the JS layer serializing booleans to 1/0).
fn value_to_sql(v: &Value) -> Option<rusqlite::types::Value> {
    use rusqlite::types::Value as SV;
    match v {
        Value::Null => None,
        Value::Bool(b) => Some(SV::Integer(if *b { 1 } else { 0 })),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Some(SV::Integer(i))
            } else {
                Some(SV::Real(n.as_f64().unwrap_or(0.0)))
            }
        }
        Value::String(s) => Some(SV::Text(s.clone())),
        other => Some(SV::Text(other.to_string())),
    }
}

fn sql_to_value(v: rusqlite::types::Value, json_cols: &[&str], col: &str) -> Value {
    use rusqlite::types::Value as SV;
    match v {
        SV::Null => Value::Null,
        SV::Integer(i) => {
            if col.starts_with("works_on") {
                Value::Bool(i != 0)
            } else {
                json!(i)
            }
        }
        SV::Real(f) => json!(f),
        SV::Text(t) => {
            if json_cols.contains(&col) {
                serde_json::from_str(&t).unwrap_or(json!(t))
            } else {
                json!(t)
            }
        }
        SV::Blob(b) => {
            let t = String::from_utf8_lossy(&b).to_string();
            if json_cols.contains(&col) {
                serde_json::from_str(&t).unwrap_or(json!(t))
            } else {
                json!(t)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Query engine
// ---------------------------------------------------------------------------
pub fn query_all(db: &Db, table: &str, where_clause: &str, params: &[Value]) -> Vec<Value> {
    let sql = if where_clause.is_empty() {
        format!("SELECT * FROM {}", q(table))
    } else {
        format!("SELECT * FROM {} WHERE {}", q(table), where_clause)
    };
    let json_cols = json_cols_for(table);
    let conn = db.conn.lock().unwrap();
    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("query_all failed ({}): {}", table, e);
            return Vec::new();
        }
    };
    let headers: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();
    let mut rows = Vec::new();
    if let Ok(mut rs) = stmt.query(params_from_iter(
        params.iter().map(value_to_sql_scalar),
    )) {
        while let Ok(Some(row)) = rs.next() {
            let mut obj = Map::new();
            for (i, col) in headers.iter().enumerate() {
                let sv: rusqlite::types::Value = match row.get(i) {
                    Ok(v) => v,
                    Err(_) => rusqlite::types::Value::Null,
                };
                obj.insert(col.clone(), sql_to_value(sv, &json_cols, col));
            }
            rows.push(Value::Object(obj));
        }
    }
    drop(stmt);
    rows
}

pub fn query_one(db: &Db, table: &str, where_clause: &str, params: &[Value]) -> Option<Value> {
    query_all(db, table, where_clause, params).into_iter().next()
}

pub fn count_rows(db: &Db, table: &str) -> i64 {
    let conn = db.conn.lock().unwrap();
    conn.query_row(&format!("SELECT COUNT(*) FROM {}", q(table)), [], |r| {
        r.get(0)
    })
    .unwrap_or(0)
}

// Filters: [{ col, op: "eq", val }] — same shape the renderer sends
pub struct Where {
    pub clause: String,
    pub params: Vec<Value>,
}

pub fn build_where(filters: Option<Value>) -> Where {
    let mut out = Where {
        clause: String::new(),
        params: Vec::new(),
    };
    if let Some(Value::Array(list)) = filters {
        for f in list {
            if f.get("op").and_then(|o| o.as_str()) == Some("eq") {
                if !out.clause.is_empty() {
                    out.clause.push_str(" AND ");
                }
                let col = f.get("col").and_then(|c| c.as_str()).unwrap_or_default();
                out.clause.push_str(&format!("{} = ?", q(col)));
                out.params.push(
                    f.get("val")
                        .cloned()
                        .unwrap_or(Value::Null),
                );
            }
        }
    }
    out
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
pub fn insert_row(db: &Db, table: &str, row: &Value, sync: bool) -> Option<Value> {
    let mut map = match row {
        Value::Object(m) => m.clone(),
        _ => Map::new(),
    };
    if map.get("id").map(|v| v.is_null()).unwrap_or(true) {
        map.insert("id".into(), json!(uuid()));
    }
    let created_at = map
        .get("created_at")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(now_iso);
    if map.get("created_at").is_none() {
        map.insert("created_at".into(), json!(created_at));
    }
    if map.get("updated_at").is_none() {
        map.insert(
            "updated_at".into(),
            json!(
                map.get("updated_at")
                    .and_then(|v| v.as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| created_at.clone())
            ),
        );
    }
    ensure_columns(db, table, &map);
    let s = serialize_row(db, table, &map);
    if s.is_empty() {
        return Some(Value::Object(map));
    }
    let cols: Vec<String> = s.iter().map(|(k, _)| k.clone()).collect();
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        q(table),
        cols.iter().map(|c| q(c)).collect::<Vec<_>>().join(", "),
        cols.iter().map(|_| "?").collect::<Vec<_>>().join(", ")
    );
    {
        let conn = db.conn.lock().unwrap();
        let res = conn.execute(
            &sql,
            params_from_iter(
                s.iter()
                    .map(|(_, v)| value_to_sql(v).unwrap_or(rusqlite::types::Value::Null)),
            ),
        );
        if let Err(e) = res {
            eprintln!("insert_row failed ({}): {}", table, e);
            return None;
        }
    }
    if sync {
        enqueue_sync(
            db,
            table,
            map["id"].as_str().unwrap_or_default(),
            "insert",
            Some(&Value::Object(map.clone())),
        );
    }
    Some(Value::Object(map))
}

pub fn update_row(db: &Db, table: &str, payload: &Value, filters: Option<Value>, queue: bool) -> Result<Option<Value>, String> {
    let w = build_where(filters);
    let existing = query_all(db, table, &w.clause, &w.params);
    if existing.is_empty() {
        return Err("No rows found to update".into());
    }
    let mut map = match payload {
        Value::Object(m) => m.clone(),
        _ => Map::new(),
    };
    if map.get("updated_at").is_none() {
        map.insert("updated_at".into(), json!(now_iso()));
    }
    ensure_columns(db, table, &map);
    let s = serialize_row(db, table, &map);
    let set_cols: Vec<String> = s
        .iter()
        .filter(|(k, _)| k != "id" && k != "created_at")
        .map(|(k, _)| format!("{} = ?", q(k)))
        .collect();
    if !set_cols.is_empty() {
        let sql = format!("UPDATE {} SET {} WHERE {}", q(table), set_cols.join(", "), w.clause);
        let mut bind: Vec<rusqlite::types::Value> = s
            .iter()
            .filter(|(k, _)| k != "id" && k != "created_at")
            .map(|(_, v)| v)
            .chain(w.params.iter())
            .map(value_to_sql_scalar)
            .collect();
        {
            let conn = db.conn.lock().unwrap();
            if let Err(e) = conn.execute(&sql, params_from_iter(bind.drain(..))) {
                eprintln!("update_row failed ({}): {}", table, e);
                return Err(e.to_string());
            }
        }
    }
    if queue {
        for row in existing {
            let mut merged = row.as_object().cloned().unwrap_or_default();
            if let Some(p) = payload.as_object() {
                merged.extend(p.clone());
            }
            enqueue_sync(db, table, row["id"].as_str().unwrap_or_default(), "update", Some(&Value::Object(merged)));
        }
    }
    Ok(None)
}

pub fn delete_row(db: &Db, table: &str, filters: Option<Value>, queue: bool) -> Result<(), String> {
    let w = build_where(filters);
    if w.clause.is_empty() {
        return Err("Delete requires a filter".into());
    }
    let existing = query_all(db, table, &w.clause, &w.params);
    let sql = format!("DELETE FROM {} WHERE {}", q(table), w.clause);
    {
        let conn = db.conn.lock().unwrap();
        if let Err(e) = conn.execute(&sql, params_from_iter(w.params.iter().map(value_to_sql_scalar))) {
            eprintln!("delete_row failed ({}): {}", table, e);
            return Err(e.to_string());
        }
    }
    if queue {
        for row in existing {
            enqueue_sync(db, table, row["id"].as_str().unwrap_or_default(), "delete", None);
        }
    }
    Ok(())
}

pub fn upsert_row(db: &Db, table: &str, row: &Value, on_conflict: &[Value], sync: bool) {
    let conflict_cols: Vec<String> = if on_conflict.is_empty() {
        vec!["id".to_string()]
    } else {
        on_conflict
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect()
    };
    let conflict_filters: Vec<Value> = conflict_cols
        .iter()
        .map(|c| json!({ "col": c, "op": "eq", "val": row.get(c).cloned().unwrap_or(Value::Null) }))
        .collect();
    let w = build_where(Some(Value::Array(conflict_filters.clone())));
    let existing = query_one(db, table, &w.clause, &w.params);

    let mut with_stamps = match row {
        Value::Object(m) => m.clone(),
        _ => Map::new(),
    };
    if with_stamps.get("id").map(|v| v.is_null()).unwrap_or(false) || (existing.is_none() && !with_stamps.contains_key("id")) {
        with_stamps.insert("id".into(), json!(uuid()));
    }
    if with_stamps.get("updated_at").map(|v| v.is_null()).unwrap_or(true) {
        with_stamps.insert("updated_at".into(), json!(now_iso()));
    }
    match existing {
        Some(ex) => {
            if with_stamps.get("created_at").is_none() {
                if let Some(c) = ex.get("created_at") {
                    with_stamps.insert("created_at".into(), c.clone());
                }
            }
            let _ = update_row(db, table, &Value::Object(with_stamps), Some(Value::Array(conflict_filters)), sync);
        }
        None => {
            if with_stamps.get("created_at").is_none() {
                with_stamps.insert("created_at".into(), json!(now_iso()));
            }
            insert_row(db, table, &Value::Object(with_stamps), sync);
        }
    }
}

// ---------------------------------------------------------------------------
// Query dispatch — mirrors the supabase-js shape the renderer sends over IPC
// ---------------------------------------------------------------------------
pub fn handle_query(db: &Db, req: &Value) -> Value {
    let action = req["action"].as_str().unwrap_or_default().to_string();
    let table = req["table"].as_str().unwrap_or_default().to_string();
    match action.as_str() {
        "select" => {
            let w = build_where(req.get("filters").cloned());
            let mut rows = query_all(db, &table, &w.clause, &w.params);
            if req.get("single").and_then(|s| s.as_bool()).unwrap_or(false) {
                let rows = if rows.is_empty() { Value::Null } else { rows.remove(0) };
                return json!({ "data": rows, "error": Value::Null });
            }
            json!({ "data": rows, "error": Value::Null })
        }
        "insert" => {
            let payload = req.get("payload").cloned().unwrap_or(Value::Null);
            let items: Vec<Value> = match payload {
                Value::Array(a) => a,
                other => vec![other],
            };
            let inserted: Vec<Value> = items
                .iter()
                .filter_map(|r| insert_row(db, &table, r, true))
                .collect();
            json!({ "data": inserted, "error": Value::Null })
        }
        "update" => {
            let res = update_row(db, &table, req.get("payload").unwrap_or(&Value::Null), req.get("filters").cloned(), true);
            match res {
                Ok(_) => json!({ "data": Value::Null, "error": Value::Null }),
                Err(msg) => json!({ "data": Value::Null, "error": { "message": msg } }),
            }
        }
        "delete" => {
            let res = delete_row(db, &table, req.get("filters").cloned(), true);
            match res {
                Ok(_) => json!({ "data": Value::Null, "error": Value::Null }),
                Err(msg) => json!({ "data": Value::Null, "error": { "message": msg } }),
            }
        }
        "upsert" => {
            let payload = req.get("payload").cloned().unwrap_or(Value::Null);
            let on_conflict = req
                .get("onConflict")
                .cloned()
                .unwrap_or(Value::Null);
            let conflict_list: Vec<Value> = match on_conflict {
                Value::Array(a) => a,
                Value::String(s) => s.split(',').map(|c| json!(c.trim())).collect(),
                _ => Vec::new(),
            };
            let items: Vec<Value> = match payload {
                Value::Array(a) => a,
                other => vec![other],
            };
            for r in items {
                upsert_row(db, &table, &r, &conflict_list, true);
            }
            json!({ "data": Value::Null, "error": Value::Null })
        }
        other => json!({ "data": Value::Null, "error": { "message": format!("Unknown action: {}", other) } }),
    }
}

// ---------------------------------------------------------------------------
// Sync queue journal
// ---------------------------------------------------------------------------
pub fn enqueue_sync(db: &Db, table: &str, row_id: &str, op: &str, payload: Option<&Value>) {
    if !SYNCED_TABLES.contains(&table) {
        return;
    }
    let conn = db.conn.lock().unwrap();
    let _ = conn.execute(
        "INSERT INTO _sync_queue (table_name, row_id, op, payload, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
        rusqlite::params![
            table,
            row_id,
            op,
            payload.map(|p| p.to_string()),
            now_iso()
        ],
    );
}

pub fn pending_queue(db: &Db, extra_where: &str, bind: &[Value]) -> Vec<Value> {
    let where_all = if extra_where.is_empty() {
        "status = 'pending'".to_string()
    } else {
        format!("status = 'pending' AND {}", extra_where)
    };
    query_all(db, "_sync_queue", &where_all, bind)
}

pub fn mark_synced(db: &Db, seq: i64) {
    let conn = db.conn.lock().unwrap();
    let _ = conn.execute("UPDATE _sync_queue SET status = 'synced' WHERE seq = ?", [seq]);
}

pub fn pending_count(db: &Db) -> i64 {
    count_rows_filtered(db, "_sync_queue", "status = 'pending'")
}

pub fn count_rows_filtered(db: &Db, table: &str, where_clause: &str) -> i64 {
    let conn = db.conn.lock().unwrap();
    conn.query_row(
        &format!("SELECT COUNT(*) FROM {} WHERE {}", q(table), where_clause),
        [],
        |r| r.get(0),
    )
    .unwrap_or(0)
}

// ---------------------------------------------------------------------------
// Local auth (offline accounts stored in SQLite)
// ---------------------------------------------------------------------------
use scrypt::{scrypt as scrypt_kdf, Params};

fn hash_password(password: &str, salt: &str) -> String {
    // mirrors node crypto.scryptSync(password, salt, 64)
    let params = Params::new(15, 8, 1, 64).unwrap();
    let mut out = [0u8; 64];
    scrypt_kdf(password.as_bytes(), salt.as_bytes(), &params, &mut out).ok();
    hex::encode(out)
}

pub fn create_user(db: &Db, email: &str, password: &str) -> Value {
    let salt: String = {
        use rand::RngCore;
        let mut buf = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut buf);
        hex::encode(buf)
    };
    let id = uuid();
    let conn = db.conn.lock().unwrap();
    let _ = conn.execute(
        "INSERT INTO _users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        rusqlite::params![id, email.to_lowercase(), format!("{}:{}", hash_password(password, &salt), salt), now_iso()],
    );
    json!({ "id": id, "email": email.to_lowercase() })
}

pub fn verify_user(db: &Db, email: &str, password: &str) -> Option<Value> {
    let row = query_one(
        db,
        "_users",
        "email = ?",
        &[json!(email.to_lowercase())],
    )?;
    let stored = row["password_hash"].as_str().unwrap_or_default().to_string();
    let (hash, salt) = match stored.split_once(':') {
        Some(v) => v,
        None => return None,
    };
    if hash_password(password, salt) == hash {
        Some(json!({ "id": row["id"], "email": row["email"] }))
    } else {
        None
    }
}

pub fn update_password(db: &Db, user_id: &str, new_password: &str) {
    let salt: String = {
        use rand::RngCore;
        let mut buf = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut buf);
        hex::encode(buf)
    };
    let conn = db.conn.lock().unwrap();
    let _ = conn.execute(
        "UPDATE _users SET password_hash = ? WHERE id = ?",
        rusqlite::params![format!("{}:{}", hash_password(new_password, &salt), salt), user_id],
    );
}

// helper used in update/delete binds
fn value_to_sql_scalar(v: &Value) -> rusqlite::types::Value {
    value_to_sql(v).unwrap_or(rusqlite::types::Value::Null)
}
