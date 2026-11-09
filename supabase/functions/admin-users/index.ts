// Edge Function: admin-users
//
// Single privileged gateway for the admin panel's user management. The
// service-role key lives ONLY here (server-side); the browser sends the
// caller's personal session JWT and nothing else. Every request is:
//   1. JWT-verified (platform verify_jwt + explicit getUser),
//   2. role-checked against `profiles` (must be super_admin),
// before any action runs.
//
// Deploy (once, then after each change):
//   supabase functions deploy admin-users --project-ref yklkxvvoeovksyslcfjy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // ---- authenticate the CALLER (not service role yet) ----
  const authz = req.headers.get('Authorization') ?? '';
  const jwt = authz.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Jeton manquant.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller?.user) return json({ error: 'Jeton invalide.' }, 401);

  const { data: callerProfile, error: profErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.user.id)
    .single();
  if (profErr || !callerProfile) return json({ error: 'Profil introuvable.' }, 403);
  if (callerProfile.role !== 'super_admin') {
    return json({ error: 'Réservé aux super admins.' }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps JSON invalide.' }, 400);
  }
  const action: string = body?.action ?? '';

  try {
    switch (action) {
      // -------------------------------------------------------------
      // list: auth.users merged with profiles (id → role / pole_id)
      // -------------------------------------------------------------
      case 'list': {
        const accounts: any[] = [];
        let page = 1;
        for (;;) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) throw toMsg(error);
          for (const u of data.users) {
            accounts.push(u);
            if (data.users.length < 200) break;
          }
          if (!data.users || data.users.length < 200 || page >= 20) break;
          page += 1;
        }

        const { data: profiles, error: pErr } = await admin
          .from('profiles')
          .select('id, role, pole_id, poles(code)')
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (pErr) throw toMsg(pErr);
        const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        const result = accounts.map((u: any) => {
          const prof: any = byId.get(u.id) ?? null;
          return {
            id: u.id,
            email: u.email ?? null,
            role: prof?.role ?? 'user',
            pole_id: prof?.pole_id ?? null,
            pole_code: prof?.poles?.code ?? null,
            email_confirmed: !!u.email_confirmed_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
            created_at: u.created_at ?? null,
          };
        });
        return json(result);
      }

      // -------------------------------------------------------------
      // create: auth.user + profile role/pole (join in one call)
      // -------------------------------------------------------------
      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        const role = String(body.role ?? 'user');
        const poleId = body.pole_id ? String(body.pole_id) : null;

        if (!email || !email.includes('@')) return json({ error: 'Email invalide.' }, 400);
        if (password.length < 6) return json({ error: 'Mot de passe trop court (6 caractères minimum).' }, 400);
        if (!['user', 'pole_admin', 'super_admin'].includes(role)) {
          return json({ error: 'Rôle invalide.' }, 400);
        }
        if (poleId) {
          const { data: pole, error: pErr } = await admin
            .from('poles').select('id, archived_at').eq('id', poleId).maybeSingle();
          if (pErr) throw toMsg(pErr);
          if (!pole) return json({ error: 'Pôle introuvable.' }, 400);
          if (pole.archived_at) return json({ error: 'Pôle archivé — réactivez-le avant attribution.' }, 400);
        }

        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // created by an admin: no confirmation mail loop
        });
        if (cErr) throw toMsg(cErr);

        // handle_new_user fires on INSERT INTO auth.users, so a profile row
        // already exists with role 'user'; merge the requested role/pole in.
        const { error: uErr } = await admin.from('profiles').upsert({
          id: created.user!.id,
          role,
          pole_id: poleId,
        });
        if (uErr) throw toMsg(uErr);

        return json({ ok: true, id: created.user!.id });
      }

      // -------------------------------------------------------------
      // set_role (guarded: cannot leave zero super admins)
      // -------------------------------------------------------------
      case 'set_role': {
        const userId = String(body.user_id ?? '');
        const role = String(body.role ?? '');
        if (!userId) return json({ error: 'user_id manquant.' }, 400);
        if (!['user', 'pole_admin', 'super_admin'].includes(role)) {
          return json({ error: 'Rôle invalide.' }, 400);
        }

        const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
        if (!target) return json({ error: 'Profil introuvable.' }, 404);
        if (target.role === 'super_admin' && role !== 'super_admin') {
          const { count } = await admin
            .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin');
          if ((count ?? 0) <= 1) {
            return json({ error: 'Impossible : au moins un super admin doit rester.' }, 400);
          }
        }

        const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
        if (error) throw toMsg(error);
        return json({ ok: true });
      }

      // -------------------------------------------------------------
      // assign_pole (null = "compte sans pôle" until assigned)
      // -------------------------------------------------------------
      case 'assign_pole': {
        const userId = String(body.user_id ?? '');
        const poleId = body.pole_id ? String(body.pole_id) : null;
        if (!userId) return json({ error: 'user_id manquant.' }, 400);

        if (poleId) {
          const { data: pole, error: pErr } = await admin
            .from('poles').select('id, archived_at').eq('id', poleId).maybeSingle();
          if (pErr) throw toMsg(pErr);
          if (!pole) return json({ error: 'Pôle introuvable.' }, 400);
          if (pole.archived_at) return json({ error: 'Pôle archivé — réactivez-le avant attribution.' }, 400);
        }

        const { error } = await admin.from('profiles').update({ pole_id: poleId }).eq('id', userId);
        if (error) throw toMsg(error);
        return json({ ok: true });
      }

      // -------------------------------------------------------------
      // delete_user (guarded: cannot delete the last super admin)
      // -------------------------------------------------------------
      case 'delete_user': {
        const userId = String(body.user_id ?? '');
        if (!userId) return json({ error: 'user_id manquant.' }, 400);
        if (userId === caller.user.id) return json({ error: 'Impossible de supprimer votre propre compte ici.' }, 400);

        const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
        if (target?.role === 'super_admin') {
          const { count } = await admin
            .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin');
          if ((count ?? 0) <= 1) {
            return json({ error: 'Impossible : au moins un super admin doit rester.' }, 400);
          }
        }

        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw toMsg(error);
        return json({ ok: true });
      }

      default:
        return json({ error: `Action inconnue : ${action}` }, 400);
    }
  } catch (e) {
    console.error('admin-users error', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function toMsg(e: any): string {
  return e?.message ?? String(e);
}
