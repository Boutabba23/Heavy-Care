'use client';

import React, { useEffect, useState } from 'react';
import { adminRpc } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Pole } from '@/types';

type AdminUser = {
  id: string;
  email: string | null;
  role: 'super_admin' | 'pole_admin' | 'user';
  pole_id: string | null;
  pole_code: string | null;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  created_at: string | null;
};

/**
 * Users management. Email addresses and account creation live in
 * auth.users, which the anon key must never touch: every operation here
 * goes through the `admin-users` Edge Function (supabase/functions/),
 * which verifies the caller's role server-side and uses the service-role
 * key server-side only.
 */
export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notif, setNotif] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);

  // create form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'pole_admin' | 'super_admin'>('user');
  const [newPole, setNewPole] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const say = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, kind });
    setTimeout(() => setNotif(null), 4500);
  };

  const load = async () => {
    try {
      const list = await adminRpc<AdminUser[]>('list');
      setUsers(list);
      const polesRes = await supabase.from('poles').select('id, code, name').order('code');
      if (polesRes.error) throw polesRes.error;
      setPoles((polesRes.data ?? []) as Pole[]);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    setBusyId(id);
    try {
      await fn();
      say(okMsg);
      await load();
    } catch (e: any) {
      say(e.message ?? String(e), 'err');
    } finally {
      setBusyId(null);
    }
  };

  const setRole = (id: string, role: AdminUser['role']) =>
    act(id, () => adminRpc('set_role', { user_id: id, role }), 'Rôle modifié.');

  const setPole = (id: string, pole_id: string | null) =>
    act(id, () => adminRpc('assign_pole', { user_id: id, pole_id }), pole_id ? 'Pôle attribué.' : 'Pôle retiré.');

  const removeUser = (id: string, email: string | null) => {
    if (!confirm(`Supprimer définitivement le compte ${email ?? id} ? Action irréversible.`)) return;
    return act(id, () => adminRpc('delete_user', { user_id: id }), 'Compte supprimé.');
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminRpc('create', {
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        pole_id: newPole || null,
      });
      say(`Compte ${newEmail.trim()} créé.`);
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewPole('');
      setShowCreate(false);
      await load();
    } catch (e: any) {
      say(e.message ?? String(e), 'err');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Utilisateurs</h1>
          <span>Rôles et pôles — gérés côté serveur (la clé de service ne quitte jamais le serveur).</span>
        </div>
        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Annuler' : '+ Créer un compte'}
        </button>
      </div>

      {showCreate && (
        <form className="inline-form card" onSubmit={createUser} style={{ marginBottom: 20 }}>
          <h2 style={{ width: '100%' }}>Nouveau compte</h2>
          <label className="field" style={{ flex: 1, minWidth: 240 }}>
            Email
            <input
              className="input"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="prenom.nom@exemple.com"
            />
          </label>
          <label className="field">
            Mot de passe
            <input
              className="input"
              type="text"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6 caractères min."
            />
          </label>
          <label className="field">
            Rôle
            <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
              <option value="user">user</option>
              <option value="pole_admin">pole_admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </label>
          <label className="field">
            Pôle
            <select className="input" value={newPole} onChange={(e) => setNewPole(e.target.value)}>
              <option value="">— aucun —</option>
              {poles.filter((p) => !p.archived_at).map((pol) => (
                <option key={pol.id} value={pol.id}>{pol.code} — {pol.name}</option>
              ))}
            </select>
          </label>
          <button className="btn" disabled={creating}>
            {creating ? 'Création...' : 'Créer'}
          </button>
          <span style={{ width: '100%', color: 'var(--muted)', fontSize: '0.83rem' }}>
            Sans pôle, le nouveau compte voit « Compte sans pôle » dans l&apos;application jusqu&apos;à attribution.
          </span>
        </form>
      )}

      {err && <div className="error card" style={{ marginBottom: 16 }}>
        Edge Function « admin-users » injoignable : {err}
        <div style={{ color: 'var(--muted)', fontWeight: 400, marginTop: 6 }}>
          Déployez-la d&apos;abord : <code>supabase functions deploy admin-users --project-ref yklkxvvoeovksyslcfjy</code> (voir apps/admin/README.md).
        </div>
      </div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Rôle</th>
              <th>Pôle</th>
              <th>Email confirmé</th>
              <th>Dernière connexion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.email ?? <span className="unassigned">—</span>}</td>
                <td>
                  <select
                    className="input"
                    value={u.role}
                    disabled={busyId === u.id || u.id === me?.id}
                    onChange={(e) => setRole(u.id, e.target.value as AdminUser['role'])}
                  >
                    <option value="user">user</option>
                    <option value="pole_admin">pole_admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </td>
                <td>
                  {u.role === 'super_admin' ? (
                    <span className="unassigned">tous les pôles</span>
                  ) : (
                    <select
                      className="input"
                      value={u.pole_id ?? ''}
                      disabled={busyId === u.id}
                      onChange={(e) => setPole(u.id, e.target.value || null)}
                    >
                      <option value="">— aucun —</option>
                      {poles.map((pol) => (
                        <option key={pol.id} value={pol.id}>
                          {pol.code}{pol.archived_at ? ' (archivé)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>{u.email_confirmed ? <span className="badge ok">Oui</span> : <span className="badge wait">Non</span>}</td>
                <td style={{ color: 'var(--muted)' }}>
                  {u.last_sign_in_at ? u.last_sign_in_at.slice(0, 16).replace('T', ' ') : '—'}
                </td>
                <td>
                  <div className="row-actions">
                    {u.id !== me?.id && (
                      <button
                        className="btn small danger-btn"
                        disabled={busyId === u.id}
                        onClick={() => removeUser(u.id, u.email)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users && users.length === 0 && !err && <div className="empty">Aucun compte.</div>}
        {!users && !err && <div className="loading">Chargement des comptes...</div>}
      </div>

      {notif && <div className={`notif ${notif.kind === 'ok' ? 'ok' : 'err'}`}>{notif.msg}</div>}
    </>
  );
}
