"use client";

import React, { useMemo, useState } from "react";
import { Machine, MaintenanceRecord } from "../types";
import Select from "./ui/Select";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import Label from "./ui/Label";

// ConfirmationDialog removed: inline editing replaces separate adjustments UI
import { Toast } from "../types";

interface Props {
  machines: Machine[];
  maintenanceRecords: MaintenanceRecord[];
  adjustments?: { id: string; machine_id: string; date: string; work_hours?: number; downtime_hours: number; panne_hours: number; notes?: string | null }[];
  onCreateAdjustment?: (adj: { machineId: string; date: string; workHours?: number; downtimeHours: number; panneHours: number; notes?: string }) => Promise<any> | any;
  onUpdateAdjustment?: (id: string, changes: Partial<{ workHours?: number; downtimeHours: number; panneHours: number; notes?: string }>) => Promise<boolean> | boolean;
  onDeleteAdjustment?: (id: string) => Promise<boolean> | boolean;
  addToast?: (t: Omit<Toast, 'id'>) => void;
}

// This view computes a daily summary for a given machine and month.
const MonthlySummaryView: React.FC<Props> = ({ machines, maintenanceRecords, adjustments, onCreateAdjustment, onUpdateAdjustment, onDeleteAdjustment, addToast }) => {
  // Inline editing state for daily rows
  const [editingKey, setEditingKey] = useState<string | null>(null); // ISO date string when editing a row
  const [editValues, setEditValues] = useState<{ workHours: number | string; downtimeHours: number | string; panneHours: number | string }>({ workHours: 0, downtimeHours: 0, panneHours: 0 });
  const [isSavingAdj, setIsSavingAdj] = useState(false);
  // optimistic edits keyed by ISO date string (YYYY-MM-DD)
  const [optimisticEdits, setOptimisticEdits] = useState<Record<string, { workHours: number; downtimeHours: number; panneHours: number; pending: boolean; id?: string }>>({});
  // handlers will be set by parent via props; they exist on props via closure below
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || "");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7)); // YYYY-MM

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || null;

  // Period runs from 20th of previous month to 19th of selected month
  const { periodStart, periodEnd, dateRange } = useMemo(() => {
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) return { periodStart: null as null | Date, periodEnd: null as null | Date, dateRange: [] as string[] };
    // selected month is YYYY-MM, we want period from (month-1)-20 to month-19
    const start = new Date(year, monthNum - 2, 20); // JS months 0-indexed: monthNum-2 is previous month
    const end = new Date(year, monthNum - 1, 19);
    const range: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      range.push(d.toISOString().slice(0,10));
    }
    return { periodStart: start, periodEnd: end, dateRange: range };
  }, [month]);

  const recordsForMachineAndMonth = useMemo(() => {
    if (!periodStart || !periodEnd) return [] as MaintenanceRecord[];
    return maintenanceRecords.filter(r => {
      if (r.machineId !== selectedMachineId) return false;
      const d = new Date(r.date);
      return d >= periodStart && d <= periodEnd;
    });
  }, [maintenanceRecords, selectedMachineId, periodStart, periodEnd]);

  // For now we derive simplistic hour summaries from serviceHours deltas between consecutive maintenance records.
  // This is a heuristic: real data may need explicit fields for downtime/panne hours.
  const dailySummary = useMemo(() => {
    const [year, monthNum] = month.split("-").map(Number);
  if (!selectedMachine || !year || !monthNum) return [] as { date: string; workHours: number; downtimeHours: number; panneHours: number }[];

    // Build a map of records by ISO date string
    const recMap: Record<string, MaintenanceRecord[]> = {};
    recordsForMachineAndMonth.forEach(r => {
      const iso = new Date(r.date).toISOString().slice(0,10);
      if (!recMap[iso]) recMap[iso] = [];
      recMap[iso].push(r);
    });

    // Build a map of adjustments for this machine and month (including work hours), keyed by ISO date
    const adjMap: Record<string, { work_hours?: number; downtime_hours: number; panne_hours: number }[]> = {};
    (adjustments || []).forEach((adj: any) => {
      if (adj.machine_id !== selectedMachineId) return;
      const iso = new Date(adj.date).toISOString().slice(0,10);
      // ensure adjustment is within period
      if (!dateRange.includes(iso)) return;
      if (!adjMap[iso]) adjMap[iso] = [];
      adjMap[iso].push({ work_hours: adj.work_hours || 0, downtime_hours: adj.downtime_hours || 0, panne_hours: adj.panne_hours || 0 });
    });

    const results: { date: string; workHours: number; downtimeHours: number; panneHours: number }[] = [];
    if (!periodStart || !periodEnd) return [] as any;

    // For each date in dateRange, compute metrics
    dateRange.forEach(dateIso => {
      // maintenance records for that exact date
      const recs = recMap[dateIso] || [];
      let workHours = 0;
      let downtimeHours = 0;
      let panneHours = 0;

      if (recs.length >= 2) {
        recs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const first = recs[0];
        const last = recs[recs.length - 1];
        workHours = last.serviceHours - first.serviceHours;
        if (workHours < 0) workHours = 0;
      }

  const dayAdj = adjMap[dateIso] || [];
  const adjWork = dayAdj.reduce((s,a) => s + (a.work_hours || 0), 0);
  const adjDowntime = dayAdj.reduce((s,a) => s + (a.downtime_hours || 0), 0);
  const adjPanne = dayAdj.reduce((s,a) => s + (a.panne_hours || 0), 0);

      const recDowntime = recs.reduce((s, r) => s + ((r as any).downtimeHours || 0), 0);
      const recPanne = recs.reduce((s, r) => s + ((r as any).panneHours || 0), 0);

      workHours = workHours + adjWork;
      downtimeHours = adjDowntime + recDowntime;
      panneHours = adjPanne + recPanne;

      results.push({ date: dateIso, workHours, downtimeHours, panneHours });
    });

    return results as any;
  }, [recordsForMachineAndMonth, selectedMachine, adjustments, dateRange, periodStart, periodEnd]);

  // Apply optimistic edits to the daily summary for display/totals
  const displayedDailySummary = useMemo(() => {
    return dailySummary.map((d: { date: string; workHours: number; downtimeHours: number; panneHours: number }) => {
      const o = optimisticEdits[d.date];
      if (o) return { date: d.date, workHours: o.workHours, downtimeHours: o.downtimeHours, panneHours: o.panneHours };
      return d;
    });
  }, [dailySummary, optimisticEdits]);

  const totals = useMemo(() => {
    return displayedDailySummary.reduce((acc: { workHours: number; downtimeHours: number; panneHours: number }, cur: { workHours: number; downtimeHours: number; panneHours: number }) => ({
      workHours: acc.workHours + cur.workHours,
      downtimeHours: acc.downtimeHours + cur.downtimeHours,
      panneHours: acc.panneHours + cur.panneHours,
    }), { workHours: 0, downtimeHours: 0, panneHours: 0 });
  }, [displayedDailySummary]);

  // Compute totals per machine for the selected month
  const perMachineTotals = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return [] as { machineId: string; code: string; designation: string; workHours: number; downtimeHours: number; panneHours: number }[];

    return machines.map(machine => {
      const records = maintenanceRecords.filter(r => {
        if (r.machineId !== machine.id) return false;
        const d = new Date(r.date);
        return periodStart && periodEnd ? (d >= periodStart && d <= periodEnd) : false;
      }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let workHours = 0;
      let downtimeHours = 0;
      let panneHours = 0;

      if (records.length >= 2) {
        // approximate total work hours by difference between last and first serviceHours
        const first = records[0];
        const last = records[records.length - 1];
        workHours = Math.max(0, last.serviceHours - first.serviceHours);
      }

      // include adjustments for this machine in the month
      const machineAdjustments = (adjustments || []).filter((adj: any) => {
        if (adj.machine_id !== machine.id) return false;
        const iso = new Date(adj.date).toISOString().slice(0,10);
        return dateRange.includes(iso);
      });
      const adjWork = machineAdjustments.reduce((s: number, a: any) => s + (a.work_hours || 0), 0);
      const adjDowntime = machineAdjustments.reduce((s: number, a: any) => s + (a.downtime_hours || 0), 0);
      const adjPanne = machineAdjustments.reduce((s: number, a: any) => s + (a.panne_hours || 0), 0);

      workHours = workHours + adjWork;
      downtimeHours = downtimeHours + adjDowntime;
      panneHours = panneHours + adjPanne;

      // include optimistic edits if they belong to the currently selected machine
      if (machine.id === selectedMachineId) {
        const optimisticSum = Object.entries(optimisticEdits).reduce((s, [dateStr, o]) => {
          if (!dateRange.includes(dateStr)) return s;
          return {
            workHours: s.workHours + o.workHours,
            downtimeHours: s.downtimeHours + o.downtimeHours,
            panneHours: s.panneHours + o.panneHours,
          };
        }, { workHours: 0, downtimeHours: 0, panneHours: 0 });

        workHours += optimisticSum.workHours;
        downtimeHours += optimisticSum.downtimeHours;
        panneHours += optimisticSum.panneHours;
      }

      return { machineId: machine.id, code: machine.code, designation: machine.designation, workHours, downtimeHours, panneHours };
    });
  }, [machines, maintenanceRecords, month]);

  const grandTotals = useMemo(() => {
    return perMachineTotals.reduce((acc, cur) => ({
      workHours: acc.workHours + cur.workHours,
      downtimeHours: acc.downtimeHours + cur.downtimeHours,
      panneHours: acc.panneHours + cur.panneHours,
    }), { workHours: 0, downtimeHours: 0, panneHours: 0 });
  }, [perMachineTotals]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div>
          <Label>Engin</Label>
          <Select value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
            {machines.map(m => <option key={m.id} value={m.id}>{m.code} - {m.designation}</option>)}
          </Select>
        </div>
        <div>
          <Label>Mois</Label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div>
          <Button onClick={() => { /* nothing for now */ }}>Actualiser</Button>
        </div>
      </div>

      <div className="p-4 border rounded">
        <h3 className="font-semibold">Synthèse Mensuelle - {month}</h3>

        {/* Adjustments UI removed — inline editing is available in the daily summary table below */}

        

  <h4 className="font-semibold">Synthèse journalière</h4>
  <div className="mb-2 text-sm text-muted-foreground">Engin sélectionné: <span className="font-medium">{selectedMachine ? `${selectedMachine.code} - ${selectedMachine.designation}` : '—'}</span></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jour</TableHead>
              <TableHead>Heures travail</TableHead>
              <TableHead>Heures chômage</TableHead>
              <TableHead>Heures panne</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedDailySummary.map((row: any) => {
              const adjForDay = (adjustments || []).find(a => a.machine_id === selectedMachineId && new Date(a.date).toISOString().slice(0,10) === row.date);
              const dayLabel = new Date(row.date + 'T00:00:00Z').getDate();
              return (
                <TableRow key={row.date}>
                  <TableCell>{dayLabel}</TableCell>
                  <TableCell>
                    {editingKey === row.date ? (
                      <Input type="number" value={String(editValues.workHours)} onChange={e => setEditValues(v => ({ ...v, workHours: e.target.value }))} />
                    ) : (
                      row.workHours
                    )}
                  </TableCell>
                  <TableCell>
                    {editingKey === row.date ? (
                      <Input type="number" value={String(editValues.downtimeHours)} onChange={e => setEditValues(v => ({ ...v, downtimeHours: e.target.value }))} />
                    ) : (
                      row.downtimeHours
                    )}
                  </TableCell>
                  <TableCell>
                    {editingKey === row.date ? (
                      <Input type="number" value={String(editValues.panneHours)} onChange={e => setEditValues(v => ({ ...v, panneHours: e.target.value }))} />
                    ) : (
                      row.panneHours
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingKey === row.date ? (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" disabled={isSavingAdj} onClick={async () => {
                          if (!selectedMachine) return;
                          // apply optimistic edit keyed by ISO date
                          const optimistic = { workHours: Number(editValues.workHours || 0), downtimeHours: Number(editValues.downtimeHours || 0), panneHours: Number(editValues.panneHours || 0), pending: true, id: adjForDay ? (adjForDay as any).id : undefined };
                          setOptimisticEdits(o => ({ ...o, [row.date]: optimistic }));
                          setEditingKey(null);
                          try {
                            const dateStr = row.date;
                            const payload = { machineId: selectedMachine.id, date: dateStr, workHours: optimistic.workHours, downtimeHours: optimistic.downtimeHours, panneHours: optimistic.panneHours };
                            if (adjForDay && onUpdateAdjustment) {
                              await onUpdateAdjustment((adjForDay as any).id, payload as any);
                              setOptimisticEdits(o => ({ ...o, [row.date]: { ...o[row.date], pending: false } }));
                            } else if (onCreateAdjustment) {
                              const res = await onCreateAdjustment(payload as any);
                              if (res && (res as any).id) {
                                setOptimisticEdits(o => ({ ...o, [row.date]: { ...o[row.date], pending: false, id: (res as any).id } }));
                              } else {
                                setOptimisticEdits(o => ({ ...o, [row.date]: { ...o[row.date], pending: false } }));
                              }
                            } else {
                              setOptimisticEdits(o => ({ ...o, [row.date]: { ...o[row.date], pending: false } }));
                            }
                            if (addToast) addToast({ type: 'success', title: 'Ajustement sauvegardé', description: '' });
                          } catch (e) {
                            // revert optimistic edit on failure
                            setOptimisticEdits(o => {
                              const copy = { ...o };
                              delete copy[row.date];
                              return copy;
                            });
                            if (addToast) addToast({ type: 'error', title: 'Erreur', description: 'Erreur lors de la sauvegarde' });
                          }
                        }}>Enregistrer</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingKey(null); }}>Annuler</Button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingKey(row.date);
                          setEditValues({ workHours: row.workHours, downtimeHours: row.downtimeHours, panneHours: row.panneHours });
                        }}>Modifier</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="font-bold">{totals.workHours}</TableCell>
              <TableCell className="font-bold">{totals.downtimeHours}</TableCell>
              <TableCell className="font-bold">{totals.panneHours}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Totals per machine moved below daily summary */}
        <div className="mb-4 mt-4">
          <h4 className="font-medium mb-2">Totaux par Engin</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Engin</TableHead>
                <TableHead>Heures travail</TableHead>
                <TableHead>Heures chômage</TableHead>
                <TableHead>Heures panne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perMachineTotals.map(m => (
                <TableRow key={m.machineId}>
                  <TableCell>{m.code} - {m.designation}</TableCell>
                  <TableCell>{m.workHours}</TableCell>
                  <TableCell>{m.downtimeHours}</TableCell>
                  <TableCell>{m.panneHours}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">Total Général</TableCell>
                <TableCell className="font-bold">{grandTotals.workHours}</TableCell>
                <TableCell className="font-bold">{grandTotals.downtimeHours}</TableCell>
                <TableCell className="font-bold">{grandTotals.panneHours}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">Note: Cette synthèse utilise les heures de service reportées dans les enregistrements de maintenance. Pour des mesures précises de chômage/panne, ajoutez des champs explicites ou ajustements manuels.</div>
    </div>
  );
};

export default MonthlySummaryView;
