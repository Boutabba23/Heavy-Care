// Sync engine port: pushes local journaled changes to Supabase and pulls
// remote changes, last-write-wins by updated_at. Mirrors electron/sync.js.
use crate::db;
use crate::state::{SyncConf, TokenState};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

pub struct Sync {
    pub conf: Mutex<Option<SyncConf>>,
    pub token: Mutex<TokenState>,
    pub last_sync_path: Mutex<Option<PathBuf>>,
    pub syncing: AtomicBool,
    pub dirty: AtomicBool,
    // Cached profiles row of the signed-in user (role / pole_id). Refreshed
    // each sync cycle; drives pole injection on pushed rows (RLS demands a
    // valid pole_id on every new business row).
    pub profile: Mutex<Option<Value>>,
}

// Zero-config default — same public Supabase project as the web app.
// Each user syncs with their OWN authenticated session (auth.rs token).
pub const BUILTIN_URL: &str = "https://yklkxvvoeovksyslcfjy.supabase.co";
pub const BUILTIN_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbGt4dnZvZW92a3N5c2xjZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjAyMjcsImV4cCI6MjA2OTQ5NjIyN30.j7Whr8rPAtSwNbSyZ2iTTFEQAGsDI51022l4ZfsIlmo";

impl Sync {
    pub fn new() -> Self {
        Sync {
            conf: Mutex::new(None),
            token: Mutex::new(TokenState::default()),
            last_sync_path: Mutex::new(None),
            syncing: AtomicBool::new(false),
            dirty: AtomicBool::new(true),
            profile: Mutex::new(None),
        }
    }

    pub fn load_config(&self, app_data_dir: &PathBuf) {
        // Precedence: 1) supabase-config.json in userData (per-install override),
        // then env vars, then the built-in zero-config defaults.
        let candidates: Vec<PathBuf> = vec![
            app_data_dir.join("supabase-config.json"),
            std::env::current_dir()
                .unwrap_or_default()
                .join("supabase-config.json"),
        ];
        for file in candidates {
            if !file.exists() {
                continue;
            }
            if let Ok(raw) = std::fs::read_to_string(&file) {
                if let Ok(parsed) = serde_json::from_str::<Value>(raw.trim_start_matches('\u{FEFF}')) {
                    let url = parsed["url"].as_str().map(|s| s.trim_end_matches('/').to_string());
                    let key = parsed["anonKey"].as_str().map(|s| s.to_string());
                    if let (Some(url), Some(anon_key)) = (url, key) {
                        *self.conf.lock().unwrap() = Some(SyncConf {
                            url,
                            anon_key,
                            email: parsed["email"].as_str().map(|s| s.to_string()),
                            password: parsed["password"].as_str().map(|s| s.to_string()),
                        });
                        return;
                    }
                }
            }
        }
        let env_url = std::env::var("NEXT_PUBLIC_SUPABASE_URL")
            .or_else(|_| std::env::var("SUPABASE_URL"))
            .ok()
            .filter(|u| !u.contains("placeholder"));
        let env_key = std::env::var("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            .or_else(|_| std::env::var("SUPABASE_ANON_KEY"))
            .ok();
        if let (Some(url), Some(key)) = (env_url, env_key) {
            *self.conf.lock().unwrap() = Some(SyncConf {
                url: url.trim_end_matches('/').to_string(),
                anon_key: key,
                email: std::env::var("SUPABASE_SYNC_EMAIL").ok(),
                password: std::env::var("SUPABASE_SYNC_PASSWORD").ok(),
            });
            return;
        }
        *self.conf.lock().unwrap() = Some(SyncConf {
            url: BUILTIN_URL.to_string(),
            anon_key: BUILTIN_ANON_KEY.to_string(),
            email: std::env::var("SUPABASE_SYNC_EMAIL").ok(),
            password: std::env::var("SUPABASE_SYNC_PASSWORD").ok(),
        });
    }

    pub fn set_last_sync_path(&self, p: PathBuf) {
        *self.last_sync_path.lock().unwrap() = Some(p);
    }

    pub fn get_supplier_url_key(&self) -> (String, String) {
        let guard = self.conf.lock().unwrap();
        match guard.as_ref() {
            Some(c) => (c.url.clone(), c.anon_key.clone()),
            None => (String::new(), String::new()),
        }
    }

    pub fn is_configured(&self) -> bool {
        self.conf.lock().unwrap().is_some()
    }

    pub fn last_sync(&self) -> Option<String> {
        let p = self.last_sync_path.lock().unwrap().clone()?;
        let raw = std::fs::read_to_string(p).ok()?;
        let v: Value = serde_json::from_str(&raw).ok()?;
        let ts = v["lastSync"].as_str()?.to_string();
        Some(ts)
    }

    fn set_last_sync(&self, iso: String) {
        if let Some(p) = self.last_sync_path.lock().unwrap().clone() {
            std::fs::write(p, serde_json::to_string(&json!({ "lastSync": iso })).unwrap()).ok();
        }
    }
}

async fn ensure_token(sync: &Sync, auth: &crate::auth::Auth) -> Option<String> {
    if !sync.is_configured() {
        return None;
    }
    {
        let t = sync.token.lock().unwrap();
        if let (Some(tok), exp) = (&t.access_token, t.expiry_ms) {
            if chrono::Utc::now().timestamp_millis() < exp {
                return Some(tok.clone());
            }
        }
    }
    // 1) The app's own Supabase session (user signed in via Google or password)
    if let Some(tok) = crate::auth::get_valid_token(auth).await {
        let mut t = sync.token.lock().unwrap();
        t.access_token = Some(tok.clone());
        t.expiry_ms = chrono::Utc::now().timestamp_millis() + 5 * 60 * 1000;
        return Some(tok);
    }
    // 2) Config file email/password fallback
    let conf = {
        let c = sync.conf.lock().unwrap();
        c.clone().unwrap_or_else(|| SyncConf {
            url: BUILTIN_URL.into(),
            anon_key: BUILTIN_ANON_KEY.into(),
            email: None,
            password: None,
        })
    };
    let (email, password) = match (&conf.email, &conf.password) {
        (Some(e), Some(p)) => (e.clone(), p.clone()),
        _ => return None,
    };
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/auth/v1/token?grant_type=password", conf.url))
        .header("apikey", &conf.anon_key)
        .json(&json!({ "email": email, "password": password }))
        .send()
        .await
        .ok()?;
    if !res.status().is_success() {
        eprintln!("Supabase sign-in failed: {}", res.status());
        return None;
    }
    let data: Value = res.json().await.ok()?;
    let tok = data["access_token"].as_str()?.to_string();
    let expires_in = data["expires_in"].as_i64().unwrap_or(3600);
    {
        let mut t = sync.token.lock().unwrap();
        t.access_token = Some(tok.clone());
        t.expiry_ms = chrono::Utc::now().timestamp_millis() + (expires_in - 120) * 1000;
    }
    Some(tok)
}

impl Sync {
    /// Fetch (or refresh) the signed-in user's profiles row (role + pole_id).
    /// Uses the app session token via rest(); a transient failure keeps the
    /// previous cache. Only meaningful for session-authenticated syncing.
    pub async fn refresh_profile(&self, auth: &crate::auth::Auth) {
        let uid = crate::auth::build_public_shape(auth)
            .and_then(|s| s["user"]["id"].as_str().map(|s| s.to_string()));
        let uid = match uid {
            Some(u) => u,
            None => {
                // Not a session-authenticated context (local/config sync user)
                *self.profile.lock().unwrap() = None;
                return;
            }
        };
        match self
            .rest(
                auth,
                "GET",
                "profiles",
                &format!("?id=eq.{}&select=role,pole_id", uid),
                None,
                None,
            )
            .await
        {
            Ok(v) => {
                let row = v.as_array().and_then(|a| a.first().cloned());
                *self.profile.lock().unwrap() = row;
            }
            Err(e) => eprintln!("Profile fetch failed (keeping cache): {}", e),
        }
    }

    pub fn profile_pole_id(&self) -> Option<String> {
        self.profile
            .lock()
            .unwrap()
            .as_ref()
            .and_then(|p| p["pole_id"].as_str().map(|s| s.to_string()))
    }
}

impl Sync {
    pub async fn rest(
        &self,
        auth: &crate::auth::Auth,
        method: &str,
        table: &str,
        query: &str,
        body: Option<Value>,
        prefer: Option<String>,
    ) -> Result<Value, String> {
        let (url, anon_key) = self.get_supplier_url_key();
        let token = ensure_token(self, auth).await;
        let auth_header = match &token {
            Some(t) => format!("Bearer {}", t),
            None => format!("Bearer {}", anon_key),
        };
        let client = reqwest::Client::new();
        let send = |client: &reqwest::Client, auth: String| {
            let mut req = client
                .request(
                    reqwest::Method::from_bytes(method.as_bytes())
                        .unwrap_or(reqwest::Method::GET),
                    format!("{}/rest/v1/{}{}", url, table, query),
                )
                .header("apikey", &anon_key)
                .header("Authorization", auth)
                .header("Content-Type", "application/json");
            if let Some(p) = &prefer {
                req = req.header("Prefer", p.clone());
            }
            if let Some(b) = &body {
                req = req.body(b.to_string());
            }
            req.send()
        };
        let res = send(&client, auth_header).await.map_err(|e| e.to_string())?;
        if res.status().as_u16() == 401 && token.is_some() {
            // token expired mid-flight -> re-auth once and retry
            {
                let mut t = self.token.lock().unwrap();
                t.access_token = None;
                t.expiry_ms = 0;
            }
            let new_tok = ensure_token(self, auth).await;
            if let Some(nt) = new_tok {
                let res2 = send(&client, format!("Bearer {}", nt))
                    .await
                    .map_err(|e| e.to_string())?;
                let status = res2.status().as_u16();
                let text = res2.text().await.unwrap_or_default();
                if !(200..300).contains(&status) {
                    return Err(format!("{} {} -> {} {}", method, table, status, text));
                }
                return Ok(serde_json::from_str::<Value>(&text).unwrap_or(json!(text)));
            }
        }
        let status = res.status().as_u16();
        let text = res.text().await.unwrap_or_default();
        if !(200..300).contains(&status) {
            return Err(format!("{} {} -> {} {}", method, table, status, text));
        }
        Ok(serde_json::from_str(&text).unwrap_or(json!(text)))
    }
}

pub async fn run_sync(sync: &Sync, db: &db::Db, auth: &crate::auth::Auth) -> Value {
    if !sync.is_configured() {
        return json!({ "ok": false, "status": "not-configured" });
    }
    if sync
        .syncing
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return json!({ "ok": false, "status": "in-progress" });
    }
    let result = run_sync_inner(sync, db, auth).await;
    sync.syncing.store(false, Ordering::SeqCst);
    result
}

async fn run_sync_inner(sync: &Sync, db: &db::Db, auth: &crate::auth::Auth) -> Value {
    // Never push/pull without an authenticated token — anon requests see
    // nothing through RLS and would advance the watermark while missing data.
    let app_token = crate::auth::get_valid_token(auth).await;
    let has_config_creds;
    {
        let c = sync.conf.lock().unwrap();
        has_config_creds = c
            .as_ref()
            .map(|c| c.email.is_some() && c.password.is_some())
            .unwrap_or(false);
    }
    if app_token.is_none() && !has_config_creds {
        return json!({ "ok": false, "status": "unauthenticated" });
    }
    sync.dirty.store(false, Ordering::SeqCst);

    // Refresh the profile cache once per cycle: pole injection on push and
    // the UI's pole awareness both rely on it.
    sync.refresh_profile(auth).await;

    let push = push_pending(sync, db, auth).await;
    let pull = pull_remote(sync, db, auth).await;
    sync.set_last_sync(db::now_iso());
    json!({
        "ok": push["error"].is_null() && pull["error"].is_null(),
        "status": "done",
        "push": push,
        "pull": pull
    })
}

// App session token lives in auth.rs (shared session for UI + sync).

async fn push_pending(sync: &Sync, db: &db::Db, auth: &crate::auth::Auth) -> Value {
    let pending = db::pending_queue(db, "", &[]);
    let mut pushed = 0usize;
    let mut skipped: usize = 0;
    let pole_of_session = sync.profile_pole_id();
    for item in pending {
        let table = item["table_name"].as_str().unwrap_or_default().to_string();
        let op = item["op"].as_str().unwrap_or_default().to_string();
        let row_id = item["row_id"].as_str().unwrap_or_default().to_string();
        let seq = item["seq"].as_i64().unwrap_or(0);
        let payload = if item["payload"].is_null() {
            None
        } else {
            serde_json::from_str::<Value>(item["payload"].as_str().unwrap_or_default()).ok()
        };
        let res = if op == "delete" {
            sync.rest(
                auth,
                "DELETE",
                &table,
                &format!("?id=eq.{}", row_id),
                None,
                None,
            )
            .await
        } else {
            // Rows created locally before a pole was known don't satisfy the
            // pole_id WITH CHECK; stamp them with the signed-in user's pole.
            // If neither the row nor the session knows a pole yet, leave the
            // row queued (it pushes automatically once the user is assigned).
            let mut payload = match payload {
                Some(p) => p,
                None => {
                    eprintln!("Sync push skipped ({}/{}): empty payload", table, row_id);
                    continue;
                }
            };
            if payload.get("pole_id").map(|v| v.is_null()).unwrap_or(true) {
                match &pole_of_session {
                    Some(pole) => {
                        payload["pole_id"] = json!(pole);
                    }
                    None => {
                        skipped += 1;
                        eprintln!(
                            "Sync push held back ({}/{}): no pole assigned yet",
                            table, row_id
                        );
                        continue;
                    }
                }
            }
            // upsert by primary key (resolution=merge-duplicates)
            sync.rest(
                auth,
                "POST",
                &table,
                "",
                Some(json!([payload])),
                Some("return=minimal,resolution=merge-duplicates".to_string()),
            )
            .await
        };
        match res {
            Ok(_) => {
                db::mark_synced(db, seq);
                pushed += 1;
            }
            Err(e) => {
                eprintln!("Sync push failed ({}/{}): {}", table, row_id, e);
                return json!({ "pushed": pushed, "skipped": skipped, "error": e });
            }
        }
    }
    json!({ "pushed": pushed, "skipped": skipped, "error": Value::Null })
}

async fn pull_remote(sync: &Sync, db: &db::Db, auth: &crate::auth::Auth) -> Value {
    let mut error: Option<String> = None;
    let mut total_rows = 0usize;
    let mut rows_applied = 0usize;

    for table in db::SYNCED_TABLES {
        let table = table.to_string();
        let remote = match sync.rest(auth, "GET", &table, "?select=*", None, None).await {
            Ok(v) => v,
            Err(e) => {
                eprintln!("Sync pull failed ({}): {}", table, e);
                error = Some(e);
                continue;
            }
        };
        let rows = remote.as_array().cloned().unwrap_or_default();
        total_rows += rows.len();

        for row in rows {
            let row_id = row["id"].as_str().unwrap_or_default().to_string();
            let existing = db::query_one(db, &table, "id = ?", &[json!(row_id)]);
            match existing {
                None => {
                    if db::insert_row(db, &table, &row, false).is_some() {
                        rows_applied += 1;
                    }
                }
                Some(ex) => {
                    let remote_at = row["updated_at"].as_str().unwrap_or_default();
                    let existing_at = ex["updated_at"].as_str().unwrap_or_default();
                    if !remote_at.is_empty()
                        && !existing_at.is_empty()
                        && parse_ts(remote_at) > parse_ts(existing_at)
                    {
                        let filters = json!([{ "col": "id", "op": "eq", "val": row_id }]);
                        let _ = db::update_row(db, &table, &row, Some(filters), false);
                        rows_applied += 1;
                    }
                }
            }
        }

        // Detect remote deletions: full remote id list; drop local rows that
        // vanish from it unless they are still pending to push.
        let id_list = match sync.rest(auth, "GET", &table, "?select=id", None, None).await {
            Ok(v) => v,
            Err(_) => continue,
        };
        let remote_ids: std::collections::HashSet<String> = id_list
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|r| r["id"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        let bind = json!(table);
        let pending = db::pending_queue(db, "table_name = ?", &[bind]);
        let local_pending: std::collections::HashSet<String> = pending
            .iter()
            .filter_map(|q| q["row_id"].as_str().map(|s| s.to_string()))
            .collect();
        let locals = db::query_all(db, &table, "", &[]);
        for local in locals {
            let lid = local["id"].as_str().unwrap_or_default().to_string();
            if remote_ids.contains(&lid) || local_pending.contains(&lid) {
                continue;
            }
            let filters = json!([{ "col": "id", "op": "eq", "val": lid }]);
            if db::delete_row(db, &table, Some(filters), false).is_ok() {
                rows_applied += 1;
            }
        }
    }

    eprintln!(
        "Sync pull complete: {} rows across {} tables, {} changes applied locally.",
        total_rows,
        db::SYNCED_TABLES.len(),
        rows_applied
    );
    json!({ "error": error, "rowsApplied": rows_applied })
}

// JS `new Date(...).getTime()` comparator: ISO-8601 strings compare lexically
// only if formats match; Supabase returns RFC3339 with offset. Parse properly.
fn parse_ts(s: &str) -> i64 {
    chrono::DateTime::parse_from_rfc3339(s)
        .map(|d| d.timestamp_millis())
        .unwrap_or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f")
                .ok()
                .map(|n| n.and_utc().timestamp_millis())
                .unwrap_or(i64::MIN)
        })
}
