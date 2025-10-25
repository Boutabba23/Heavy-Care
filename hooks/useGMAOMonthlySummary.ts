"use client";
import { useState, useEffect, useMemo } from 'react';
import { Machine } from '../types';

// Define the types for the data from the GMAO API
interface GMAOMachine {
  code: string;
  name: string;
  chantier: string ;
}

interface GMAOEtat {
  numero: string;
  date: string;
  codeMateriel: string;
  etat: number;
  carburant: number;
  lubrifiant: number;
  h_service: number;
  h_panne: number;
  h_chomage: number;
  compteur: number;
}

const API_BASE_URL = 'http://localhost:4000/api';

export const useGMAOMonthlySummary = () => {
  const [machines, setMachines] = useState<GMAOMachine[]>([]);
  const [etatRecords, setEtatRecords] = useState<GMAOEtat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGMAOData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [machinesRes, etatRes] = await Promise.all([
          fetch(`${API_BASE_URL}/machines`),
          fetch(`${API_BASE_URL}/etat`),
        ]);

        if (!machinesRes.ok) {
          throw new Error('Failed to fetch machines from GMAO API');
        }
        if (!etatRes.ok) {
          throw new Error('Failed to fetch etat from GMAO API');
        }

        const machinesData = await machinesRes.json();
        const etatData = await etatRes.json();

        setMachines(machinesData);
        setEtatRecords(etatData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGMAOData();
  }, []);

  // Transform GMAO data to be compatible with MonthlySummaryView
  const transformedMachines = useMemo((): Machine[] => {
    return machines.map(m => ({
      id: m.code, // Using code as id
      code: m.code,
      designation: m.name,
      marque: '', // Not available in GMAO API
      type: '', // Not available in GMAO API
      serialNumber: '', // Not available in GMAO API
      registrationNumber: '', // Not available in GMAO API
      serviceHours: 0, // This will be calculated from etat records
      assignedFilters: [], // Not available in GMAO API
    }));
  }, [machines]);

  const { maintenanceRecords, adjustments } = useMemo(() => {
    const maintenanceRecords: any[] = [];
    const adjustments: any[] = etatRecords.map(record => ({
      id: record.numero,
      machine_id: record.codeMateriel,
      date: record.date,
      work_hours: record.h_service,
      downtime_hours: record.h_chomage,
      panne_hours: record.h_panne,
      notes: `Compteur: ${record.compteur}, Carburant: ${record.carburant}, Lubrifiant: ${record.lubrifiant}`,
    }));
    return { maintenanceRecords, adjustments };
  }, [etatRecords]);


  return {
    machines: transformedMachines,
    maintenanceRecords,
    adjustments,
    isLoading,
    error,
    // Mock actions for now
    createDailyAdjustment: async (adj: any) => { console.log('createDailyAdjustment not implemented for GMAO', adj); return null; },
    updateDailyAdjustment: async (id: string, changes: any) => { console.log('updateDailyAdjustment not implemented for GMAO', id, changes); return true; },
    deleteDailyAdjustment: async (id: string) => { console.log('deleteDailyAdjustment not implemented for GMAO', id); return true; },
    addToast: (toast: any) => { console.log('addToast', toast); },
  };
};
