// Local SQLite database (via sql.js WASM — no native build required)
// Sits inside the Electron main process. All access goes through IPC.
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_NAME = "heavycare.db";

// Columns that hold JSON (arrays / objects) per table — serialized as TEXT
const JSON_COLUMNS = {
  machines: ["assigned_filters"],
  filter_groups: ["references"],
  maintenance_records: ["filters_used", "oils_used"],
  machine_monthly_stats: [
    "breakdown_days",
    "breakdown_hours",
    "idle_days",
    "idle_hours",
  ],
  global_monthly_settings: ["intemperie_days"],
};

const SCHEMA = `
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
  "references" TEXT,
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
`;

const SYNCED_TABLES = [
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

const DEFAULT_OIL_STOCKS = [
  { id: "oil-1", type: "15W40 Moteur", current_level: 120, total_barrels: 3, alert_threshold: 20 },
  { id: "oil-2", type: "Hydraulique 46", current_level: 15, total_barrels: 1, alert_threshold: 30 },
  { id: "oil-3", type: "Transmission 80W90", current_level: 180, total_barrels: 2, alert_threshold: 20 },
  { id: "oil-4", type: "Liquide de Refroidissement", current_level: 200, total_barrels: 4, alert_threshold: 20 },
];

let db = null;
let dbDir = null;
let saveTimer = null;

const nowISO = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
// SQLite reserves some identifiers (e.g. `references`); always quote columns
const q = (ident) => `"${String(ident).replace(/"/g, '""')}"`;

// ---------------------------------------------------------------------------
// Persistence (sql.js runs in memory; we export to disk after mutations)
// ---------------------------------------------------------------------------
function persist() {
  // Debounced so fast operation bursts (imports, batch updates) write once
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doPersist, 250);
}

function doPersist() {
  try {
    const data = Buffer.from(db.export());
    fs.writeFileSync(dbPath(), data);
  } catch (err) {
    console.error("DB persist failed:", err);
  }
}

function dbPath() {
  return path.join(dbDir, DB_NAME);
}

async function init(userDataDir) {
  dbDir = userDataDir;
  fs.mkdirSync(dbDir, { recursive: true });

  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(path.dirname(require.resolve("sql.js")), file),
  });

  if (fs.existsSync(dbPath())) {
    db = new SQL.Database(fs.readFileSync(dbPath()));
  } else {
    db = new SQL.Database();
  }

  db.exec(SCHEMA);

  if (countRows("oil_stocks") === 0) {
    // Seed default oil stocks on first launch (mirrors the web app defaults)
    DEFAULT_OIL_STOCKS.forEach((s) =>
      insertRow("oil_stocks", s, { queueSync: false })
    );
  }

  doPersist();
  return { path: dbPath() };
}

function countRows(table) {
  const res = db.exec(`SELECT COUNT(*) as c FROM ${table}`);
  return res[0] ? res[0].values[0][0] : 0;
}

// ---------------------------------------------------------------------------
// Row serialization / deserialization
// ---------------------------------------------------------------------------
function serializeRow(table, row) {
  const colMap = db.exec(`PRAGMA table_info(${table})`)[0]
    ? db.exec(`PRAGMA table_info(${table})`)[0].values.map((v) => v[1])
    : Object.keys(row);
  const out = {};
  const cols = colMap.length ? colMap : Object.keys(row);
  Object.entries(row).forEach(([k, v]) => {
    if (v === undefined) return; // same as "not provided"
    if (JSON_COLUMNS[table] && JSON_COLUMNS[table].includes(k)) {
      out[k] = JSON.stringify(v ?? null);
    } else if (typeof v === "boolean") {
      out[k] = v ? 1 : 0;
    } else if (v !== null && typeof v === "object") {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  });
  return { out, cols };
}

function deserializeRow(table, raw) {
  if (!raw) return null;
  const colMap = db.exec(`PRAGMA table_info(${table})`)[0];
  const jsonCols = JSON_COLUMNS[table] || [];
  const row = {};
  const { columns, values } = raw;
  columns.forEach((col, i) => {
    let v = values[i];
    if (jsonCols.includes(col)) {
      try {
        v = v == null ? null : JSON.parse(v);
      } catch {
        /* keep raw */
      }
    }
    if (typeof v === "number" && col.startsWith("works_on")) v = !!v;
    row[col] = v;
  });
  void colMap;
  return row;
}

function queryAll(table, whereClause = "", params = []) {
  const stmt = db.prepare(
    `SELECT * FROM ${q(table)} ${whereClause ? "WHERE " + whereClause : ""}`
  );
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(deserializeRow(table, { columns: stmt.getColumnNames(), values: stmt.get() }));
  }
  stmt.free();
  return rows;
}

function queryOne(table, whereClause, params) {
  const rows = queryAll(table, whereClause, params);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Sync queue — every mutation on data tables is journaled here
// ---------------------------------------------------------------------------
function enqueueSync(tableName, rowId, op, payload) {
  if (!SYNCED_TABLES.includes(tableName)) return;
  const stmt = db.prepare(
    `INSERT INTO _sync_queue (table_name, row_id, op, payload, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  );
  stmt.run([tableName, rowId, op, payload ? JSON.stringify(payload) : null, nowISO()]);
  stmt.free();
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function insertRow(table, row, { queueSync = true, returnRow = true } = {}) {
  const full = {
    ...row,
    id: row.id || uuid(),
    created_at: row.created_at || nowISO(),
    updated_at: row.updated_at || row.created_at || nowISO(),
  };
  const { out } = serializeRow(table, full);
  const cols = Object.keys(out);
  const placeholders = cols.map(() => "?").join(", ");
  const stmt = db.prepare(
    `INSERT INTO ${q(table)} (${cols.map(q).join(", ")}) VALUES (${placeholders})`
  );
  stmt.run(cols.map((c) => out[c]));
  stmt.free();
  const saved = { ...full };
  if (queueSync) {
    enqueueSync(table, full.id, "insert", full);
  }
  return returnRow ? saved : null;
}

function buildWhere(filters) {
  const clauses = [];
  const params = [];
  (filters || []).forEach((f) => {
    if (f.op === "eq") {
      clauses.push(`${q(f.col)} = ?`);
      params.push(typeof f.val === "boolean" ? (f.val ? 1 : 0) : f.val);
    }
  });
  return { clause: clauses.join(" AND "), params };
}

function updateRow(table, payload, filters, { queueSync = true } = {}) {
  const existing = queryAll(table, buildWhere(filters).clause, buildWhere(filters).params);
  if (existing.length === 0) {
    return { error: { message: "No rows found to update" } };
  }
  const { out } = serializeRow(table, { ...payload, updated_at: payload.updated_at || nowISO() });
  const setCols = Object.keys(out).filter((c) => c !== "id" && c !== "created_at");
  const { clause, params } = buildWhere(filters);
  const stmt = db.prepare(
    `UPDATE ${q(table)} SET ${setCols.map((c) => `${q(c)} = ?`).join(", ")} WHERE ${clause}`
  );
  stmt.run([...setCols.map((c) => out[c]), ...params]);
  stmt.free();

  existing.forEach((row) => {
    if (queueSync) enqueueSync(table, row.id, "update", { ...row, ...payload });
  });
  return { error: null, updatedCount: existing.length };
}

function deleteRow(table, filters, { queueSync = true } = {}) {
  const { clause, params } = buildWhere(filters);
  if (!clause) return { error: { message: "Delete requires a filter" } };
  const existing = queryAll(table, clause, params);
  const stmt = db.prepare(`DELETE FROM ${q(table)} WHERE ${clause}`);
  stmt.run(params);
  stmt.free();
  existing.forEach((row) => {
    if (queueSync) enqueueSync(table, row.id, "delete", null);
  });
  return { error: null };
}

function upsertRow(table, row, onConflictCols = [], { queueSync = true } = {}) {
  const conflictFilters = (onConflictCols.length ? onConflictCols : ["id"]).map(
    (col) => ({ col, op: "eq", val: row[col] })
  );
  const { clause, params } = buildWhere(conflictFilters);
  const existing = queryOne(table, clause, params);
  const withStamps = {
    ...row,
    updated_at: row.updated_at || nowISO(),
  };
  if (existing) {
    withStamps.created_at = row.created_at || existing.created_at;
    updateRow(table, withStamps, conflictFilters, { queueSync });
  } else {
    if (!row.id) withStamps.id = uuid();
    withStamps.created_at = row.created_at || nowISO();
    insertRow(table, withStamps, { queueSync });
  }
  return { error: null };
}

// Handles select / insert / update / delete / upsert coming over IPC in the
// exact shape the supabase-js query builder produces.
function handleQuery({ action, table, payload, filters, onConflict, single }) {
  switch (action) {
    case "select": {
      const { clause, params } = buildWhere(filters);
      let rows = queryAll(table, clause, params);
      if (single) rows = rows[0] || null;
      persist();
      return { data: rows, error: null };
    }
    case "insert": {
      const rows = (Array.isArray(payload) ? payload : [payload]).map((r) =>
        insertRow(table, r)
      );
      persist();
      return { data: rows, error: null };
    }
    case "update": {
      const res = updateRow(table, payload, filters);
      persist();
      return { data: null, error: res.error };
    }
    case "delete": {
      const res = deleteRow(table, filters);
      persist();
      return { data: null, error: res.error };
    }
    case "upsert": {
      (Array.isArray(payload) ? payload : [payload]).forEach((r) =>
        upsertRow(table, r, onConflict)
      );
      persist();
      return { data: null, error: null };
    }
    default:
      return { data: null, error: { message: `Unknown action: ${action}` } };
  }
}

// ---------------------------------------------------------------------------
// Local auth (offline accounts stored in SQLite)
// ---------------------------------------------------------------------------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createUser(email, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const id = uuid();
  const stmt = db.prepare(
    "INSERT INTO _users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
  );
  stmt.run([id, email.toLowerCase(), hashPassword(password, salt) + ":" + salt, nowISO()]);
  stmt.free();
  return { id, email: email.toLowerCase() };
}

function verifyUser(email, password) {
  const rows = verifyAll(email.toLowerCase());
  if (!rows) return null;
  const [hash, salt] = rows.password_hash.split(":");
  const test = hashPassword(password, salt);
  return test === hash ? { id: rows.id, email: rows.email } : null;
}

function verifyAll(email) {
  const stmt = db.prepare("SELECT id, email, password_hash FROM _users WHERE email = ?");
  stmt.bind([email]);
  let res = null;
  if (stmt.step()) {
    res = {
      id: stmt.get()[0],
      email: stmt.get()[1],
      password_hash: stmt.get()[2],
    };
  }
  stmt.free();
  return res;
}

function updatePassword(userId, newPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const stmt = db.prepare("UPDATE _users SET password_hash = ? WHERE id = ?");
  stmt.run([hashPassword(newPassword, salt) + ":" + salt, userId]);
  stmt.free();
  doPersist();
}

function getDb() {
  return db;
}

function markSynced(seq) {
  const stmt = db.prepare("UPDATE _sync_queue SET status = 'synced' WHERE seq = ?");
  stmt.run([seq]);
  stmt.free();
}

module.exports = {
  init,
  handleQuery,
  enqueueSync,
  queryAll,
  queryOne,
  insertRow,
  updateRow,
  deleteRow,
  upsertRow,
  persist,
  doPersist,
  dbPath,
  createUser,
  verifyUser,
  updatePassword,
  getDb,
  markSynced,
  SYNCED_TABLES,
  JSON_COLUMNS,
  countRows,
};
