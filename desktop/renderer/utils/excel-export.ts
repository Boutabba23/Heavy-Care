import * as XLSX from 'xlsx';
import { MonthlyDistributionResult } from '../types/monthly-stats';
import { Machine } from '../types';

export const exportMonthlySynthesisToExcel = (
    month: string,
    machines: Machine[],
    distributionResults: Map<string, MonthlyDistributionResult | null>
) => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Prepare data for the sheet
    const data: any[] = [];

    // Header
    data.push(['Synthèse Mensuelle', month]);
    data.push([]); // Empty row
    data.push([
        'Code',
        'Désignation',
        'Heures Début',
        'Heures Fin',
        'Total Heures',
        'Heures Travail',
        'Heures Sup.',
        'Heures Chômage',
        'Heures Panne',
        'Heures Intempérie'
    ]);

    machines.forEach(m => {
        const res = distributionResults.get(m.id);
        if (!res) {
            // Add empty row or partial data if we have stats but no result?
            // For now just skip or add basic info
            data.push([m.code, m.designation, '-', '-', '-', '-', '-', '-', '-', '-']);
            return;
        }

        data.push([
            m.code,
            m.designation,
            // We don't have start/end hours inside distributionResult directly, 
            // but we have totalActiveHours. 
            // Ideally we should pass stat info too. 
            // For now, let's just show totals.
            '-', // Start (need to pass stat map to populate this if wanted)
            '-', // End
            res.totalActiveHours.toFixed(1),
            res.totalWorkHours.toFixed(1),
            res.totalOvertimeHours.toFixed(1),
            res.totalIdleHours.toFixed(1),
            res.totalBreakdownHours.toFixed(1),
            res.totalIntemperieHours.toFixed(1)
        ]);
    });

    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Styling (minimal with basic xlsx, for pro styling use xlsx-js-style if available but standard xlsx is robust)
    // Auto-width columns
    const wscols = [
        { wch: 10 }, // Code
        { wch: 30 }, // Designation
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Synthèse");

    // Save File
    XLSX.writeFile(wb, `Synthese_Mensuelle_${month}.xlsx`);
};
