"use client";

import React, { useMemo, useState } from "react";
import { Machine, MaintenanceRecord } from "../types";
import Select from "./ui/Select";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import Label from "./ui/Label";

interface Props {
  machines: Machine[];
  maintenanceRecords: MaintenanceRecord[];
}

// This view computes a daily summary for a given machine and month.
const MonthlySummaryView: React.FC<Props> = ({ machines, maintenanceRecords }) => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || "");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7)); // YYYY-MM

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || null;

  const daysInMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return 0;
    return new Date(y, m, 0).getDate();
  }, [month]);

  const recordsForMachineAndMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return [] as MaintenanceRecord[];
    return maintenanceRecords.filter(r => {
      if (r.machineId !== selectedMachineId) return false;
      const d = new Date(r.date);
      return d.getFullYear() === y && (d.getMonth() + 1) === m;
    });
  }, [maintenanceRecords, selectedMachineId, month]);

  // For now we derive simplistic hour summaries from serviceHours deltas between consecutive maintenance records.
  // This is a heuristic: real data may need explicit fields for downtime/panne hours.
  const dailySummary = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!selectedMachine || !y || !m) return [] as { day: number; workHours: number; downtimeHours: number; panneHours: number }[];

    // Build a map of date -> records
    const map: Record<number, MaintenanceRecord[]> = {};
    recordsForMachineAndMonth.forEach(r => {
      const d = new Date(r.date);
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(r);
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

      // TODO: in future, support explicit downtime/panne fields in maintenance records or manual adjustments.

      results.push({ day: d, workHours, downtimeHours, panneHours });
    }

    return results;
  }, [recordsForMachineAndMonth, selectedMachine, daysInMonth]);

  const totals = useMemo(() => {
    return dailySummary.reduce((acc, cur) => ({
      workHours: acc.workHours + cur.workHours,
      downtimeHours: acc.downtimeHours + cur.downtimeHours,
      panneHours: acc.panneHours + cur.panneHours,
    }), { workHours: 0, downtimeHours: 0, panneHours: 0 });
  }, [dailySummary]);

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
        <h3 className="font-semibold">Synthèse journalière - {month}</h3>
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
