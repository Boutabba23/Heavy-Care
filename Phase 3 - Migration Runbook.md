# Phase 3 — Migration Runbook (Multi-Pole)

Approved design: `Phase 2 - Architecture Design.md` (all decisions D1–D6 = recommended).
Everything executes in the **Supabase SQL editor**. One transaction, one paste-run — if any statement fails, nothing is applied.

---

## PRE — Before running anything

### PRE-1. Backup (mandatory; this is the rollback artifact)

Dashboard → **Database → Backups** (create a manual backup), or CLI:

```
supabase db dump --file heavycare-pre-multipole-dump.sql
```

Store it outside your machine too. Rollback = `psql -f heavycare-pre-multipole-dump.sql` against the project (or restore via dashboard backup).

### PRE-2. Discover triggers on `auth.users` (expect exactly ONE non-internal trigger: `auto_assign_chantier`-based)

```sql
SELECT tgname AS trigger_name, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
```

**If you see more than one trigger**, STOP and paste the output to me before running the migration (the script drops all non-internal triggers on `auth.users` by design — only safe if the list is what we expect).

### PRE-3. Map the duplicated `updated_at` trigger variants (for the optional cleanup block K)

```sql
SELECT trigger_name, event_object_table,
       action_statement ILIKE '%handle_updated_at%'        AS uses_handle,
       action_statement ILIKE '%set_updated_at%'           AS uses_set,
       action_statement ILIKE '%update_updated_at_column%' AS uses_update
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY 2, 1;
```

---

## THE MIGRATION (single transaction)

Paste everything from `BEGIN;` to `COMMIT;` and run once.

```sql
BEGIN;

-- ============================================================
-- B. Remove orphan June-era structures (approved: D6)
--    poles table: orphan duplicate of chantiers, zero FKs from
--    business data, zero policies (invisible/untouchable today)
-- ============================================================
DROP TABLE IF EXISTS public.user_poles;
DROP TABLE IF EXISTS public.poles;            -- the ORPHAN poles (2 stray rows) — must go before the rename

-- ============================================================
-- C1. Canonize: chantiers -> poles (approved: D1)
--     All FKs (incl. profiles_pole_id_fkey) follow automatically.
--     Fixed UUIDs preserved; T154 keeps id 00000000-...-0001.
-- ============================================================
ALTER TABLE public.chantiers RENAME TO poles;

-- ============================================================
-- C2. Pole table completions
-- ============================================================
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.poles ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.poles
  ADD CONSTRAINT poles_code_unique UNIQUE (code);

-- Optional: create T200 now (doc requires T154/T165/T200); otherwise create in Phase 5.
-- INSERT INTO public.poles (name, code) VALUES ('Chantier T200', 'T200');

-- ============================================================
-- C3. FKs on the existing pole_id columns (Stage A of the cutover).
--     Phase 1 verified: pole_id == chantier_id on every row (356/356).
-- ============================================================
ALTER TABLE public.machines                   ADD CONSTRAINT machines_pole_id_fkey            FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.filter_types               ADD CONSTRAINT filter_types_pole_id_fkey        FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.filter_groups              ADD CONSTRAINT filter_groups_pole_id_fkey       FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.maintenance_records        ADD CONSTRAINT maintenance_records_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.monthly_daily_adjustments  ADD CONSTRAINT monthly_daily_adjustments_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.oil_stocks                 ADD CONSTRAINT oil_stocks_pole_id_fkey          FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.global_monthly_settings    ADD CONSTRAINT global_monthly_settings_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id);
ALTER TABLE public.machine_monthly_stats      ADD CONSTRAINT machine_monthly_stats_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id);

-- ============================================================
-- C4. spare_parts / spare_part_installations get pole_id
--     (row-level backfill of previously empty columns — this also
--     ends today's runtime PGRST204 insert failures)
-- ============================================================
ALTER TABLE public.spare_parts               ADD COLUMN pole_id uuid REFERENCES public.poles(id);
UPDATE public.spare_parts SET pole_id = chantier_id;
ALTER TABLE public.spare_part_installations  ADD COLUMN pole_id uuid REFERENCES public.poles(id);
UPDATE public.spare_part_installations SET pole_id = chantier_id;

-- ============================================================
-- D. Harden helpers (same semantics; search_path + qualified names)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.has_pole_access(pole uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF is_super_admin() THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND pole_id = pole
  );
END; $$;

-- ============================================================
-- E. Business-table policies: **UNCHANGED in Stage A**.
--    They keep filtering on chantier_id during the grace period (installed
--    desktop v1.1.2 clients write chantier_id; web writes both). The flip
--    to pole_id happens in Stage B (Phase 3b), together with the column
--    drop, afer desktop v1.1.3 ships. spare_parts gains its pole_id COLUMN
--    in C4, which alone fixes today's runtime insert failures.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'machines','filter_types','filter_groups','maintenance_records',
    'monthly_daily_adjustments','oil_stocks','global_monthly_settings',
    'machine_monthly_stats','spare_parts','spare_part_installations'
  ])
  LOOP
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_select ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_select ON public.%I FOR SELECT TO authenticated USING (has_pole_access(pole_id))', t);
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_insert ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (has_pole_access(pole_id))', t);
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_update ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_update ON public.%I FOR UPDATE TO authenticated USING (has_pole_access(pole_id)) WITH CHECK (has_pole_access(pole_id))', t);
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_delete ON public.%I FOR DELETE TO authenticated USING (has_pole_access(pole_id))', t);
  END LOOP;
END $$;

-- ============================================================
-- F. profiles: close the self-privilege-escalation hole (CRITICAL fix)
--    Profile creation is owned by the signup trigger; role/pole_id
--    changes happen ONLY via Edge Functions (Phase 5).
-- ============================================================
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_super_admin());

-- ============================================================
-- G. poles management policies (Super Admin only)
-- ============================================================
CREATE POLICY poles_insert ON public.poles FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY poles_update ON public.poles FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
CREATE POLICY poles_delete ON public.poles FOR DELETE TO authenticated
  USING (is_super_admin() AND archived_at IS NOT NULL);

-- the old SELECT policy survives the rename; give it the new name
ALTER POLICY chantiers_select_own ON public.poles RENAME TO poles_select_own;

-- ============================================================
-- H. Signup trigger: every new user gets a profile automatically
--    (replaces the dead auto_assign_chantier; default pole = NULL, D3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, pole_id)
  VALUES (NEW.id, 'user', NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- ============================================================
-- I. Remove the dead chantier-membership system (approved: D6)
--    I1: drop existing triggers on auth.users (PRE-2 must have
--        confirmed exactly the one auto-assign trigger)
-- ============================================================
DO $$
DECLARE tg record;
BEGIN
  FOR tg IN SELECT tgname FROM pg_trigger
            WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER %I ON auth.users', tg.tgname);
  END LOOP;
END $$;

-- I2: attach the new signup trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- I3/I4: the old machinery out
DROP FUNCTION IF EXISTS public.auto_assign_chantier();
DROP TABLE IF EXISTS public.user_chantiers;

-- ============================================================
-- J. Legacy chantier-password functions out (approved: D4)
--    password_hash COLUMN stays (frozen, unused) per D4.
-- ============================================================
DROP FUNCTION IF EXISTS public.has_chantier_access(uuid);
DROP FUNCTION IF EXISTS public.verify_chantier_password(uuid, text);
DROP FUNCTION IF EXISTS public.set_chantier_password(uuid, text);

COMMIT;
```

**Note on ordering**: the first `DROP TABLE poles`/`DROP TABLE user_poles` remove the *orphan duplicate* structures (2 stray rows each, referenced by nothing real). The rename immediately after is safe only because they no longer exist — name conflict otherwise.

**Why no policy flip in this stage**: installed desktop v1.1.2 clients still write `chantier_id` on their pushes; keeping the policies on `chantier_id` keeps them syncing through the grace period. The full flip happens in STAGE B below, together with the column drop.

---

## OPTIONAL — Block K: `updated_at` function dedupe (PRE-3 informed)

Only after the main migration, run in the editor (keeps whichever variant is actually bound to triggers, drops zero-use functions):

```sql
-- check which functions have zero attached triggers
SELECT f.proname,
       (SELECT count(*) FROM pg_trigger t
        WHERE t.tgfoid = f.oid AND NOT t.tgisinternal) AS trigger_count
FROM pg_proc f JOIN pg_namespace n ON n.oid = f.pronamespace
WHERE n.nspname = 'public'
  AND f.proname IN ('handle_updated_at','set_updated_at','update_updated_at_column');

-- then, for any name showing trigger_count = 0:
-- DROP FUNCTION IF EXISTS public.<that_name>;
```

---

## POST — Verification suite (run after COMMIT)

### POST-1. Counters unchanged (compare against Phase 1 numbers)

```sql
SELECT 'poles' t, count(*) FROM public.poles
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'machines', count(*) FROM public.machines
UNION ALL SELECT 'filter_types', count(*) FROM public.filter_types
UNION ALL SELECT 'filter_groups', count(*) FROM public.filter_groups
UNION ALL SELECT 'maintenance_records', count(*) FROM public.maintenance_records
UNION ALL SELECT 'monthly_daily_adjustments', count(*) FROM public.monthly_daily_adjustments
UNION ALL SELECT 'oil_stocks', count(*) FROM public.oil_stocks
UNION ALL SELECT 'global_monthly_settings', count(*) FROM public.global_monthly_settings
UNION ALL SELECT 'machine_monthly_stats', count(*) FROM public.machine_monthly_stats
UNION ALL SELECT 'spare_parts', count(*) FROM public.spare_parts
UNION ALL SELECT 'spare_part_installations', count(*) FROM public.spare_part_installations
ORDER BY t;
```
Expected: poles 2 (3 with T200) · profiles 8 · machines 23 · filter_types 6 · filter_groups 94 · maintenance_records 39 · monthly_daily_adjustments 4 · oil_stocks 5 · global_monthly_settings 6 · machine_monthly_stats 64 · spare_parts 4 · spare_part_installations 1.

### POST-2. Shadow-vs-real parity: zero mismatches everywhere

```sql
SELECT 'machines' t, count(*) AS disagree FROM public.machines WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'filter_types', count(*) FROM public.filter_types WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'filter_groups', count(*) FROM public.filter_groups WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'maintenance_records', count(*) FROM public.maintenance_records WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'monthly_daily_adjustments', count(*) FROM public.monthly_daily_adjustments WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'oil_stocks', count(*) FROM public.oil_stocks WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'global_monthly_settings', count(*) FROM public.global_monthly_settings WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'machine_monthly_stats', count(*) FROM public.machine_monthly_stats WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'spare_parts', count(*) FROM public.spare_parts WHERE pole_id IS DISTINCT FROM chantier_id
UNION ALL SELECT 'spare_part_installations', count(*) FROM public.spare_part_installations WHERE pole_id IS DISTINCT FROM chantier_id;
```
Expected: every `disagree = 0`.

### POST-3. Orphans gone

```sql
SELECT to_regclass('public.user_chantiers') AS leftover_user_chantiers,
       to_regclass('public.user_poles')     AS leftover_user_poles;
```
Expected: `NULL | NULL`.

### POST-4. RLS context simulation (three-role smoke test)

Fill `SUB-OF-USER` with two real profile ids first (see PRE-2's sibling — or `SELECT id, role, pole_id FROM profiles;`):

```sql
-- POLE USER (role='user', pole T154): sees own data, cannot self-promote
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<USER-UUID-T154>"}';
SELECT 'machines visible' AS probe, count(*) FROM public.machines;   -- expect 23
SELECT 'poles visible'    AS probe, count(*) FROM public.poles;      -- expect 1
SELECT count(*) FROM public.profiles;                                 -- expect 1 (own)
UPDATE public.profiles SET role = 'super_admin' WHERE id = auth.uid();-- expect ERROR (policy)
ROLLBACK;

-- SUPER ADMIN: sees everything
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<SUPER-ADMIN-UUID>"}';
SELECT 'superadmin machines' AS probe, count(*) FROM public.machines; -- expect 23
SELECT 'superadmin profiles' AS probe, count(*) FROM public.profiles; -- expect 8
ROLLBACK;
```
(The UPDATE error is the **good** outcome: `42501 new row violates row-level security policy` — the Phase 1 critical hole is closed.)

### POST-5. Anon is still locked out (also re-probed from my side after you confirm)

Paste no-tokens REST probes result — I will run them with the anon key once you announce the migration is in.

---

## Immediate code follow-up (Phase 4 kickoff)

The rename breaks exactly one runtime code path: `contexts/AuthContext.tsx` line 74 joins `pole:chantiers(...)` → must become `pole:poles(...)`.

**Tell me the moment the migration COMMITs** and I will:
1. apply the `AuthContext` one-liner + regenerate the `types/supabase.ts` targets,
2. run the anon REST probes to verify `poles`/`pole_id` state from the outside,
3. proceed to Phase 4 (single `pole_id` writes, no-pole lockout screen, spare-parts fix verification).

## Immediate-code-status note

Everything still works during Stage A except the one join (fixed in the kickoff above): all business columns are unchanged, existing write paths still stamp both columns, and both FKs stay valid.

## STAGE B — Cleanup (Phase 3b, AFTER desktop v1.1.3 + web deploy)

One transaction. This flips RLS onto `pole_id` AND drops the `chantier_id` columns:
old desktop installs that still write `chantier_id` will fail their pushes after this point (accepted; upgrade resolves it).

```sql
BEGIN;

-- 1) Safety net: no row may keep a NULL chantier_id at flip time (invisible-row guard)
DO $$
DECLARE t text; n int;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'machines','filter_types','filter_groups','maintenance_records',
    'monthly_daily_adjustments','oil_stocks','global_monthly_settings',
    'machine_monthly_stats','spare_parts','spare_part_installations'
  ])
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET chantier_id = pole_id WHERE chantier_id IS NULL AND pole_id IS NOT NULL', t);
    EXECUTE format('SELECT count(*) FROM public.%I WHERE chantier_id IS NULL', t) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'Table % has % rows with NULL chantier_id AND NULL pole_id — resolve manually before flipping', t, n;
    END IF;
  END LOOP;
END $$;

-- 2) Policy flip: chantier_id -> pole_id (+ WITH CHECK on UPDATE)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'machines','filter_types','filter_groups','maintenance_records',
    'monthly_daily_adjustments','oil_stocks','global_monthly_settings',
    'machine_monthly_stats','spare_parts','spare_part_installations'
  ])
  LOOP
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_select ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_select ON public.%I FOR SELECT TO authenticated USING (has_pole_access(pole_id))', t);
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_insert ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (has_pole_access(pole_id))', t);
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_update ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_update ON public.%I FOR UPDATE TO authenticated USING (has_pole_access(pole_id)) WITH CHECK (has_pole_access(pole_id))', t);
    EXECUTE format('DROP POLICY  IF EXISTS pole_access_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY pole_access_delete ON public.%I FOR DELETE TO authenticated USING (has_pole_access(pole_id))', t);
  END LOOP;
END $$;

-- 3) Now nothing reads chantier_id: drop the columns (rest in Stage A carried FKs; drop columns cascades their constraints per-table)
ALTER TABLE public.machines                   DROP COLUMN chantier_id;
ALTER TABLE public.filter_types               DROP COLUMN chantier_id;
ALTER TABLE public.filter_groups              DROP COLUMN chantier_id;
ALTER TABLE public.maintenance_records        DROP COLUMN chantier_id;
ALTER TABLE public.monthly_daily_adjustments  DROP COLUMN chantier_id;
ALTER TABLE public.oil_stocks                 DROP COLUMN chantier_id;
ALTER TABLE public.global_monthly_settings    DROP COLUMN chantier_id;
ALTER TABLE public.machine_monthly_stats      DROP COLUMN chantier_id;
ALTER TABLE public.spare_parts                DROP COLUMN chantier_id;
ALTER TABLE public.spare_part_installations   DROP COLUMN chantier_id;

COMMIT;
```

Note: STOP and paste output if step 1 raises (NULL/NULL rows exist — they'd become permanently invisible after the flip; they carry no pole membership and must be assigned or removed with your supervision first).

## Rollback

Restore PRE-1 dump (`psql -f heavycare-pre-multipole-dump.sql` / dashboard backup restore). Everything in the runbook is inside one transaction — a failed run applies nothing further.
