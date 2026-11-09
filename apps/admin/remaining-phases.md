# Remaining Phases — Multi-Pole HeavyCare

Branch: `stage-b-pole-cutover` (commit `eaf5fba` + working-tree fixes).
Phases 1–3 (audit, design, migration runbook) and the Phase 4/5 code work are done.
Statuses below are re-verified against the current tree, not assumed.

## Phase 3b — STAGE B: flip RLS to pole_id, drop chantier_id

Status: READY TO RUN — blocked only on database access (Supabase dashboard or a
DB connection string + `psql`; neither is available to the agent).

The application code no longer writes `chantier_id` anywhere (verified:
`git grep chantier -- '*.ts' '*.tsx'` returns only a comment in `types.ts`),
and desktop ships as v1.1.3.

In the Supabase Dashboard → SQL editor, paste the whole block from
`Phase 3 - Migration Runbook.md` lines 345–401 (from `BEGIN;` through
`COMMIT;`) and run once.

It flips `pole_access_*` policies from `chantier_id` to `pole_id` (adding the
missing `WITH CHECK` on UPDATE) and drops the `chantier_id` column on all 10
business tables. One transaction: a failure applies nothing.
Prerequisite: the pre-migration backup (`supabase db dump`) exists.
Rollback = restore it.

Verification after:

```sql
SELECT table_name FROM information_schema.columns
WHERE column_name = 'chantier_id';   -- expect 0 rows
```

## Phase 4 — Main application

| # | Task | Status |
|---|---|---|
| 4.1 | `contexts/AuthContext.tsx` joins `pole:poles(...)` | ✅ DONE — root and admin contexts both embed `poles` |
| 4.2 | Block screen when `profile.pole_id IS NULL` | ✅ DONE — `components/NoPoleScreen.tsx` rendered by `AppContent` when `!isSuperAdmin && !pole` |
| 4.3 | Verify `devMode` never widens data access | ✅ VERIFIED — the only occurrences are the declaration/provider in `AuthContext`; no component or data path reads it |
| 4.4 | Rebuild root web app (`npm run build`) | ✅ PASSING — `tsconfig.json` now excludes `supabase/functions` (Deno Edge Function imports an `https://` module and was breaking Next's type check); build compiles and generates all routes |

## Phase 5 — Admin application

| # | Task | Status |
|---|---|---|
| 5.1 | Deploy the Edge Function | ❌ BLOCKED — no Supabase CLI, no `SUPABASE_ACCESS_TOKEN`, no installed `psql`. Requires the user's access token: `supabase functions deploy admin-users --project-ref yklkxvvoeovksyslcfjy` |
| 5.2 | Create/confirm the initial `super_admin` account | ❌ BLOCKED — needs account credentials (email + password) from the user |
| 5.3 | Smoke-test `/`, `/dashboard`, `/poles`, `/users`, `/statistics` | ⚠️ PARTIAL — `npm run build` compiles all 5 routes and the redirect; runtime smoke test needs the deployed Edge Function + a super-admin login |
| 5.4 | Non-super-admin rejection screen | ✅ VERIFIED IN CODE — `(dashboard)/layout.tsx` renders “Accès refusé” with the role and a sign-out button; runtime check blocked on a real account |
| 5.5 | Add `admin.example.com` to the Supabase redirect allowlist | ❌ BLOCKED — needs the Supabase dashboard / management API access token |
| 5.6 | Delete `apps/admin/pass.js` | ✅ DONE — file deleted; `.gitignore:33` still ignores the path and it was never tracked |

## Phase 6 — Testing & Security

| # | Task | Status |
|---|---|---|
| 6.1 | Cross-pole isolation (T154/T165/T200) | ❌ BLOCKED — needs per-user session tokens |
| 6.2 | Super-admin global visibility across poles | ❌ BLOCKED — needs a super-admin login |
| 6.3 | Pole-admin confinement | ❌ BLOCKED — needs a pole-admin login |
| 6.4 | Unauthorized direct-API probes | ✅ ANON PART VERIFIED — REST probes with the anon key return `200 []` for `poles`, `profiles`, `machines`, `maintenance_records`, `spare_parts`. User-token probes need a real token |
| 6.5 | Regression: machines, filters, oil, maintenance, monthly, spare parts | ❌ BLOCKED — needs a signed-in account + Stage B applied |
| 6.6 | Desktop sync round-trip after Stage B | ❌ BLOCKED — needs Stage B applied and a signed-in desktop client |
