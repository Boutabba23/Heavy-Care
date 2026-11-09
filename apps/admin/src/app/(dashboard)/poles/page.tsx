'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pole, PoleStats } from '@/types';

/**
 * Poles CRUD. Privileges: RLS on `poles` allows super admins to
 * insert/update/delete (delete only when archived_at IS NOT NULL), so all
 * operations here run directly from the browser with the anon key — no
 * service-role key is ever used client-side.
 */
export default function PolesPage() {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [stats, setStats] = useState<PoleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notif, setNotif] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);

  // create form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  // edits: pole_id -> {code, name}
  const [edits, setEdits] = useState<Record<string, { code: string; name: string }>>({});

  const say = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, kind });
    setTimeout(() => setNotif(null), 4000);
  };

  const load = async () => {
    try {
      const polesRes = await supabase
        .from('poles')
        .select('id, code, name, created_at, updated_at, archived_at')
        .order('code');
      if (polesRes.error) throw polesRes.error;

      const dbPoles = (polesRes.data ?? []) as Pole[];
      setPoles(dbPoles);
      setEdits(Object.fromEntries(dbPoles.map((p) => [p.id, { code: p.code, name: p.name }])));

      // Per-pole stats computed client-side (super admin reads across poles).
      const [usersRes, machinesRes] = await Promise.all([
        supabase.from('profiles').select('id, pole_id'),
        supabase.from('machines').select('id, pole_id'),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (machinesRes.error) throw machinesRes.error;

      setStats(
        dbPoles.map((p) => ({
          pole_id: p.id,
          pole_code: p.code,
          pole_name: p.name,
          machine_count: machinesRes.data?.filter((m: any) => m.pole_id === p.id).length ?? 0,
          maintenance_count: 0,
          user_count: usersRes.data?.filter((u: any) => u.pole_id === p.id).length ?? 0,
        }))
      );
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createPole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setBusy(true);
    const id = crypto.randomUUID();
    const { error } = await supabase
      .from('poles')
      .insert({ id, code: newCode.trim().toUpperCase(), name: newName.trim() });
    setBusy(false);
    if (error) {
      say(`Création refusée : ${error.message}`, 'err');
      return;
    }
    setNewCode('');
    setNewName('');
    say(`Pôle ${newCode.trim().toUpperCase()} créé.`);
    await load();
  };

  const saveEdits = async (pol: Pole) => {
    const edit = edits[pol.id];
    if (!edit) return;
    const { error } = await supabase
      .from('poles')
      .update({ code: edit.code.trim().toUpperCase(), name: edit.name.trim() })
      .eq('id', pol.id);
    if (error) {
      say(`Modification refusée : ${error.message}`, 'err');
      return;
    }
    say('Pôle modifié.');
    await load();
  };

  const setArchived = async (pol: Pole, archived: boolean) => {
    const { error } = await supabase
      .from('poles')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', pol.id);
    if (error) {
      say(`Operation refusée : ${error.message}`, 'err');
      return;
    }
    say(archived ? 'Pôle archivé (désactivé).' : 'Pôle réactivé.');
    await load();
  };

  const deleteArchived = async (pol: Pole) => {
    if (!confirm(`Supprimer définitivement le pôle ${pol.code} ? Action irréversible.`)) return;
    const { error } = await supabase.from('poles').delete().eq('id', pol.id);
    if (error) {
      // The RLS policy deletes archived poles only; also reject if anything
      // still references this pole (FKs) — surface the message.
      say(`Suppression refusée : ${error.message}`, 'err');
      return;
    }
    say('Pôle supprimé.');
    await load();
  };

  if (loading) return <div className="loading">Chargement des pôles...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Gestion des pôles</h1>
        <span>Chaque enregistrement métier appartient à exactement un pôle.</span>
      </div>

      <form className="inline-form card" onSubmit={createPole} style={{ marginBottom: 20 }}>
        <h2 style={{ width: '100%' }}>Nouveau pôle</h2>
        <label className="field">
          Code
          <input
            className="input"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="T200"
            maxLength={12}
          />
        </label>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>
          Nom
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Chantier Sud"
          />
        </label>
        <button className="btn" disabled={busy || !newCode.trim() || !newName.trim()}>
          {busy ? 'Création...' : 'Créer le pôle'}
        </button>
      </form>

      {err && <div className="error card" style={{ marginBottom: 16 }}>Erreur : {err}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Utilisateurs</th>
              <th>Engins</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {poles.map((pol) => {
              const stat = stats.find((s) => s.pole_id === pol.id);
              const edit = edits[pol.id] ?? { code: pol.code, name: pol.name };
              return (
                <tr key={pol.id}>
                  <td>
                    {pol.archived_at ? (
                      <span className="pole-chip" style={{ opacity: 0.6 }}>{pol.code}</span>
                    ) : (
                      <input
                        className="input"
                        style={{ width: 90 }}
                        value={edit.code}
                        onChange={(e) => setEdits((s) => ({ ...s, [pol.id]: { ...edit, code: e.target.value } }))}
                      />
                    )}
                  </td>
                  <td>
                    {pol.archived_at ? (
                      pol.name
                    ) : (
                      <input
                        className="input"
                        style={{ width: 220 }}
                        value={edit.name}
                        onChange={(e) => setEdits((s) => ({ ...s, [pol.id]: { ...edit, name: e.target.value } }))}
                      />
                    )}
                  </td>
                  <td>{stat?.user_count ?? 0}</td>
                  <td>{stat?.machine_count ?? 0}</td>
                  <td>{pol.archived_at ? <span className="badge archived">Archivé</span> : <span className="badge ok">Actif</span>}</td>
                  <td>
                    <div className="row-actions">
                      {!pol.archived_at && (
                        <>
                          <button className="btn small" onClick={() => saveEdits(pol)}>Enregistrer</button>
                          <button className="btn small secondary" onClick={() => setArchived(pol, true)}>Archiver</button>
                        </>
                      )}
                      {pol.archived_at && (
                        <>
                          <button className="btn small secondary" onClick={() => setArchived(pol, false)}>Réactiver</button>
                          <button className="btn small danger-btn" onClick={() => deleteArchived(pol)}>Supprimer</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {poles.length === 0 && !err && <div className="empty">Aucun pôle — créez le premier ci-dessus.</div>}
      </div>

      {notif && <div className={`notif ${notif.kind === 'ok' ? 'ok' : 'err'}`}>{notif.msg}</div>}
    </>
  );
}
