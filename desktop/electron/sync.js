// Sync engine: pushes local changes (journaled in _sync_queue) to Supabase and
// pulls remote changes, merging last-write-wins by updated_at.
//
// Configure by dropping a supabase-config.json next to desktop/package.json:
//   { "url": "https://xxxxx.supabase.co", "anonKey": "ey..." }
const fs = require("fs");
const path = require("path");
const dbm = require("./database");

let config = null; // { url, anonKey }
let lastSyncPath = null;
let timer = null;
let syncing = false;
let syncAppliedCb = null; // notified when pulled changes hit the local DB

function setSyncAppliedCallback(fn) {
  syncAppliedCb = fn;
}

function loadConfig(desktopDir, userDataDir) {
  // Search order: 1) app-data folder (works for the installed app and
  // survives updates), 2) the desktop source folder (dev).
  const candidates = userDataDir
    ? [path.join(userDataDir, "supabase-config.json"), path.join(desktopDir, "supabase-config.json")]
    : [path.join(desktopDir, "supabase-config.json")];

  for (const configFile of candidates) {
    if (!fs.existsSync(configFile)) continue;
    try {
      const raw = fs.readFileSync(configFile, "utf8");
      const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")); // strip BOM if any
      if (parsed.url && parsed.anonKey) {
        config = {
          url: String(parsed.url).replace(/\/$/, ""),
          anonKey: parsed.anonKey,
          email: parsed.email || undefined,
          password: parsed.password || undefined,
        };
        console.log("Supabase sync configured for:", config.url, `(${configFile})`);
        if (!config.email) {
          console.warn(
            "No 'email'/'password' in supabase-config.json — sync will use the anon key. " +
              "If your tables have RLS policies (data is user-restricted), sync must be " +
              "authenticated: sign in via Google in the app, or add the Supabase user " +
              "credentials. (You can remove email/password once Google is used.)"
          );
        }
        return;
      }
      console.error("supabase-config.json is missing 'url' or 'anonKey'");
    } catch (e) {
      console.error("Invalid supabase-config.json:", e.message);
    }
  }
  // Environment fallback (env vars are read for this too below)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key && !url.includes("placeholder")) {
    config = {
      url: url.replace(/\/$/, ""),
      anonKey: key,
      email: process.env.SUPABASE_SYNC_EMAIL || process.env.NEXT_PUBLIC_SUPABASE_SYNC_EMAIL,
      password: process.env.SUPABASE_SYNC_PASSWORD,
    };
    return;
  }
  config = null;
}

function getLastSync() {
  try {
    return JSON.parse(fs.readFileSync(lastSyncPath, "utf8")).lastSync || 0;
  } catch {
    return 0;
  }
}

function getLastSyncISO() {
  const ts = getLastSync();
  return ts ? new Date(ts).toISOString() : null;
}

function setLastSync(iso) {
  fs.mkdirSync(path.dirname(lastSyncPath), { recursive: true });
  fs.writeFileSync(lastSyncPath, JSON.stringify({ lastSync: iso }));
}

function headers(extra = {}) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Supabase auth: token source order is 1) the app's own Supabase session
// (Google login in the desktop UI), 2) email/password from the config file.
// Sessions authenticated this way satisfy the same RLS policies as the web app.
// ---------------------------------------------------------------------------
let accessToken = null;
let tokenExpiry = 0;
let tokenProvider = null; // async () => token | null

function setTokenProvider(fn) {
  tokenProvider = fn;
}

function getSupabaseConfig() {
  return config ? { url: config.url, anonKey: config.anonKey } : null;
}

async function ensureToken() {
  if (!config) return null;
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  // Prefer the app's own Supabase session (Google login in the desktop UI)
  if (tokenProvider) {
    try {
      const appToken = await tokenProvider();
      if (appToken) {
        accessToken = appToken;
        // conservative 5 min lifetime; the auth module refreshes internally
        tokenExpiry = Date.now() + 5 * 60 * 1000;
        return accessToken;
      }
    } catch (e) {
      console.warn("App session token unavailable:", e.message);
    }
  }

  if (!config.email || !config.password) return null;

  const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: config.email, password: config.password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase sign-in failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  accessToken = data.access_token;
  // refresh 2 min before expiry (expires_in is usually 3600s)
  tokenExpiry = Date.now() + ((data.expires_in || 3600) - 120) * 1000;
  console.log("Supabase sync authenticated as:", config.email);
  return accessToken;
}

async function rest(method, table, { query = "", body, prefer } = {}) {
  const token = await ensureToken();
  const authHeader = token ? `Bearer ${token}` : `Bearer ${config.anonKey}`;
  const res = await fetch(`${config.url}/rest/v1/${table}${query}`, {
    method,
    headers: headers({
      Authorization: authHeader,
      ...(prefer ? { Prefer: prefer } : {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && token) {
    // token expired mid-flight -> re-auth once and retry
    accessToken = null;
    tokenExpiry = 0;
    const newToken = await ensureToken();
    if (newToken) {
      const retry = await fetch(`${config.url}/rest/v1/${table}${query}`, {
        method,
        headers: headers({
          Authorization: `Bearer ${newToken}`,
          ...(prefer ? { Prefer: prefer } : {}),
        }),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retry.ok) {
        const text = await retry.text().catch(() => "");
        throw new Error(`${method} ${table} -> ${retry.status} ${text.slice(0, 300)}`);
      }
      return retry;
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${table} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Push: send local journaled changes
// ---------------------------------------------------------------------------
async function pushPending() {
  const pending = dbm.queryAll(
    "_sync_queue",
    "status = 'pending' ORDER BY seq ASC"
  );

  for (const item of pending) {
    const payload = item.payload ? JSON.parse(item.payload) : null;
    try {
      if (item.op === "delete") {
        await rest("DELETE", item.table_name, {
          query: `?id=eq.${encodeURIComponent(item.row_id)}`,
        });
      } else {
        // upsert by primary key (resolution=merge-duplicates)
        await rest("POST", item.table_name, {
          prefer: "return=minimal,resolution=merge-duplicates",
          body: [payload],
        });
      }
      dbm.markSynced(item.seq);
    } catch (err) {
      console.error(`Sync push failed (${item.table_name}/${item.row_id}):`, err.message);
      return { pushed: 0, error: err.message };
    }
  }
  dbm.persist();
  return { pushed: pending.length, error: null };
}

// ---------------------------------------------------------------------------
// Pull: fetch remote rows and merge last-write-wins
// Deletions are detected by pulling the full remote id list per table and
// removing local rows that are synced (no pending changes) and missing remotely.
// ---------------------------------------------------------------------------
async function pullRemote() {
  let error = null;
  let totalRows = 0;
  let rowsApplied = 0;

  for (const table of dbm.SYNCED_TABLES) {
    try {
      // Always a full pull. Data volumes are small for this app, and a full
      // pull makes last-write-wins merges + deletion detection correct with
      // no watermark bookkeeping.
      const res = await rest("GET", table, { query: "?select=*" });
      const remoteRows = await res.json();
      const rows = Array.isArray(remoteRows) ? remoteRows : [];
      totalRows += rows.length;

      for (const row of rows) {
        const existing = dbm.queryOne(table, "id = ?", [row.id]);
        if (!existing) {
          dbm.insertRow(table, row, { queueSync: false });
          rowsApplied++;
        } else if (
          row.updated_at &&
          existing.updated_at &&
          new Date(row.updated_at) > new Date(existing.updated_at)
        ) {
          dbm.updateRow(table, row, [{ col: "id", op: "eq", val: row.id }], {
            queueSync: false,
          });
          rowsApplied++;
        }
      }

      // 2. Detect remote deletions: fetch the full remote id list (cheap)
      //    and remove the local rows that vanish from it, unless their
      //    changes are still pending to push.
      const idRes = await rest("GET", table, { query: "?select=id" });
      const remoteIds = new Set((await idRes.json()).map((r) => r.id));

      const localRows = dbm.queryAll(table);
      const localPending = new Set(
        dbm.queryAll("_sync_queue", "status = 'pending' AND table_name = ?", [table]).map(
          (q) => q.row_id
        )
      );
      for (const local of localRows) {
        if (remoteIds.has(local.id)) continue;
        if (localPending.has(local.id)) continue; // still queued to push, keep
        dbm.deleteRow(table, [{ col: "id", op: "eq", val: local.id }], {
          queueSync: false,
        });
        rowsApplied++;
      }
    } catch (err) {
      console.error(`Sync pull failed (${table}):`, err.message);
      error = err.message;
    }
  }

  dbm.persist();
  console.log(
    `Sync pull complete: ${totalRows} rows across ${dbm.SYNCED_TABLES.length} tables, ${rowsApplied} changes applied locally.`
  );
  if (totalRows === 0 && error === null) {
    console.warn(
      "Sync pull returned 0 rows while authenticated. If the tables have data in the " +
        "web app, verify these tables have SELECT policies for your user in Supabase."
    );
  }
  return { error, rowsApplied };
}

async function runSync() {
  if (!config) return { ok: false, status: "not-configured" };
  if (syncing) return { ok: false, status: "in-progress" };

  // Never run destructive push/pull without an authenticated token — anon-key
  // requests see nothing through RLS, and running one would advance the
  // last-sync watermark while missing all the data.
  let appToken = null;
  if (tokenProvider) {
    appToken = await tokenProvider().catch(() => null);
  }
  const hasConfigCreds = !!(config.email && config.password);
  if (!appToken && !hasConfigCreds) {
    return { ok: false, status: "unauthenticated" };
  }

  syncing = true;
  try {
    const push = await pushPending();
    const pull = await pullRemote();
    setLastSync(new Date().toISOString());
    if (syncAppliedCb && pull.rowsApplied > 0) {
      try {
        syncAppliedCb({ rowsApplied: pull.rowsApplied });
      } catch (e) {
        /* callback errors shouldn't kill the loop */
      }
    }
    return { ok: !(push.error || pull.error), status: "done", push, pull };
  } finally {
    syncing = false;
  }
}

function startSyncLoop(desktopDir, userDataDir, intervalMs = 10 * 60 * 1000) {
  loadConfig(desktopDir, userDataDir);
  lastSyncPath = path.join(userDataDir, "sync-state.json");

  if (timer) clearInterval(timer);
  // First sync a few seconds after launch, then on an interval
  setTimeout(() => runSync().catch(() => {}), 8000);
  timer = setInterval(() => runSyncSync().catch(() => {}), intervalMs);
}

function runSyncSync() {
  return runSync();
}

module.exports = {
  loadConfig,
  startSyncLoop,
  runSync,
  isConfigured: () => !!config,
  getLastSyncISO,
  getSupabaseConfig,
  setTokenProvider,
  setSyncAppliedCallback,
};
