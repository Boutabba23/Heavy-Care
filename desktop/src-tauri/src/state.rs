use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Clone)]
pub struct SyncConf {
    pub url: String,
    pub anon_key: String,
    pub email: Option<String>,
    pub password: Option<String>,
}

#[derive(Default)]
pub struct TokenState {
    pub access_token: Option<String>,
    pub expiry_ms: i64,
}

pub type Session = Value;

pub struct AuthState {
    pub conf: Mutex<Option<SyncConf>>,
    pub session: Mutex<Option<Session>>,
    pub session_file: Mutex<Option<PathBuf>>,
}

impl AuthState {
    pub fn new() -> Self {
        AuthState {
            conf: Mutex::new(None),
            session: Mutex::new(None),
            session_file: Mutex::new(None),
        }
    }
}

// Offline local account session persisted in session.json
pub struct LocalSessionState {
    session: Mutex<Option<Value>>,
    file: Mutex<Option<PathBuf>>,
}

impl LocalSessionState {
    pub fn new(session: Option<Value>, file: PathBuf) -> Self {
        LocalSessionState {
            session: Mutex::new(session),
            file: Mutex::new(Some(file)),
        }
    }
    pub fn current(&self) -> Option<Value> {
        self.session.lock().unwrap().clone()
    }
    pub fn set(&self, user: &Value) {
        // mirrors Electron buildSession()
        let s = json!({
            "access_token": format!("local-{}", user["id"].as_str().unwrap_or_default()),
            "user": {
                "id": user["id"],
                "email": user["email"],
                "app_metadata": { "provider": "local" }
            }
        });
        if let Some(f) = self.file.lock().unwrap().clone() {
            std::fs::write(&f, s.to_string()).ok();
        }
        *self.session.lock().unwrap() = Some(s);
    }
    pub fn clear(&self) {
        if let Some(f) = self.file.lock().unwrap().clone() {
            std::fs::remove_file(&f).ok();
        }
        *self.session.lock().unwrap() = None;
    }
}
