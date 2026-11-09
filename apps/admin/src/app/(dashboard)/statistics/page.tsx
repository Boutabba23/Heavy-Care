'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pole } from '@/types';

type Row = { pole: string; label: string; machines: number; records: number; downtime: number };

/**
 * Cross-pole statistics for the super admin. All counts come from the
 * business tables (RLS lets super admins read every pole); they are
 * aggregated client-side — the data volume stays small (356 rows at the
 * time of writing), no server aggregation needed for now.
 */
export default function StatisticsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [polesRes, machinesRes, recordsRes, adjustmentsRes] = await Promise.all([
          supabase.from('poles').select('id, code, name').order('code'),
          supabase.from('machines').select('pole_id'),
          supabase.from('maintenance_records').select('pole_id, downtime_hours'),
          supabase.from('monthly_daily_adjustments').select('pole_id, downtime_hours'),
        ]);
        if (polesRes.error) throw polesRes.error;
        if (machinesRes.error) throw machinesRes.error;
        if (recordsRes.error) throw recordsRes.error;
        if (adjustmentsRes.error) throw adjustmentsRes.error;

        setRows(
          ((polesRes.data ?? []) as Pole[]).map((pol) => ({
            pole: pol.code,
            label: pol.name,
            machines: machinesRes.data?.filter((m: any) => m.pole_id === pol.id).length ?? 0,
            records: recordsRes.data?.filter((r: any) => r.pole_id === pol.id).length ?? 0,
            downtime:
              adjustmentsRes.data
                ?.filter((a: any) => a.pole_id === pol.id)
                .reduce((sum: number, a: any) => sum + (a.downtime_hours ?? 0), 0) ?? 0,
          }))
        );
      } catch (e: any) {
        setErr(e.message ?? String(e));
      }
    })();
  }, []);

  const bar = (value: number, max: number) => (
    <div className="bar-row">
      <div className="bar-track">
        <div className="bar-fill" style={{ width: max > 0 ? `${Math.max(2, (value / max) * 100)}%` : '2%' }} />
      </div>
    </div>
  );

  const maxMachines = Math.max(...(rows?.map((r) => r.machines) ?? [0]), 1);
  const maxRecords = Math.max(...(rows?.map((r) => r.records) ?? [0]), 1);
  const maxDowntime = Math.max(...(rows?.map((r) => r.downtime) ?? [0]), 1);

  if (err) return <div className="error card">Erreur : {err}</div>;
  if (!rows) return <div className="loading">Calcul des statistiques...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Statistiques</h1>
        <span>Comparaison entre pôles — agrégée côté client (lecture super admin).</span>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Engins par pôle</h2>
          {rows.map((r) => (
            <div key={r.pole}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <strong>{r.pole}</strong><span>{r.machines}</span>
              </div>
              {bar(r.machines, maxMachines)}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Maintenances par pôle</h2>
          {rows.map((r) => (
            <div key={r.pole}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <strong>{r.pole}</strong><span>{r.records}</span>
              </div>
              {bar(r.records, maxRecords)}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Heures d&apos;immobilisation (réglages journaliers)</h2>
          {rows.map((r) => (
            <div key={r.pole}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <strong>{r.pole}</strong><span>{r.downtime.toFixed(1)} h</span>
              </div>
              {bar(r.downtime, maxDowntime)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
