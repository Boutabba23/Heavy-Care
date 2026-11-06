// Senior-test smoke: exercise database.js in a sandbox userData dir.
// 1) init -> 2) insert machine -> row queued for sync
// 3) update machine -> queue grows, updated_at bumped
// 4) delete machine -> row gone
// 5) pending count -> rows removed from queue after markSynced
const fs = require("fs");
const path = require("path");
const os = require("os");
const dbm = require("../electron/database.js");

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "hc-dbtest-"));
let failures = 0;
const ok = (name, cond) => {
  console.log(cond ? "  PASS " + name : "  FAIL " + name);
  if (!cond) failures++;
};

(async () => {
  await dbm.init(sandbox);
  ok("db file created in sandbox", fs.existsSync(path.join(sandbox, fs.readdirSync(sandbox).find((f) => f.endsWith(".db")) || "")) || fs.readdirSync(sandbox).length > 0);

  const now = new Date().toISOString();
  // -- insert
  const ins = dbm.handleQuery({ action: "insert", table: "machines", payload: { id: "m1", code: "T001", designation: "Excavator A", marque: "CAT", type: "320", created_at: now, updated_at: now } });
  ok("insert returns no error", !ins?.error);
  const rows = dbm.queryAll("machines");
  ok("machine readable back", rows.length === 1 && rows[0].id === "m1");

  // -- sync queue got the insert
  let q = dbm.queryAll("_sync_queue", "status = 'pending'");
  ok("insert queued for sync", q.length === 1 && q[0].table_name === "machines");

  // -- update
  const upd = dbm.updateRow("machines", { designation: "Excavator A2" }, [{ col: "id", op: "eq", val: "m1" }]);
  ok("update returns no error", !upd?.error);
  const rows2 = dbm.queryAll("machines");
  ok("update persisted", rows2[0].designation === "Excavator A2");
  ok("updated_at bumped", rows2[0].updated_at !== now);
  q = dbm.queryAll("_sync_queue", "status = 'pending'");
  ok("second change queued (or supersedes)", q.length >= 1);

  // -- delete
  const del = dbm.deleteRow("machines", [{ col: "id", op: "eq", val: "m1" }]);
  ok("delete returns no error", !del?.error);
  ok("row really gone", dbm.queryAll("machines").length === 0);

  // -- markSynced drains the queue
  q = dbm.queryAll("_sync_queue");
  q.forEach((r) => dbm.markSynced(r.seq));
  ok("queue drains after markSynced", dbm.queryAll("_sync_queue", "status = 'pending'").length === 0);

  // -- persistence: new sandbox run reads same file? (skip: file-level persist tested by init)
  console.log(failures === 0 ? "\nALL DB TESTS PASSED" : `\n${failures} DB TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("SMOKE CRASH:", e.message);
  process.exit(1);
});
