// Tauri 2 app: window + IPC commands mirroring the Electron preload bridge.
// The renderer keeps calling window.desktop.{db,auth} — created by the shim
// in the renderer layout over tauri::invoke. Events: "db:synced" & "auth:changed".
mod auth;
mod db;
mod state;
mod sync;

use serde_json::{json, Value};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

pub type AppState = Arc<AppCtx>;

pub struct AppCtx {
    pub db: db::Db,
    pub sync: Arc<sync::Sync>,
    pub auth: Arc<auth::Auth>,
    // offline local session (session.json, mirrors Electron currentSession)
    pub local_session: state::LocalSessionState,
    pub app_handle: AppHandle,
    pub pending_verifier: std::sync::Mutex<Option<String>>,
}

// ---------------------------------------------------------------------------
// Commands — exact same payloads as the Electron IPC handlers
// ---------------------------------------------------------------------------
#[tauri::command]
fn db_query(state: State<'_, AppState>, req: Value) -> Value {
    let app = state.inner();
    db::handle_query(&app.db, &req)
}

#[tauri::command]
fn db_sync_status(state: State<'_, AppState>) -> Value {
    let app = state.inner();
    let pending = db::pending_count(&app.db);
    let last = app.sync.last_sync();
    json!({
        "configured": app.sync.is_configured(),
        "pending": pending,
        "lastSync": last
    })
}

#[tauri::command]
async fn db_sync_now(state: State<'_, AppState>) -> Result<Value, String> {
    let app = state.inner().clone();
    let res = sync::run_sync(&app.sync, &app.db, &app.auth).await;
    if res["status"].as_str() == Some("done") {
        let applied = res["pull"]["rowsApplied"].as_i64().unwrap_or(0);
        if applied > 0 {
            app.app_handle
                .emit("db:synced", json!({ "rowsApplied": applied }))
                .ok();
        }
    }
    Ok(res)
}

// ---- Auth ----
fn get_active_session(app: &AppCtx) -> Option<Value> {
    auth::build_public_shape(&app.auth).or_else(|| app.local_session.current())
}

#[tauri::command]
fn auth_get_session(state: State<'_, AppState>) -> Value {
    let app = state.inner();
    json!({ "data": { "session": get_active_session(app) } })
}

#[tauri::command]
async fn auth_sign_in(
    state: State<'_, AppState>,
    email: String,
    password: String,
) -> Result<Value, String> {
    let app = state.inner().clone();
    // 1. Supabase first (also gives the sync engine its JWT)
    if app.sync.is_configured() {
        match auth::sign_in_with_password(&app.auth, &email, &password).await {
            Ok(()) => {
                app.app_handle
                    .emit(
                        "auth:changed",
                        json!({ "event": "SIGNED_IN", "session": get_active_session(&app) }),
                    )
                    .ok();
                return Ok(json!({ "error": Value::Null }));
            }
            Err(err_msg) => {
                let lower = err_msg.to_lowercase();
                let network_down = ["ENOTFOUND", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT",
                    "fetch failed", "network", "error sending request", "dns error"]
                    .iter()
                    .any(|s| lower.contains(&s.to_lowercase()));
                if !network_down {
                    return Ok(json!({ "error": { "message": err_msg } }));
                }
                // fall through to local offline accounts
            }
        }
    }
    // 2. Local offline fallback
    match db::verify_user(&app.db, &email, &password) {
        Some(user) => {
            app.local_session.set(&user);
            app.app_handle
                .emit(
                    "auth:changed",
                    json!({ "event": "SIGNED_IN", "session": get_active_session(&app) }),
                )
                .ok();
            Ok(json!({ "error": Value::Null }))
        }
        None => Ok(json!({ "error": { "message": "Email ou mot de passe incorrect." } })),
    }
}

#[tauri::command]
fn auth_sign_in_google(state: State<'_, AppState>) -> Value {
    let app = state.inner();
    match auth::build_authorize_url(&app.auth, "google") {
        Ok((url, verifier)) => {
            app.pending_verifier.lock().unwrap().replace(verifier);
            match open_in_system_browser(&app.app_handle, &url) {
                Ok(()) => json!({ "error": Value::Null }),
                Err(e) => json!({ "error": { "message": e } }),
            }
        }
        Err(e) => json!({ "error": { "message": e } }),
    }
}

#[tauri::command]
fn auth_sign_up(state: State<'_, AppState>, email: String, password: String) -> Value {
    let app = state.inner();
    if email.is_empty() || password.len() < 6 {
        return json!({ "error": { "message": "Mot de passe trop court (6 caractères minimum)." } });
    }
    let existing = db::query_one(&app.db, "_users", "email = ?", &[json!(email.to_lowercase())]);
    if existing.is_some() {
        return json!({ "error": { "message": "Un compte existe déjà avec cet email." } });
    }
    let user = db::create_user(&app.db, &email, &password);
    app.local_session.set(&user);
    app.app_handle
        .emit(
            "auth:changed",
            json!({ "event": "SIGNED_IN", "session": get_active_session(app) }),
        )
        .ok();
    json!({ "error": Value::Null })
}

#[tauri::command]
async fn auth_sign_out(state: State<'_, AppState>) -> Result<Value, String> {
    let app = state.inner().clone();
    app.local_session.clear();
    auth::sign_out(&app.auth).await.ok();
    app.app_handle
        .emit(
            "auth:changed",
            json!({ "event": "SIGNED_OUT", "session": Value::Null }),
        )
        .ok();
    Ok(json!({ "error": Value::Null }))
}

#[tauri::command]
fn auth_update_password(state: State<'_, AppState>, password: String) -> Value {
    let app = state.inner();
    if get_active_session(app).is_none() {
        return json!({ "error": { "message": "Non connecté." } });
    }
    if let Some(session) = app.local_session.current() {
        if let Some(uid) = session["id"].as_str() {
            db::update_password(&app.db, uid, &password);
        }
    }
    json!({ "error": Value::Null })
}

fn open_in_system_browser(app: &AppHandle, url: &str) -> Result<(), String> {
    tauri_plugin_opener::open_url(app, url, None::<&str>).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// OAuth loopback callback server (same port/UX as the Electron app):
// Google redirects to http://127.0.0.1:48621/auth/callback?code=...
// ---------------------------------------------------------------------------
async fn run_callback_server(app: Arc<AppCtx>) {
    let listener = match tokio::net::TcpListener::bind(("127.0.0.1", auth::CALLBACK_PORT)).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("OAuth callback server failed: {}", e);
            return;
        }
    };
    loop {
        let Ok((stream, _)) = listener.accept().await else { break };
        let app = app.clone();
        tokio::spawn(async move {
            handle_callback_conn(app, stream).await;
        });
    }
}

async fn handle_callback_conn(app: Arc<AppCtx>, mut stream: tokio::net::TcpStream) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).await.unwrap_or(0);
    let req_text = String::from_utf8_lossy(&buf[..n]).to_string();
    let first_line = req_text.lines().next().unwrap_or_default().to_string();
    // e.g. "GET /auth/callback?code=... HTTP/1.1"
    let raw_path = first_line
        .split_whitespace()
        .nth(1)
        .unwrap_or_default()
        .to_string();

    let body = if raw_path.starts_with("/auth/callback") {
        let query = raw_path.split('?').nth(1).unwrap_or_default();
        let mut code = String::new();
        let mut err_desc = String::new();
        for pair in query.split('&') {
            let mut it = pair.splitn(2, '=');
            let k = it.next().unwrap_or_default();
            let v = urldecode(it.next().unwrap_or_default());
            match k {
                "code" => code = v,
                "error_description" | "error" => err_desc = v,
                _ => {}
            }
        }
        if !code.is_empty() {
            if let Some(verifier) = app.pending_verifier.lock().unwrap().take() {
                match auth::exchange_code(&app.auth, &code, &verifier).await {
                    Ok(()) => {
                        eprintln!("Supabase session established (OAuth).");
                        app.app_handle
                            .emit(
                                "auth:changed",
                                json!({ "event": "SIGNED_IN", "session": get_active_session(&app) }),
                            )
                            .ok();
                    }
                    Err(e) => eprintln!("OAuth exchange failed: {}", e),
                }
            }
        }
        let message = if code.is_empty() {
            format!(
                "<p>Connexion échouée : {}. Vous pouvez fermer cette fenêtre.</p>",
                if err_desc.is_empty() { "aucun code reçu" } else { &err_desc }
            )
        } else {
            "<p>Connexion réussie. Vous pouvez fermer cette fenêtre…</p>".to_string()
        };
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n<!DOCTYPE html><html><head><style>body{{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#0f172a}}</style></head><body>{}<script>setTimeout(()=>window.close(),800)</script></body></html>",
            message.len(),
            message
        )
    } else {
        "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot found"
            .to_string()
    };

    let _ = stream.write_all(body.as_bytes()).await;
    let _ = stream.flush().await;
    stream.shutdown().await.ok();
}

fn urldecode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let h = u8::from_str_radix(&s[i + 1..i + 3], 16).unwrap_or(b'%');
                out.push(h);
                i += 3;
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b => {
                out.push(b);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).to_string()
}

// ---------------------------------------------------------------------------
// Local session persistence (offline accounts — session.json)
// ---------------------------------------------------------------------------
fn load_local_session(path: &std::path::Path) -> Option<Value> {
    let raw = std::fs::read_to_string(path).ok()?;
    let v: Value = serde_json::from_str(&raw).ok()?;
    if v.get("user").is_some() {
        Some(v)
    } else {
        None
    }
}

// Sync interval loop — first run 8s after launch, then every 10 min
async fn sync_loop(app: Arc<AppCtx>) {
    tokio::time::sleep(std::time::Duration::from_secs(8)).await;
    run_and_notify(&app).await;
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(10 * 60)).await;
        run_and_notify(&app).await;
    }
}

async fn run_and_notify(app: &Arc<AppCtx>) {
    let res = sync::run_sync(&app.sync, &app.db, &app.auth).await;
    if res["status"].as_str() == Some("done") {
        let applied = res["pull"]["rowsApplied"].as_i64().unwrap_or(0);
        if applied > 0 {
            app.app_handle
                .emit("db:synced", json!({ "rowsApplied": applied }))
                .ok();
        }
    }
}

// ---------------------------------------------------------------------------
// Data continuity with the Electron build: same userData folder
// %APPDATA%\HeavyCare (Windows) / ~/.config/HeavyCare (Linux/macOS).
fn user_data_dir() -> std::path::PathBuf {
    if cfg!(windows) {
        std::env::var("APPDATA").map(std::path::PathBuf::from).unwrap_or_else(|_| std::path::PathBuf::from("."))
            .join("HeavyCare")
    } else if cfg!(target_os = "macos") {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
        std::path::PathBuf::from(home)
            .join("Library/Application Support/HeavyCare")
    } else {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
        std::path::PathBuf::from(home).join(".config/HeavyCare")
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let user_data = user_data_dir();

            let database = db::init(user_data.clone())?;
            let s = Arc::new(sync::Sync::new());
            s.load_config(&user_data);
            s.set_last_sync_path(user_data.join("sync-state.json"));

            let a = Arc::new(auth::Auth::new());
            let (url, key) = s.get_supplier_url_key();
            auth::init(&a, url, key, user_data.clone());

            let session_file = user_data.join("session.json");
            let local = state::LocalSessionState::new(load_local_session(&session_file), session_file);

            let ctx: AppState = Arc::new(AppCtx {
                db: database,
                sync: s,
                auth: a,
                local_session: local,
                app_handle: handle,
                pending_verifier: Default::default(),
            });

            app.manage(ctx.clone());

            let ctx2 = ctx.clone();
            tauri::async_runtime::spawn(async move { run_callback_server(ctx2).await });
            let ctx3 = ctx.clone();
            tauri::async_runtime::spawn(async move { sync_loop(ctx3).await });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db_query,
            db_sync_status,
            db_sync_now,
            auth_get_session,
            auth_sign_in,
            auth_sign_in_google,
            auth_sign_up,
            auth_sign_out,
            auth_update_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
