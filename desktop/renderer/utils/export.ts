import Papa from 'papaparse';
import { Machine, FilterGroup } from '../types';

const downloadCSV = (csvString: string, filename: string) => {
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportMachinesToCSV = (machines: Machine[]) => {
  const dataToExport = machines.map(m => ({
    'Code': m.code,
    'Désignation': m.designation,
    'Marque': m.marque,
    'Type': m.type,
    'Heures de service': m.serviceHours,
  }));

  const csv = Papa.unparse(dataToExport);
  downloadCSV(csv, `export_engins_${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportFiltersToCSV = (filterGroups: FilterGroup[]) => {
  const dataToExport = filterGroups.flatMap(group =>
    group.references.map(ref => ({
      'Nom du Groupe': group.name,
      'Référence': ref.reference,
      'Fabricant': ref.manufacturer,
      'Prix (DA)': ref.price,
      'Stock': ref.stock,
      'Est Originale': ref.id === group.originalReferenceId ? 'Oui' : 'Non',
    }))
  );

  const csv = Papa.unparse(dataToExport);
  downloadCSV(csv, `export_inventaire_filtres_${new Date().toISOString().split('T')[0]}.csv`);
};