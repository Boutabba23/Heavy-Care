# Remaining Phases — Multi-Pole HeavyCare

Branch: `stage-b-pole-cutover`.
Phases 1–3 (audit, design, runbook) and the Phase 4/5 code are done.
Statuses below were re-verified on 2026-11-09 against the live database through
the Supabase Management API (read-only queries), not assumed.

## Phase 3b — STAGE B: flip RLS to pole_id, drop chantier_id

Status: PREFLIGHT PASSED — waiting only for the pre-migration backup confirmation.

Live preflight results (2026-11-09):

- Stage A is in place: `public.poles` exists; `chantiers`, `user_chantiers` and
  `user_poles` are gone.
- The only non-internal `auth.users` trigger is `on_auth_user_created`.
- The 10 `chantier_id` columns still exist, so Stage B has not run yet.
- Every business table has `0` rows with `pole_id IS NULL` and `0` with
  `chantier_id IS NULL` — nothing would become invisible after the flip.
- Row counts match the runbook exactly: poles 3 (after T200), profiles 8,
  machines 23, filter_types 6, filter_groups 94, maintenance_records 39,
  monthly_daily_adjustments 4, oil_stocks 5, global_monthly_settings 6,
  machine_monthly_stats 64, spare_parts 4, spare_part_installations 1.
- Per pole: T154 23 machines, T165 0, T200 0.

Remaining prerequisites before running Stage B:

1. The pre-migration dump (`heavycare-pre-multipole-dump.sql` or a dashboard backup).
2. The web build deployed and desktop v1.1.3 installed; older clients would fail
   their pushes after the column drop.

Stage B itself is the single transaction in `Phase 3 - Migration Runbook.md`
(`BEGIN;` through `COMMIT;`): it flips `pole_access_*` policies from
`chantier_id` to `pole_id` (adding the missing `WITH CHECK` on UPDATE) and drops
`chantier_id` on all 10 business tables. A failure applies nothing.
Rollback = restore the backup.

Verification after:

```sql
SELECT table_name FROM information_schema.columns
WHERE column_name = 'chantier_id';   -- expect 0 rows
```

Access note: a Supabase personal access token now lives in `apps/admin/.env`
(git-ignored). Revoke it at the end of the cutover; it should not be reused.

## Phase 4 — Main application

| # | Task | Status |
|---|---|---|
| 4.1 | `contexts/AuthContext.tsx` joins `pole:poles(...)` | ✅ DONE — root and admin contexts both embed `poles` |
| 4.2 | Block screen when `profile.pole_id IS NULL` | ✅ DONE — `components/NoPoleScreen.tsx` rendered by `AppContent` when `!isSuperAdmin && !pole` |
| 4.3 | Verify `devMode` never widens data access | ✅ VERIFIED — the only occurrences are the declaration/provider in `AuthContext`; no component or data path reads it |
| 4.4 | Rebuild root web app (`npm run build`) | ✅ PASSING — `tsconfig.json` excludes `supabase/functions` (Deno Edge Function imports an `https://` module and broke Next's type check); build compiles and generates all routes |

## Phase 5 — Admin application

| # | Task | Status |
|---|---|---|
| 5.1 | Deploy the Edge Function | ❌ NOT DEPLOYED — the project has no Edge Functions yet (live check returns `[]`). CLI and access token are available; the deploy command still has to run |
| 5.2 | Create/confirm the initial `super_admin` account | ✅ CONFIRMED — exactly one exists: `28b6f687-ff9f-4075-a062-f0e7dbd1a421`, `pole_id` NULL |
| 5.3 | Smoke-test `/`, `/dashboard`, `/poles`, `/users`, `/statistics` | ⚠️ PARTIAL — `npm run build` compiles all 5 routes; runtime test needs 5.1 and a super-admin session |
| 5.4 | Non-super-admin rejection screen | ✅ VERIFIED IN CODE — `(dashboard)/layout.tsx` renders “Accès refusé”; runtime check needs a non-super-admin login |
| 5.5 | Add the admin origin to the Supabase redirect allowlist | ❌ BLOCKED — access token is available, but the real admin origin is still unknown (`admin.example.com` is a placeholder) |
| 5.6 | Delete `apps/admin/pass.js` | ✅ DONE — file deleted; `.gitignore:33` still ignores the path and it was never tracked |
| 5.7 | Create the T200 pole | ✅ DONE — `fa8df36f-90bf-4ea6-aed4-9aac0ab7e62a`, “Chantier T200”, active |

## Phase 6 — Testing & Security

| # | Task | Status |
|---|---|---|
| 6.1 | Cross-pole isolation (T154/T165/T200) | ❌ BLOCKED — needs per-user session tokens. The SQL role probe is ready; T165/T200 hold no machines, so a meaningful assertion needs at least one T165 record |
| 6.2 | Super-admin global visibility across poles | ❌ BLOCKED — needs a super-admin session (the account exists) |
| 6.3 | Pole-admin confinement | ❌ BLOCKED — no `pole_admin` profile exists yet; create one first |
| 6.4 | Unauthorized direct-API probes | ✅ ANON PART VERIFIED — REST probes with the anon key return `200 []` for `poles`, `profiles`, `machines`, `maintenance_records`, `spare_parts`. User-token probes need a real token |
| 6.5 | Regression: machines, filters, oil, maintenance, monthly, spare parts | ❌ BLOCKED — needs a signed-in account and Stage B applied |
| 6.6 | Desktop sync round-trip after Stage B | ❌ BLOCKED — needs Stage B applied and a signed-in desktop client |
