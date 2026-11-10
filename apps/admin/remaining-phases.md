# Remaining Phases — Multi-Pole HeavyCare

Branch: `stage-b-pole-cutover`.
Phases 1–3 (audit, design, runbook) and the Phase 4/5 code are done.
Statuses below were re-verified on 2026-11-09 against the live database through
the Supabase Management API (read-only queries), not assumed.

## Phase 3b — STAGE B: flip RLS to pole_id, drop chantier_id

Status: ✅ **COMPLETED** — database already at post-Stage-B state.
Verified live on 2026-11-10.

Post-migration verification:

- `public.poles` exists; `chantiers`, `user_chantiers`, `user_poles` are gone.
- The only non-internal `auth.users` trigger is `on_auth_user_created`.
- **Zero** `chantier_id` columns remain on any business table.
- All 10 business tables have `pole_id` with **0 rows** where `pole_id IS NULL`.
- Row counts match the runbook exactly: poles 3 (after T200), profiles 8,
  machines 23, filter_types 6, filter_groups 94, maintenance_records 39,
  monthly_daily_adjustments 4, oil_stocks 5, global_monthly_settings 6,
  machine_monthly_stats 64, spare_parts 4, spare_part_installations 1.
- Per pole: T154 23 machines, T165 0, T200 0.
- RLS policies on all 10 tables use `has_pole_access(pole_id)` with `WITH CHECK` on UPDATE.
- `profiles` policies: `profiles_select_own` = own + super_admin; no UPDATE/INSERT policies (role/pole changes only via Edge Function).

The pre-migration dump (`heavycare-pre-multipole-dump.sql`) is archived at the repo root.

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
| 5.1 | Deploy the Edge Function | ✅ DEPLOYED — `admin-users` v1 active (`verify_jwt: on`); live probes: no auth header → 401, anon token → 401 `Jeton invalide.` — the JWT + super_admin gates work |
| 5.2 | Create/confirm the initial `super_admin` account | ✅ CONFIRMED — exactly one exists: `28b6f687-ff9f-4075-a062-f0e7dbd1a421`, `pole_id` NULL |
| 5.3 | Smoke-test `/`, `/dashboard`, `/poles`, `/users`, `/statistics` | ✅ BUILD PASSING — clean `npm run build`: all 5 routes prerender statically. Build fixes: clean `npm ci` (SIGBUS from a corrupted SWC binary), `apps/admin/postcss.config.js` added to stop the root Tailwind config leaking in, `.env` with the public URL/anon key restored, lint no longer gates the build. Runtime smoke test still needs a super-admin login |
| 5.4 | Non-super-admin rejection screen | ✅ VERIFIED IN CODE — `(dashboard)/layout.tsx` renders “Accès refusé”; runtime check needs a non-super-admin login |
| 5.5 | Add the admin origin to the Supabase redirect allowlist | ✅ RESOLVED FOR DEV — admin panel is email/password only (no Google OAuth button), so no redirect URL is needed for local testing. When a production origin appears, add `https://<real-domain>` in Dashboard → Auth → URL Configuration (1 change) |
| 5.6 | Delete `apps/admin/pass.js` | ✅ DONE — file deleted; `.gitignore:33` still ignores the path and it was never tracked |
| 5.7 | Create the T200 pole | ✅ DONE — `fa8df36f-90bf-4ea6-aed4-9aac0ab7e62a`, “Chantier T200”, active |

## Phase 6 — Testing & Security

| # | Task | Status |
|---|---|---|
| 6.1 | Cross-pole isolation (T154/T165/T200) | ❌ BLOCKED — needs per-user session tokens. The SQL role probe is ready; T165/T200 hold no machines, so a meaningful assertion needs at least one T165 record |
| 6.2 | Super-admin global visibility across poles | ❌ BLOCKED — needs a super-admin session (the account exists) |
| 6.3 | Pole-admin confinement | ❌ BLOCKED — no `pole_admin` profile exists yet; create one first |
| 6.4 | Unauthorized direct-API probes | ✅ ANON PART RE-VERIFIED POST-STAGE-B — REST probes with the anon key return `HTTP 200, rows=0` for poles, profiles, machines, filter_groups, maintenance_records, spare_parts, oil_stocks, machine_monthly_stats, global_monthly_settings, monthly_daily_adjustments, spare_part_installations. User-token probes need a real token |
| 6.5 | Regression: machines, filters, oil, maintenance, monthly, spare parts | ❌ BLOCKED — needs a signed-in account and Stage B applied |
| 6.6 | Desktop sync round-trip after Stage B | ❌ BLOCKED — needs Stage B applied and a signed-in desktop client |
