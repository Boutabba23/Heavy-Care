"use client";

import React, { useMemo, useState } from "react";
import { Machine, MaintenanceRecord } from "../types";
import Select from "./ui/Select";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import Label from "./ui/Label";

import ConfirmationDialog from "./ConfirmationDialog";
import { Toast } from "../types";

interface Props {
  machines: Machine[];
  maintenanceRecords: MaintenanceRecord[];
  adjustments?: { id: string; machine_id: string; date: string; downtime_hours: number; panne_hours: number; notes?: string | null }[];
  onCreateAdjustment?: (adj: { machineId: string; date: string; downtimeHours: number; panneHours: number; notes?: string }) => Promise<any> | any;
  onUpdateAdjustment?: (id: string, changes: Partial<{ downtimeHours: number; panneHours: number; notes?: string }>) => Promise<boolean> | boolean;
  onDeleteAdjustment?: (id: string) => Promise<boolean> | boolean;
  addToast?: (t: Omit<Toast, 'id'>) => void;
}

// This view computes a daily summary for a given machine and month.
const MonthlySummaryView: React.FC<Props> = ({ machines, maintenanceRecords, adjustments, onCreateAdjustment, onUpdateAdjustment, onDeleteAdjustment, addToast }) => {
  const [newAdjDay, setNewAdjDay] = useState<number | string>('1');
  const [newAdjDowntime, setNewAdjDowntime] = useState<number | string>(0);
  const [newAdjPanne, setNewAdjPanne] = useState<number | string>(0);
  const [newAdjNotes, setNewAdjNotes] = useState<string>('');
  const [editingAdjId, setEditingAdjId] = useState<string | null>(null);
  const [editingAdjValues, setEditingAdjValues] = useState<{ downtimeHours: number | string; panneHours: number | string; notes?: string }>({ downtimeHours: 0, panneHours: 0 });
  const [isSavingAdj, setIsSavingAdj] = useState(false);
  const [isDeletingAdjId, setIsDeletingAdjId] = useState<string | null>(null);
  const [confirmDeleteAdjId, setConfirmDeleteAdjId] = useState<string | null>(null);
  // handlers will be set by parent via props; they exist on props via closure below
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || "");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7)); // YYYY-MM

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || null;

  const daysInMonth = useMemo(() => {
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) return 0;
    return new Date(year, monthNum, 0).getDate();
  }, [month]);

  const recordsForMachineAndMonth = useMemo(() => {
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) return [] as MaintenanceRecord[];
    return maintenanceRecords.filter(r => {
      if (r.machineId !== selectedMachineId) return false;
      const d = new Date(r.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === monthNum;
    });
  }, [maintenanceRecords, selectedMachineId, month]);

  // For now we derive simplistic hour summaries from serviceHours deltas between consecutive maintenance records.
  // This is a heuristic: real data may need explicit fields for downtime/panne hours.
  const dailySummary = useMemo(() => {
    const [year, monthNum] = month.split("-").map(Number);
    if (!selectedMachine || !year || !monthNum) return [] as { day: number; workHours: number; downtimeHours: number; panneHours: number }[];

    // Build a map of date -> records
    const map: Record<number, MaintenanceRecord[]> = {};
    recordsForMachineAndMonth.forEach(r => {
      const d = new Date(r.date);
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(r);
    });

    // Build a map of adjustments for this machine and month
    const adjMap: Record<number, { downtime_hours: number; panne_hours: number }[]> = {};
    (adjustments || []).forEach((adj: any) => {
      if (adj.machine_id !== selectedMachineId) return;
      const d = new Date(adj.date);
      if (d.getFullYear() !== year || (d.getMonth() + 1) !== monthNum) return;
      const day = d.getDate();
      if (!adjMap[day]) adjMap[day] = [];
      adjMap[day].push({ downtime_hours: adj.downtime_hours || 0, panne_hours: adj.panne_hours || 0 });
    });

    const results = [] as { day: number; workHours: number; downtimeHours: number; panneHours: number }[];

    // naive approach: use serviceHours reported in records to approximate daily work hours when multiple records are present
    // If only one record exists for a day, we can't compute delta; treat as 0 for now.
    for (let d = 1; d <= daysInMonth; d++) {
      const recs = map[d] || [];
      let workHours = 0;
      let downtimeHours = 0;
      let panneHours = 0;

      if (recs.length >= 2) {
        // sort by time
        recs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const first = recs[0];
        const last = recs[recs.length - 1];
        workHours = last.serviceHours - first.serviceHours;
        if (workHours < 0) workHours = 0;
      }
      // Sum adjustments (if any) for the day
      const dayAdjustments = adjMap[d] || [];
      const adjDowntime = dayAdjustments.reduce((s, a) => s + (a.downtime_hours || 0), 0);
      const adjPanne = dayAdjustments.reduce((s, a) => s + (a.panne_hours || 0), 0);

      // Also include downtime/panne reported directly on maintenance records for the day
      const recDowntime = recs.reduce((s, r) => s + ((r as any).downtimeHours || 0), 0);
      const recPanne = recs.reduce((s, r) => s + ((r as any).panneHours || 0), 0);

      downtimeHours = adjDowntime + recDowntime;
      panneHours = adjPanne + recPanne;
      results.push({ day: d, workHours, downtimeHours, panneHours });
    }

    return results;
  }, [recordsForMachineAndMonth, selectedMachine, daysInMonth, adjustments]);

  const totals = useMemo(() => {
    return dailySummary.reduce((acc, cur) => ({
      workHours: acc.workHours + cur.workHours,
      downtimeHours: acc.downtimeHours + cur.downtimeHours,
      panneHours: acc.panneHours + cur.panneHours,
    }), { workHours: 0, downtimeHours: 0, panneHours: 0 });
  }, [dailySummary]);

  // Compute totals per machine for the selected month
  const perMachineTotals = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return [] as { machineId: string; code: string; designation: string; workHours: number; downtimeHours: number; panneHours: number }[];

    return machines.map(machine => {
      const records = maintenanceRecords.filter(r => {
        if (r.machineId !== machine.id) return false;
        const d = new Date(r.date);
        return d.getFullYear() === y && (d.getMonth() + 1) === m;
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

        <div className="mt-4 mb-4">
          <h4 className="font-medium mb-2">Ajustements journaliers (chômage / panne)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
            <div>
              <Label>Jour</Label>
              <Select value={String(newAdjDay)} onChange={e => setNewAdjDay(e.target.value)}>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Heures chômage</Label>
              <Input type="number" min="0" value={String(newAdjDowntime)} onChange={e => setNewAdjDowntime(e.target.value)} />
            </div>
            <div>
              <Label>Heures panne</Label>
              <Input type="number" min="0" value={String(newAdjPanne)} onChange={e => setNewAdjPanne(e.target.value)} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={newAdjNotes} onChange={e => setNewAdjNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-5 text-right">
              <Button disabled={isSavingAdj} onClick={async () => {
                if (!selectedMachine) return;
                setIsSavingAdj(true);
                try {
                  const day = parseInt(String(newAdjDay), 10);
                  const dateStr = `${month}-${String(day).padStart(2, '0')}`;
                  if (onCreateAdjustment) {
                    await onCreateAdjustment({ machineId: selectedMachine.id, date: dateStr, downtimeHours: Number(newAdjDowntime || 0), panneHours: Number(newAdjPanne || 0), notes: newAdjNotes || undefined });
                    if (addToast) addToast({ type: 'success', title: "Ajustement ajouté" , description: `Ajustement pour le ${dateStr} ajouté.` });
                  }
                  // reset
                  setNewAdjDowntime(0); setNewAdjPanne(0); setNewAdjNotes('');
                } catch (e) {
                  if (addToast) addToast({ type: 'error', title: 'Erreur', description: 'Erreur lors de l\'ajout' });
                } finally {
                  setIsSavingAdj(false);
                }
              }}>Ajouter l'ajustement</Button>
            </div>
          </div>

          {/* List existing adjustments for this machine/month */}
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jour</TableHead>
                  <TableHead>Chômage</TableHead>
                  <TableHead>Panne</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(adjustments || []).filter(a => a.machine_id === selectedMachineId && new Date(a.date).toISOString().startsWith(month)).map(adj => (
                  <TableRow key={adj.id}>
                    <TableCell>{new Date(adj.date).getDate()}</TableCell>
                    <TableCell>{adj.downtime_hours}</TableCell>
                    <TableCell>{adj.panne_hours}</TableCell>
                    <TableCell>{adj.notes || ''}</TableCell>
                    <TableCell className="text-right">
                      {editingAdjId === adj.id ? (
                        <div className="flex gap-2 items-center justify-end">
                          <Button size="sm" disabled={isSavingAdj} onClick={async () => {
                            // save
                            if (!onUpdateAdjustment) return;
                            setIsSavingAdj(true);
                            try {
                              const ok = await onUpdateAdjustment(adj.id, { downtimeHours: Number(editingAdjValues.downtimeHours || 0), panneHours: Number(editingAdjValues.panneHours || 0), notes: editingAdjValues.notes });
                              if (ok && addToast) addToast({ type: 'success', title: 'Ajustement modifié', description: '' });
                              setEditingAdjId(null);
                            } catch (e) {
                              if (addToast) addToast({ type: 'error', title: 'Erreur', description: 'Erreur lors de la modification' });
                            } finally {
                              setIsSavingAdj(false);
                            }
                          }}>Enregistrer</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingAdjId(null); setEditingAdjValues({ downtimeHours: 0, panneHours: 0, notes: '' }); }}>Annuler</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingAdjId(adj.id); setEditingAdjValues({ downtimeHours: (adj as any).downtime_hours ?? 0, panneHours: (adj as any).panne_hours ?? 0, notes: (adj as any).notes ?? '' }); }}>Modifier</Button>
                          <Button variant="ghost" size="icon" disabled={!!isDeletingAdjId} onClick={() => { setConfirmDeleteAdjId(adj.id); }}>
                            Suppr
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Confirmation dialog for delete */}
          <ConfirmationDialog isOpen={!!confirmDeleteAdjId} onClose={() => setConfirmDeleteAdjId(null)} title="Confirmer la suppression" description="Voulez-vous vraiment supprimer cet ajustement ?" onConfirm={async () => {
            if (!confirmDeleteAdjId) return;
            setIsDeletingAdjId(confirmDeleteAdjId);
            try {
              if (onDeleteAdjustment) {
                const ok = await onDeleteAdjustment(confirmDeleteAdjId);
                if (ok && addToast) addToast({ type: 'success', title: 'Ajustement supprimé' , description: '' });
              }
            } catch (e) {
              if (addToast) addToast({ type: 'error', title: 'Erreur', description: 'Erreur lors de la suppression' });
            } finally {
              setIsDeletingAdjId(null);
              setConfirmDeleteAdjId(null);
            }
          }} />
        </div>

        <div className="mb-4">
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

        <h4 className="font-semibold">Synthèse journalière</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jour</TableHead>
              <TableHead>Heures travail</TableHead>
              <TableHead>Heures chômage</TableHead>
              <TableHead>Heures panne</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailySummary.map(row => (
              <TableRow key={row.day}>
                <TableCell>{row.day}</TableCell>
                <TableCell>{row.workHours}</TableCell>
                <TableCell>{row.downtimeHours}</TableCell>
                <TableCell>{row.panneHours}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="font-bold">{totals.workHours}</TableCell>
              <TableCell className="font-bold">{totals.downtimeHours}</TableCell>
              <TableCell className="font-bold">{totals.panneHours}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">Note: Cette synthèse utilise les heures de service reportées dans les enregistrements de maintenance. Pour des mesures précises de chômage/panne, ajoutez des champs explicites ou ajustements manuels.</div>
    </div>
  );
};

export default MonthlySummaryView;
