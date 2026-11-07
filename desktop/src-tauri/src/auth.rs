use crate::state::{AuthState, SyncConf};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub type Auth = AuthState;

const CALLBACK_PORT: u16 = 48621;
pub const CALLBACK_URL: &str = "http://127.0.0.1:48621/auth/callback";

pub fn init(auth: &Auth, url: String, anon_key: String, user_data_dir: std::path::PathBuf) {
    *auth.conf.lock().unwrap() = Some(SyncConf {
        url,
        anon_key,
        email: None,
        password: None,
    });
    *auth.session_file.lock().unwrap() = Some(user_data_dir.join("supabase-auth.json"));
    load_persisted(auth);
}

fn load_persisted(auth: &Auth) {
    if let Some(file) = auth.session_file.lock().unwrap().clone() {
        if let Ok(raw) = std::fs::read_to_string(&file) {
            if let Ok(v) = serde_json::from_str::<Value>(&raw) {
                if v.get("access_token").is_some() && v.get("user").is_some() {
                    *auth.session.lock().unwrap() = Some(v);
                    return;
                }
            }
        }
    }
    *auth.session.lock().unwrap() = None;
}

fn persist(auth: &Auth) {
    let guard = auth.session.lock().unwrap();
    if let Some(file) = auth.session_file.lock().unwrap().clone() {
        match guard.as_ref() {
            Some(s) => {
                std::fs::write(&file, s.to_string()).ok();
            }
            None => {
                std::fs::remove_file(&file).ok();
            }
        }
    }
}

pub fn get_session(auth: &Auth) -> Option<Value> {
    auth.session.lock().unwrap().clone()
}

pub fn build_public_shape(auth: &Auth) -> Option<Value> {
    let s = auth.session.lock().unwrap();
    let s = s.as_ref()?;
    if s.get("user").is_none() {
        return None;
    }
    Some(json!({
        "access_token": s["access_token"],
        "user": {
            "id": s["user"]["id"],
            "email": s["user"]["email"],
            "user_metadata": s["user"]["user_metadata"],
            "app_metadata": { "provider": s["user"]["app_metadata"]["provider"].as_str().unwrap_or("supabase") }
        }
    }))
}

fn set_session(auth: &Auth, data: Value) {
    let expires_in = data["expires_in"].as_i64().unwrap_or(3600);
    let session = json!({
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_at": chrono::Utc::now().timestamp_millis() + expires_in * 1000,
        "user": data["user"]
    });
    *auth.session.lock().unwrap() = Some(session);
    persist(auth);
}

// ---------------------------------------------------------------------------
// PKCE + OAuth (opened in the system browser; callback via loopback server)
// ---------------------------------------------------------------------------
fn base64url(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

pub fn code_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    base64url(&digest)
}

pub fn build_authorize_url(auth: &Auth, provider: &str) -> Result<(String, String), String> {
    use rand::RngCore;
    let mut buf = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut buf);
    let verifier = base64url(&buf);
    let challenge = code_challenge(&verifier);
    let conf = auth.conf.lock().unwrap().clone();
    let conf = conf.ok_or("Sync not configured")?;
    let mut url = url::Url::parse(&format!("{}/auth/v1/authorize", conf.url))
        .map_err(|e| e.to_string())?;
    url.query_pairs_mut()
        .append_pair("provider", provider)
        .append_pair("redirect_to", CALLBACK_URL)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256");
    Ok((url.to_string(), verifier))
}

pub async fn exchange_code(auth: &Auth, code: &str, verifier: &str) -> Result<(), String> {
    let (url, anon_key) = conf_or_builtin(auth);
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/auth/v1/token?grant_type=pkce", url))
        .header("apikey", &anon_key)
        .json(&json!({ "auth_code": code, "code_verifier": verifier }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let text = res.text().await.unwrap_or_default();
    if !(200..300).contains(&status) {
        return Err(format!("PKCE exchange failed ({}): {}", status, text));
    }
    let data: Value =
        serde_json::from_str(&text).map_err(|e| format!("Bad PKCE response: {}", e))?;
    set_session(auth, data);
    Ok(())
}

// Email + password sign-in against Supabase
pub async fn sign_in_with_password(auth: &Auth, email: &str, password: &str) -> Result<(), String> {
    let (url, anon_key) = conf_or_builtin(auth);
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/auth/v1/token?grant_type=password", url))
        .header("apikey", &anon_key)
        .json(&json!({ "email": email, "password": password }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let text = res.text().await.unwrap_or_default();
    if !(200..300).contains(&status) {
        return Err(format!("Sign-in failed ({}): {}", status, text));
    }
    let data: Value =
        serde_json::from_str(&text).map_err(|e| format!("Bad sign-in response: {}", e))?;
    set_session(auth, data);
    Ok(())
}

async fn refresh_session(auth: &Auth) -> Option<Value> {
    let refresh_token = {
        let s = auth.session.lock().unwrap();
        s.as_ref()?.get("refresh_token")?.as_str()?.to_string()
    };
    let (url, anon_key) = conf_or_builtin(auth);
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/auth/v1/token?grant_type=refresh_token", url))
        .header("apikey", &anon_key)
        .json(&json!({ "refresh_token": refresh_token }))
        .send()
        .await
        .ok()?;
    if res.status().as_u16() >= 400 {
        // refresh rejected -> drop the session
        drop_session(auth);
        return None;
    }
    let data: Value = res.json().await.ok()?;
    set_session(auth, data.clone());
    Some(data)
}

pub async fn sign_out(app: &Auth) -> Result<(), String> {
    let token = app.session.lock().unwrap().as_ref().map(|s| {
        s.get("access_token")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    });
    if let Some(Some(token)) = token {
        let (url, anon_key) = conf_or_builtin(app);
        let client = reqwest::Client::new();
        client
            .post(format!("{}/auth/v1/logout", url))
            .header("apikey", &anon_key)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .ok();
    }
    drop_session(app);
    Ok(())
}

fn drop_session(app: &Auth) {
    *app.session.lock().unwrap() = None;
    persist(app);
}

// Returns a valid access token, refreshing when needed (used by the sync engine)
pub async fn get_valid_token(auth: &Auth) -> Option<String> {
    let expires_at;
    {
        let s = auth.session.lock().unwrap();
        let s = s.as_ref()?;
        expires_at = s.get("expires_at")?.as_i64()?;
    }
    if chrono::Utc::now().timestamp_millis() < expires_at - 120_000 {
        let s = auth.session.lock().unwrap();
        return s
            .as_ref()
            .and_then(|s| s.get("access_token").and_then(|v| v.as_str()).map(|s| s.to_string()));
    }
    let _ = refresh_session(auth).await;
    let s = auth.session.lock().unwrap();
    Some(
        s.as_ref()
            .and_then(|s| s.get("access_token").and_then(|v| v.as_str()).map(|s| s.to_string()))?,
    )
}

fn conf_or_builtin(auth: &Auth) -> (String, String) {
    let conf = auth.conf.lock().unwrap().clone();
    match conf {
        Some(c) => (c.url, c.anon_key),
        None => (
            crate::sync::BUILTIN_URL.to_string(),
            crate::sync::BUILTIN_ANON_KEY.to_string(),
        ),
    }
}
