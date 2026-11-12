-- ============================================================================
-- User role: strict read-only enforcement (RLS)
-- Branch: stage-b-pole-cutover | Date: 2026-11-12
--
-- Goal: `user` role can only SELECT. All INSERT / UPDATE / DELETE on business
-- tables are restricted to super_admin (any pole) or pole_admin (own pole).
-- Read access is unchanged: has_pole_access(pole_id) still governs SELECT.
--
-- Applied via: npx supabase db execute --project-ref yklkxvvoeovksyslcfjy --file supabase/user-readonly-rls.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. can_write_pole(): write access helper.
--    SECURITY DEFINER + empty search_path (same hardening as has_pole_access,
--    which needed public.-qualified calls after the runtime bug fix).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_write_pole(target_pole_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Super admins can write anywhere.
  IF public.is_super_admin() THEN RETURN TRUE; END IF;

  -- Pole admins can write only inside their assigned pole.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'pole_admin' AND profiles.pole_id = $1
  );
END; $$;

-- ---------------------------------------------------------------------------
-- 2. Swap write policies on all 10 business tables.
--    SELECT policies (pole_access_select / has_pole_access) stay untouched.
--    USING on UPDATE/DELETE must ALSO be can_write_pole, otherwise a `user`
--    could mutate rows it can merely see.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'machines','filter_types','filter_groups','maintenance_records',
    'monthly_daily_adjustments','oil_stocks','global_monthly_settings',
    'machine_monthly_stats','spare_parts','spare_part_installations'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS pole_access_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS pole_access_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS pole_access_delete ON public.%I', t);

    EXECUTE format(
      'CREATE POLICY pole_access_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_pole(pole_id))', t);
    EXECUTE format(
      'CREATE POLICY pole_access_update ON public.%I FOR UPDATE TO authenticated USING (public.can_write_pole(pole_id)) WITH CHECK (public.can_write_pole(pole_id))', t);
    EXECUTE format(
      'CREATE POLICY pole_access_delete ON public.%I FOR DELETE TO authenticated USING (public.can_write_pole(pole_id))', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Unchanged by design (do not touch):
--    - profiles: select own + super_admin; NO insert/update policies
--      (role & pole changes only via the admin-users Edge Function).
--    - poles: super_admin only (insert/update/delete).
-- ---------------------------------------------------------------------------
