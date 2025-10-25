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

        // Filter machines by chantier 'T154'
        const filteredMachines = machinesData.filter((machine: GMAOMachine) => machine.chantier === 'T154');

        setMachines(filteredMachines);
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
      date: new Date(record.date).toISOString().slice(0, 10),
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
    createDailyAdjustment: async (adj: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/etat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: adj.date,
                    codeMateriel: adj.machineId,
                    h_service: adj.workHours,
                    h_chomage: adj.downtimeHours,
                    h_panne: adj.panneHours,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create adjustment');
            }
            const newAdjustmentResult = await response.json();

            const newEtatRecord: GMAOEtat = {
                numero: newAdjustmentResult.numero,
                date: adj.date,
                codeMateriel: adj.machineId,
                h_service: adj.workHours,
                h_chomage: adj.downtimeHours,
                h_panne: adj.panneHours,
                etat: 0, 
                carburant: 0,
                lubrifiant: 0,
                compteur: 0,
            };

            setEtatRecords(prevRecords => [...prevRecords, newEtatRecord]);

            return newAdjustmentResult;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    },
    updateDailyAdjustment: async (id: string, changes: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/etat/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    h_service: changes.workHours,
                    h_chomage: changes.downtimeHours,
                    h_panne: changes.panneHours,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update adjustment');
            }
            
            setEtatRecords(prevRecords => 
                prevRecords.map(record => {
                    if (record.numero === id) {
                        return {
                            ...record,
                            h_service: changes.workHours,
                            h_chomage: changes.downtimeHours,
                            h_panne: changes.panneHours,
                        };
                    }
                    return record;
                })
            );

            return await response.json();
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    },
    deleteDailyAdjustment: async (id: string) => { console.log('deleteDailyAdjustment not implemented for GMAO', id); return true; },
    addToast: (toast: any) => { console.log('addToast', toast); },
  };
};
