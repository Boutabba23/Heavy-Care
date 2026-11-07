// Smoke-test the Tauri-created SQLite DB (run with Node >= 22: node dbtest.mjs)
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const dbPath = join(process.env.APPDATA, "HeavyCare", "heavycare.db");
const db = new DatabaseSync(dbPath);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((r) => r.name);
console.log("tables:", tables.join(", "));

const oils = db.prepare("SELECT id, type, current_level FROM oil_stocks").all();
console.log("seeded oil_stocks:", JSON.stringify(oils));

const queue = db.prepare("SELECT COUNT(*) AS c FROM _sync_queue").get();
console.log("_sync_queue rows:", queue.c);
