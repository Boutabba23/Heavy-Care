// Supabase auth for the desktop app (Google OAuth via PKCE + email/password).
// The session produced here is reused by the sync engine, so sync traffic is
// authenticated the same way as the web app and passes RLS policies.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CALLBACK_PORT = 48621;
const CALLBACK_URL = `http://127.0.0.1:${CALLBACK_PORT}/auth/callback`;

let session = null; // { access_token, refresh_token, expires_at, user }
let sessionFile = null;
let configRef = null; // { url, anonKey } set by main
const listeners = new Set();

function init(config, userDataDir) {
  configRef = config;
  sessionFile = path.join(userDataDir, "supabase-auth.json");
  loadPersisted();
}

function getConfig() {
  return configRef;
}

function loadPersisted() {
  try {
    const raw = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    if (raw && raw.access_token && raw.user) {
      session = raw;
    }
  } catch {
    /* none yet */
  }
}

function persist() {
  if (!sessionFile) return;
  if (session) {
    fs.writeFileSync(sessionFile, JSON.stringify(session));
  } else if (fs.existsSync(sessionFile)) {
    fs.readdirSync;
    fs.unlinkSync(sessionFile);
  }
}

function getSession() {
  return session;
}

function buildPublicShape() {
  if (!session || !session.user) return null;
  return {
    access_token: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email,
      user_metadata: session.user.user_metadata || {},
      app_metadata: { provider: session.user.app_metadata?.provider || "supabase" },
    },
  };
}

function notify(event) {
  listeners.forEach((cb) => {
    try {
      cb(event, buildPublicShape());
    } catch (e) {
      console.error("auth listener error:", e);
    }
  });
}

function onChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---------------------------------------------------------------------------
// PKCE + OAuth popup flow
// ---------------------------------------------------------------------------
function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildAuthorizeUrl(provider = "google") {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  const url = new URL(`${configRef.url}/auth/v1/authorize`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect_to", CALLBACK_URL);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { url: url.toString(), verifier };
}

async function exchangeCode(authCode, verifier) {
  const res = await fetch(
    `${configRef.url}/auth/v1/token?grant_type=pkce`,
    {
      method: "POST",
      headers: {
        apikey: configRef.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auth_code: authCode, code_verifier: verifier }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PKCE exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: data.user,
  };
  persist();
  notify("SIGNED_IN");
  return session;
}

// Email + password sign-in against Supabase (for the optional SSH/user flow)
async function signInWithPassword(email, password) {
  const res = await fetch(
    `${configRef.url}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: configRef.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sign-in failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: data.user,
  };
  persist();
  notify("SIGNED_IN");
  return session;
}

async function refreshSession() {
  if (!session?.refresh_token) return null;
  const res = await fetch(
    `${configRef.url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: configRef.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }
  );
  if (!res.ok) {
    // refresh rejected -> drop the session
    session = null;
    persist();
    notify("SIGNED_OUT");
    return null;
  }
  const data = await res.json();
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: data.user,
  };
  persist();
  return session;
}

async function signOut() {
  if (session?.access_token) {
    try {
      await fetch(`${configRef.url}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: configRef.anonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch {
      /* best effort */
    }
  }
  session = null;
  persist();
  notify("SIGNED_OUT");
}

// Returns a valid access token, refreshing when needed (used by sync engine)
async function getValidToken() {
  if (!session) return null;
  if (Date.now() < session.expires_at - 120000) return session.access_token;
  await refreshSession();
  return session ? session.access_token : null;
}

module.exports = {
  init,
  getSession,
  buildPublicShape,
  buildAuthorizeUrl,
  exchangeCode,
  signInWithPassword,
  refreshSession,
  signOut,
  getValidToken,
  notify,
  onChange,
  CALLBACK_PORT,
  CALLBACK_URL,
};
