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

function loadConfig(desktopDir) {
  const candidates = [
    path.join(desktopDir, "supabase-config.json"),
    path.join(desktopDir, ".env"),
  ];
  const configFile = candidates[0];
  if (fs.existsSync(configFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configFile, "utf8"));
      if (raw.url && raw.anonKey) {
        config = { url: String(raw.url).replace(/\/$/, ""), anonKey: raw.anonKey };
        return;
      }
    } catch (e) {
      console.error("Invalid supabase-config.json:", e.message);
    }
  }
  // Environment fallback
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key && !url.includes("placeholder")) {
    config = { url: url.replace(/\/$/, ""), anonKey: key };
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

async function rest(method, table, { query = "", body, prefer } = {}) {
  const res = await fetch(`${config.url}/rest/v1/${table}${query}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
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
  const lastSyncISO = getLastSync() ? new Date(getLastSync()).toISOString() : null;

  for (const table of dbm.SYNCED_TABLES) {
    try {
      // 1. Pull changed rows (or all rows on first sync)
      let query = lastSyncISO
        ? `?updated_at=gt.${encodeURIComponent(lastSyncISO)}`
        : "?select=*";
      const res = await rest("GET", table, { query });
      const remoteRows = await res.json();

      for (const row of remoteRows) {
        const existing = dbm.queryOne(table, "id = ?", [row.id]);
        if (!existing) {
          dbm.insertRow(table, row, { queueSync: false });
        } else if (
          row.updated_at &&
          existing.updated_at &&
          new Date(row.updated_at) > new Date(existing.updated_at)
        ) {
          dbm.updateRow(table, row, [{ col: "id", op: "eq", val: row.id }], {
            queueSync: false,
          });
        }
      }

      // 2. Detect remote deletions: local synced rows absent from remote
      if (Array.isArray(remoteRows) && remoteRows.length >= 0) {
        const localRows = dbm.queryAll(table);
        const localPending = new Set(
          dbm
            .queryAll("_sync_queue", "status = 'pending' AND table_name = ?", [table])
            .map((q) => q.row_id)
        );
        const remoteIds = new Set(remoteRows.map((r) => r.id));
        for (const local of localRows) {
          if (remoteIds.has(local.id)) continue;
          if (localPending.has(local.id)) continue; // still queued to push, keep
          dbm.deleteRow(table, [{ col: "id", op: "eq", val: local.id }], {
            queueSync: false,
          });
        }
      }
    } catch (err) {
      console.error(`Sync pull failed (${table}):`, err.message);
      error = err.message;
    }
  }

  dbm.persist();
  return { error };
}

async function runSync() {
  if (!config) return { ok: false, status: "not-configured" };
  if (syncing) return { ok: false, status: "in-progress" };
  syncing = true;
  try {
    const push = await pushPending();
    const pull = await pullRemote();
    setLastSync(new Date().toISOString());
    return { ok: !(push.error || pull.error), status: "done", push, pull };
  } finally {
    syncing = false;
  }
}

function startSyncLoop(desktopDir, userDataDir, intervalMs = 10 * 60 * 1000) {
  loadConfig(desktopDir);
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
};
