'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Pole } from '@/types';

type Counts = {
  poles: number | '…';
  users: number | '…';
  machines: number | '…';
  maintenance: number | '…';
};

export default function AdminDashboardPage() {
  const { pole } = useAuth();
  const [counts, setCounts] = useState<Counts>({ poles: '…', users: '…', machines: '…', maintenance: '…' });
  const [poles, setPoles] = useState<Pole[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [polesRes, profilesRes, machinesRes, maintenanceRes] = await Promise.all([
          supabase.from('poles').select('id, code, name, archived_at').order('code'),
          supabase.from('profiles').select('id, role, pole_id'),
          supabase.from('machines').select('id, pole_id'),
          supabase.from('maintenance_records').select('id'),
        ]);
        if (polesRes.error) throw polesRes.error;
        if (profilesRes.error) throw profilesRes.error;
        if (machinesRes.error) throw machinesRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;

        setPoles((polesRes.data ?? []) as Pole[]);
        setCounts({
          poles: polesRes.data?.length ?? 0,
          users: profilesRes.data?.length ?? 0,
          machines: machinesRes.data?.length ?? 0,
          maintenance: maintenanceRes.data?.length ?? 0,
        });
      } catch (e: any) {
        setErr(e.message ?? String(e));
      }
    })();
  }, [pole]);

  return (
    <>
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <span>Vue d&apos;ensemble multi-pôles — les données restent isolées par pôle via RLS.</span>
      </div>

      {err && <div className="error card">Erreur de chargement : {err}</div>}

      <div className="stat-grid">
        <div className="card"><div className="value">{counts.poles}</div><div className="label">Pôles</div></div>
        <div className="card"><div className="value">{counts.users}</div><div className="label">Utilisateurs</div></div>
        <div className="card"><div className="value">{counts.machines}</div><div className="label">Engins</div></div>
        <div className="card"><div className="value">{counts.maintenance}</div><div className="label">Enregistrements de maintenance</div></div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Pôles</h2>
        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Statut</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {poles.map((pol) => (
                <tr key={pol.id}>
                  <td><span className="pole-chip">{pol.code}</span></td>
                  <td>{pol.name}</td>
                  <td>{pol.archived_at ? <span className="badge archived">Archivé</span> : <span className="badge ok">Actif</span>}</td>
                  <td style={{ color: 'var(--muted)' }}>{pol.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
