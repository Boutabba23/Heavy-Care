# Phase 2 — Architecture Design (Multi-Pole)

Design based on the Phase 1 audit of the **actual** schema and data. Nothing here is implemented until you approve it.
Existing-safety rule honored throughout: existing rows are never rewritten — because they are already correct.

---

## 0. Audit conclusions this design rests on

| Fact from Phase 1 | Design consequence |
|---|---|
| `chantiers` (codes T154/T165, fixed UUIDs `000...001/002`) holds every real pole; `profiles.pole_id → chantiers`; all 19 FKs point at it | Canonize `chantiers` as the pole table — **zero data migration for existing records** |
| All 172 business rows already belong to T154 | Migration = verification only, no UPDATEs |
| `pole_id` columns on business tables are shadow copies of `chantier_id` (356/356 equal, 0 resolve to `poles`), referenced by no policy and no FK | Turn them into the real, FK-checked column; drop `chantier_id` after a coordinated code cutover |
| `poles` + `user_poles` tables are orphan June-era duplicates (2 stray poles, 2 stray links) | Drop both |
| `user_chantiers` exists only as a write target of `auto_assign_chantier()`, read by nothing | Drop table + trigger; replace with a `profiles`-creating trigger |
| `profiles_update_own` / `profiles_insert_own` allow self-granting `super_admin` | Self-escalation hole — remove client write paths entirely |
| Static-export clients cannot safely hold the service-role key | Privileged user/pole-user operations go through **Supabase Edge Functions** |

---

## 1. Final database schema

### 1.1 `chantiers` → renamed to `poles` (canonization)

```sql
-- Single rename; every FK, including profiles_pole_id_fkey, follows automatically.
ALTER TABLE public.chantiers RENAME TO poles;
```

Post-rename `poles`:

| column | type | notes |
|---|---|---|
| id | uuid PK | existing values kept (`00000000-...-0001` = T154 etc.) |
| name | text | |
| **code** | text UNIQUE NOT NULL | add UNIQUE if not already (verify in Phase 3) |
| created_at / updated_at | timestamptz | |
| **archived_at** | timestamptz NULL | **new** — soft-delete, replaces destructive removal |
| password_hash | text | **kept but frozen** (col 6 below) |

**T165 and T200 will be created as new poles** with fresh UUIDs; T154 keeps its existing UUID and all 172 rows. No business table changes hands.

### 1.2 Business tables — single ownership column

Target state (doc requirement: `pole_id REFERENCES poles`):

```
machines, filter_types, filter_groups, maintenance_records,
monthly_daily_adjustments, oil_stocks, global_monthly_settings,
machine_monthly_stats, spare_parts, spare_part_installations
  → one pole_id uuid FK → poles(id), plus their business columns
```

**Two-stage cutover** (required because installed desktop clients v1.1.2 still write `chantier_id`):

- **Stage A (Phase 3, database-only):**
  ```sql
  -- pole_id already exists on 8 of 10 tables with correct values:
  ALTER TABLE machines            ADD CONSTRAINT machines_pole_id_fkey            FOREIGN KEY (pole_id) REFERENCES poles(id);
  -- (same for filter_types, filter_groups, maintenance_records,
  --  monthly_daily_adjustments, oil_stocks, global_monthly_settings, machine_monthly_stats)
  ALTER TABLE spare_parts               ADD COLUMN pole_id uuid REFERENCES poles(id); pole_id = chantier_id
  ALTER TABLE spare_part_installations  ADD COLUMN pole_id uuid REFERENCES poles(id); pole_id = chantier_id
  -- RLS stays on chantier_id during the grace period: installed desktop
  -- v1.1.2 clients still write chantier_id; web writes both columns. Every
  -- app keeps working; the spare-parts insert bug is already fixed here
  -- (the missing pole_id COLUMN was the PGRST204 cause).
  ```
- **Stage B (Phase 3b, after desktop ≥1.1.3 is deployed):** one transaction — flip business policies onto `pole_id` (gaining the missing UPDATE `WITH CHECK`), then `DROP COLUMN chantier_id` on all ten tables, with a NULL-`chantier_id`/NULL-`pole_id` safety check first.
  Old desktop clients that survived the grace period keep working locally but their *pushes* would fail with unknown-column/RLS errors — acceptable, flagged, and reversible via the same backup.

### 1.3 `profiles`

| column | change |
|---|---|
| id | PK → auth.users (unchanged) |
| pole_id | FK → poles (follows rename) — **one pole per user, exactly** |
| role | **CHECK (role IN ('super_admin','pole_admin','user')) NOT NULL** |
| created_at | unchanged |

New trigger replaces `auto_assign_chantier`:

```sql
CREATE FUNCTION public.handle_new_user() RETURNS trigger
SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, pole_id)
  VALUES (NEW.id, 'user', NULL)   -- pole assigned by an admin afterwards
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

> Open decision D3: default-pole on signup. NULL (admin assigns; safest, current enforced model) vs auto-assign T154 (preserves the spirit of the old `auto_assign_chantier`, users can work immediately). NULL is recommended; your existing 8 profiles already carry assignments.

### 1.4 Dropped structures (destructive, listed explicitly for approval)

| Object | Why safe |
|---|---|
| `poles` table + its 2 stray rows | Orphan: no FK from any business data; its T154/T165 entries duplicate chantiers rows; RLS-blocked to everyone already |
| `user_poles` table + 2 rows | Only referenced the orphan poles; unused by any app code |
| `user_chantiers` table + 2 rows | Write-only target of the dead `auto_assign_chantier` trigger; no policy reads it |
| `has_chantier_access()` | Orphaned function (was user_chantiers-based); after drop, reference would dangle |
| `verify_chantier_password()` / `set_chantier_password()` + `chantiers.password_hash` handling | Dormant legacy chantier-login system, no UI caller; **recommendation: keep the function definitions out but leave the columns stored untouched** (column stays frozen; functions dropped) — see decision D4 |
| `profiles_update_own`, `profiles_insert_own` policies | The self-privilege-escalation hole; replacement in §3 |
| TWO of the three duplicate `updated_at` trigger variants | Housekeeping; keep the one actually bound to triggers (identity confirmed in Phase 3) |

**Rollback for the whole migration = restore from a pre-migration dump (§6).**

---

## 2. User-role and permission model

Three roles (unchanged from the doc), now with precise enforcement:

| Capability | Super Admin | Pole Admin | User |
|---|---|---|---|
| Read own business data | all poles | own pole | own pole |
| Write business data | all poles | own pole | own pole (preserves current behavior) |
| Create/`code`/archive/`delete` poles | ✅ (client-side, guarded by RLS) | ❌ | ❌ |
| Read other users in own pole | ✅ all | ✅ via Edge Function | ❌ |
| Create users / assign pole / change roles | ✅ via Edge Functions | ⭕ own-pole user management (Phase 5 option) | ❌ |
| Source of truth of role | `profiles.role` (settable ONLY server-side) | | |

Key rules:
- A user belongs to **exactly one pole** (`profiles.pole_id`, no membership tables anymore). Super Admins may have `pole_id = NULL`.
- Users never pick a pole; the session's profile determines it. Frontend shows the pole name it received at login.
- **No client can ever grant a role or reassign a pole** — see §3.

---

## 3. RLS policy design (final set)

Hardened helpers first:

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
END $$;

CREATE OR REPLACE FUNCTION public.has_pole_access(pole uuid) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF is_super_admin() THEN RETURN TRUE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND pole_id = pole);
END $$;
```

(Both bodies are the current ones — only `search_path = ''` + schema-qualified names added. No behavior change.)

### 3.1 Business tables (all 10, identical pattern, final state: `pole_id` FK-checked)

```sql
-- POLE_ACCESS_* on pole_id (flipped in Stage B, Phase 3b)
CREATE POLICY pole_access_select ON public.<table> FOR SELECT TO authenticated
  USING (has_pole_access(pole_id));
CREATE POLICY pole_access_insert ON public.<table> FOR INSERT TO authenticated
  WITH CHECK (has_pole_access(pole_id));
CREATE POLICY pole_access_update ON public.<table> FOR UPDATE TO authenticated
  USING (has_pole_access(pole_id))
  WITH CHECK (has_pole_access(pole_id));   -- added WITH CHECK (was missing)
CREATE POLICY pole_access_delete ON public.<table> FOR DELETE TO authenticated
  USING (has_pole_access(pole_id));
```

Changes vs today: column `chantier_id → pole_id`, and UPDATE gains `WITH CHECK` (today a user could move an existing row of their pole to any another pole via the SET clause — missing WITH CHECK means the re-pointed row isn't re-validated). During Stage A the same policies remain bound to `chantier_id` (grace period for the installed desktop clients).

### 3.2 `poles` (formerly chantiers)

```sql
-- SELECT: unchanged semantics (own pole or super admin) — the AuthContext join depends on it
CREATE POLICY poles_select ON public.poles FOR SELECT TO authenticated
  USING (is_super_admin() OR id = (SELECT pole_id FROM public.profiles WHERE id = auth.uid()));

-- Super Admin management (client-side, exploits role check only)
CREATE POLICY poles_insert ON public.poles FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
CREATE POLICY poles_update ON public.poles FOR UPDATE TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY poles_delete ON public.poles FOR DELETE TO authenticated
  USING (is_super_admin()
         AND archived_at IS NOT NULL);   -- only archived poles deletable
```

Hard deletes of poles with data additionally trip the FK from business tables — belt and braces; standard flow is `archived_at` soft-delete (non-code conflict with active users impossible).

### 3.3 `profiles` — the hole, closed

```sql
-- SELECT own row only (unchanged; needed at login and by the helpers above)
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_super_admin());
-- super admin may read all profiles from the client (admin UI list needs it)

-- NO INSERT policy  → profile is created by the signup trigger (service role owns it)
-- NO UPDATE policy  → role/pole changes ONLY via Edge Functions (service role)
```

Consequence: `UPDATE profiles SET role='super_admin' WHERE id = auth.uid()` is now **impossible from any client**. The Phase 1 critical finding is eliminated structurally, not patched.

### 3.4 Summary matrix

| Table | anon | User | Pole Admin | Super Admin |
|---|---|---|---|---|
| Business (×10) | none | own pole CRUD | own pole CRUD | all poles CRUD |
| poles | none | read own | read own | CRUD (delete only archived) |
| profiles | none | read own | read own (+handle via EF) | read all (write via EF) |
| auth.users | n/a | own session only | via Edge Function | via Edge Function |

---

## 4. Application architecture (monorepo)

```
Heavy-Care/
  apps/
    admin/        ← existing stub, completed in Phase 5 (Super Admin only)
    main/         ← *optional, see D2* — today the main app lives at repo root
  packages/       ← deferred (D2): only extracted once both apps share real code
  desktop/        ← Tauri 2 (already exists; Phase 4 brings it pole-aware)
```

### 4.1 Admin Application (`apps/admin`, `admin.<domain>`)

- Next.js static export (same stack as main), guarded by `isSuperAdmin` gate: any non-super-admin sees a hard rejection screen (UI gate + RLS both enforce).
- Client CRUD for poles (RLS § 3.2 grants super admin direct writes with their own anonymous-token session).
- **Everything user-related goes through Edge Functions** (running in Supabase = service-role key stays server-side):

| Edge Function | Verifies | Action |
|---|---|---|
| `admin-list-users` | JWT + is_super_admin | profiles ⋈ auth.users (emails) — per pole or global |
| `admin-create-user` | idem + payload validation | `auth.admin.createUser` + insert profile (via service role) — supports invite vs password |
| `admin-set-role` | idem | update `profiles.role` |
| `admin-assign-pole` | idem | update `profiles.pole_id` |
| `admin-archive-pole` | idem + pole emptiness check | set `archived_at` |

(Edge Functions read the Supabase service key from their own env; the client never sees it.)

### 4.2 Main Application (current root app, Phase 4)

- After login: fetch profile (`select *, pole:poles(...)`) — same as today, updated table alias; reject with a clear "Compte sans pôle — contactez votre administrateur" screen instead of silently running with `poleId = null` (today that state *creates invisible NULL-chantier rows*).
- Remove ALL dual stamping: insert payloads write **`pole_id` only** (the RLS-with CHECK now validates it); drop the `.eq('pole_id', …)` delete/update scoping duplicated from reads? **Keep `.eq('pole_id', poleId)` on writes** (harmless, defense in depth).
- `fetchData()` keeps unfiltered `select('*')` — RLS is the filter (server-side, as designed).
- Spare-parts fix rides on Stage A (client stops writing a nonexistent-style payload; after Stage A, `pole_id` exists on spare_parts and code writes only `pole_id`).
- `devMode` toggle restricted to UI/theme only (verify in Phase 4 that it never widens data).

### 4.3 Desktop (Phase 4 preview, no sync implementation change required)

- `db.rs`/`sync.rs` untouched: local SQLite auto-adopts new columns on pull (`ensure_columns`), see Phase 1 §5.
- Renderer copies of `useAppLogic` get the same Phase 4 edits (they ship the simame code).
- Release coordination: desktop v1.1.3 published **after** renderer updates land and before Stage B cleanup; grace-period strategy in §1.2 protects v1.1.2 installs meanwhile.
- Local/offline accounts remain local-only (expected behavior; RLS only governs the cloud copy).

---

## 5. Authentication flow between the two applications

Same Supabase project, same providers, independent sessions (localStorage is per-origin — no cross-subdomain SSO is configured; users sign in per app):

```
App A (admin)                                App B (main)
  login (email/password or Google)             login (email/password or Google)
       │                                             │
       ▼                                             ▼
  load profiles row                             load profiles row (pole:poles embed)
       │                                             │
  role == 'super_admin'?                        pole_id = session pole
     YES → admin UI                              NULL → "sans pôle" screen (blocked)
     NO  → rejection screen                      else → app with poleId everywhere
```

- Google OAuth adds each app's own origin to the Supabase redirect allowlist (one dashboard change, per app: `admin.example.com`, `app.example.com`).
- Extension: if shared SSO matters later, migrate Supabase JS storage to cookies on the parent domain — memo, not needed now.

---

## 6. Migration strategy (executes in Phase 3, after your approval)

**Ordering principle: non-destructive first, additive columns before policy flips, structural drops last, dump before everything.**

1. **Backup**: `supabase db dump` (schema + data) → file stored in repo-external storage. This is the single rollback artifact: `psql -f dump.sql` restores fully.
2. **Additive schema (Stage A)**: FKs + `pole_id` on spare tables + backfill `SET pole_id = chantier_id` (172 rows, no rewrites — values already equal); `poles.archived_at` on the (renamed) table; `code` UNIQUE; `profiles.role` CHECK; verify row-count invariants before/after.
3. **Rename**: `chantiers → poles` (FKs follow).
4. **Function hardening**: `is_super_admin()` / `has_pole_access()` re-created with `search_path = ''` + qualified names (same semantics).
5. **Policy flip**: business policies → `pole_id` (**moved to Stage B, Phase 3b** — see the runbook; Stage A keeps them on `chantier_id` for the desktop grace period); super-admin policies on `poles`; profiles hole closed (insert/update policies dropped, select own resp. own+superadmin).
6. **Triggers**: create `on_auth_user_created` → profiles; drop `auto_assign_chantier` + `user_chantiers`. Existing users: leave profiles untouched (already seeded).
7. **Drops** (require explicit approval, in this order): `user_poles` → `user_chantiers` → `has_chantier_access`/`verify_chantier_password`/`set_chantier_password` → duplicate updated_at trigger variants.
8. **Verification suite** (runs before declaring done):
   - row counts per table identical pre/post (172 business rows etc.);
   - anon probe: still 0 rows everywhere;
   - as a T154 test user: reads own data, writes succeed, other-pole attempt returns empty (Phase 6 will push this);
   - as super admin: all poles visible; profile UPDATE attempt rejected;
   - spare-part create/install works (today's runtime bug proven fixed).
9. **Stage B (deferred)**: drop `chantier_id` columns — executes only after desktop v1.1.3 + web code deployed; part of its own mini-migration with the same verification.

**What the T154 assignment requirement becomes**: nothing to do — existing records already carry `chantier_id = T154-fixed-uuid`; the FK + verification (step 2 & 8) *prove* it instead of rewriting it. New poles T165/T200 start empty (§1.1).

---

## 7. Open decisions (need your sign-off before Phase 3)

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Rename `chantiers` → `poles`?** (FKs follow automatically; client code references only `AuthContext`'s join alias) | **Yes** — aligns DB names with the app's own vocabulary (poles/pôle) and the original doc; code impact ~1 line + types regeneration |
| D2 | **Monorepo layout**: physically move the main app into `apps/main/` now, or keep it at repo root and only formalize `apps/admin`? | Keep main at root for now (avoids a repo-wide churn phase separate from features); introduce `packages/` only when real sharing starts. Decide explicitly — stagnating both options is the only bad outcome |
| D3 | **Signup default pole**: NULL (admin assigns)? | NULL, recommended |
| D4 | **Legacy chantier-password**: drop `verify/set_chantier_password` functions now, leave `password_hash` column (frozen) for one more cycle | Recommend both-drop later; keep columns frozen now |
| D5 | **Desktop grace period**: keep `chantier_id` columns through Stage A and drop only in Stage B (post-v1.1.3) | Yes — zero-risk window; confirm you accept old-install push breakage *after* the grace window |
| D6 | **`user_chantiers`/`user_poles`/orphan `poles` drops**: destructive (2+2+2 orphan rows lost) | Approve (backup covers rollback) |

---

## 8. Phase 3–6 preview (for context, executed later)

- **Phase 3** — the migration runbook from §6, applied with your go-ahead, dump-first.
- **Phase 4** — main app: single `pole_id` writes, blocked-without-pole screen, spare-parts fix, types regenerated (`supabase gen types`), desktop re-release.
- **Phase 5** — admin app finalization per §4.1 (Edge Functions + UI).
- **Phase 6** — isolation tests: cross-pole direct API attempts with user tokens, super-admin global visibility, pole-admin confinement, unauthorized inserts/updates, regression on existing flows (machines, filters, oil, maintenance, monthly, spare parts) + desktop sync round-trip.
