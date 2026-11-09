Remaining Phases — Multi-Pole HeavyCare
Current branch: stage-b-pole-cutover (commit eaf5fba). Phases 1–3 (audit, design, migration runbook) and the Phase 4/5 code work are done. Stage B of Phase 3 is the only database step still pending.

Phase 3b — STAGE B: flip RLS to pole_id, drop chantier_id
Status: READY TO RUN — code no longer writes chantier_id anywhere (verified: 0 references in *.ts/*.tsx outside node_modules), desktop ships as v1.1.3.

In the Supabase Dashboard → SQL editor, paste the whole block from Phase 3 - Migration Runbook.md lines 345–401 (from BEGIN; through COMMIT;) and run once.

It flips pole_access_* policies from chantier_id to pole_id (adding the missing WITH CHECK on UPDATE) and drops the chantier_id column on all 10 business tables.
One transaction: a failure applies nothing.
Prerequisite: the pre-migration backup (supabase db dump) exists. Rollback = restore it.
Verification after:

SELECT table_name FROM information_schema.columns
WHERE column_name = 'chantier_id';   -- expect 0 rows
Phase 4 — Main application (remaining)
#	Task	Status
4.1	contexts/AuthContext.tsx join pole:chantiers(...) → pole:poles(...)	❌ NOT DONE — the runbook says this is the one runtime break from the rename
4.2	Block screen when profile.pole_id IS NULL ("Compte sans pôle — contactez votre administrateur")	❌ not done
4.3	Verify devMode toggle never widens data access	❌ not verified
4.4	Rebuild root web app after the AuthContext one-liner (npm run build)	❌ depends on 4.1
Phase 5 — Admin application (remaining)
Code exists in apps/admin/; these gaps remain.

#	Task	Status
5.1	Deploy the Edge Function — supabase functions deploy admin-users --project-ref yklkxvvoeovksyslcfjy	❌ not deployed; /users page errors without it
5.2	Create the initial super_admin account (or confirm the existing one at 28b6f687-...)	❌ pending your credentials
5.3	Smoke-test all 4 routes: /, /dashboard, /poles, /users, /statistics	❌
5.4	Verify the non-super-admin rejection screen works	❌
5.5	Add admin.example.com to Supabase redirect allowlist for Google OAuth	❌
5.6	Delete apps/admin/pass.js (contains service-role key) and confirm it's gitignored	❌
Phase 6 — Testing & Security
#	Task	Status
6.1	Cross-pole isolation: T154 user reads T154 only, gets empty for T165/T200	❌
6.2	Super-admin global visibility across all poles	❌
6.3	Pole-admin confinement	❌
6.4	Unauthorized direct-API probes (anon, user token) return nothing	❌
6.5	Regression: machines, filters, oil, maintenance, monthly, spare parts flows	❌
6.6	Desktop sync round-trip (push + pull) after Stage B	❌
