"use client";

import { useState, useEffect, useCallback } from "react";

import type { Database } from '../types/supabase';
import {
  Machine,
  FilterGroup,
  FilterType,
  View,
  FilterReference,
  AssignedFilter,
  Theme,
  MaintenanceRecord,
  Notification,
  Toast,
  StockUpdateInfo,
  CustomColors,
  SavedTheme,
  SparePart,
  SparePartInstallation,
  OilStock,
} from "../types";
import { useAuth } from "../contexts/AuthContext";
import { calculateNextMaintenance } from "../utils/maintenance";
import { supabase } from "../utils/supabase";
import { themes, ThemeInfo } from "../utils/themes";
// Type definitions for monthly daily adjustments
type MonthlyDailyAdjustmentInsert = Database['public']['Tables']['monthly_daily_adjustments']['Insert'];
type MonthlyDailyAdjustmentUpdate = Database['public']['Tables']['monthly_daily_adjustments']['Update'];
type MonthlyDailyAdjustmentRow = Database['public']['Tables']['monthly_daily_adjustments']['Row'];

interface ConfirmationDialogConfig {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return defaultValue;
    }

    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        return JSON.parse(storedValue);
      } catch (e) {
        if (key === "gestifiltres-theme" && !storedValue.startsWith('"')) {
          console.warn("Old theme format detected, migrating.");
          return storedValue as T;
        }
        throw e;
      }
    }
  } catch (error) {
    console.error(`Error processing localStorage key "${key}":`, error);
  }
  return defaultValue;
};

export const defaultCustomColors: CustomColors = {

  background: "#f8fafc",
  foreground: "#0f172a",
  foregroundSecondary: "#64748b",
  card: "#ffffff",
  cardForeground: "#0f172a",
  primary: "#f97316",
  primaryForeground: "#f8fafc",
  accent: "#f1f5f9",
  destructive: "#ef4444",
  destructiveForeground: "#f8fafc",
  border: "#e2e8f0",
  input: "#f1f5f9",
  ring: "#f97316",
  cardBorders: [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#0ea5e9",
  ],
};

export const useAppLogic = () => {
  const { poleId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [filterTypes, setFilterTypes] = useState<FilterType[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [oilStocks, setOilStocks] = useState<OilStock[]>([
    { id: "oil-1", type: "15W40 Moteur", currentLevel: 120, totalBarrels: 3, alertThreshold: 20 },
    { id: "oil-2", type: "Hydraulique 46", currentLevel: 15, totalBarrels: 1, alertThreshold: 30 },
    { id: "oil-3", type: "Transmission 80W90", currentLevel: 180, totalBarrels: 2, alertThreshold: 20 },
    { id: "oil-4", type: "Liquide de Refroidissement", currentLevel: 200, totalBarrels: 4, alertThreshold: 20 },
  ]);
  const [monthlyDailyAdjustments, setMonthlyDailyAdjustments] = useState<{
    id: string;
    machine_id: string;
    date: string;
    downtime_hours: number;
    panne_hours: number;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }[]>([]);
  // Daily adjustment helpers (declare here so they can be referenced in actions)
  async function createDailyAdjustment(adj: { machineId: string; date: string; downtimeHours: number; panneHours: number; notes?: string }) {
    const payload: MonthlyDailyAdjustmentInsert = {
      machine_id: adj.machineId,
      date: adj.date,
      downtime_hours: adj.downtimeHours || 0,
      panne_hours: adj.panneHours || 0,
      notes: adj.notes || null,
      pole_id: poleId || null,
    };
    const { data, error } = await supabase
      .from('monthly_daily_adjustments')
      .insert(payload)
      .select();
    if (error) {
      addToast({ type: 'error', title: 'Erreur', description: error.message });
      return null;
    }
    await fetchData();
    return (data && data[0]) || null;
  }

  async function updateDailyAdjustment(id: string, changes: Partial<{ downtimeHours: number; panneHours: number; notes?: string }>) {
    const payload: MonthlyDailyAdjustmentUpdate = {
      downtime_hours: changes.downtimeHours,
      panne_hours: changes.panneHours,
      notes: changes.notes || null,
    };
    const { error } = await supabase
      .from('monthly_daily_adjustments')
      .update(payload)
      .eq('id', id);
    if (error) {
      addToast({ type: 'error', title: 'Erreur', description: error.message });
      return false;
    }
    await fetchData();
    return true;
  }

  async function deleteDailyAdjustment(id: string) {
    const { error } = await supabase
      .from('monthly_daily_adjustments')
      .delete()
      .eq('id', id)
      .eq('pole_id', poleId);
    if (error) {
      addToast({ type: 'error', title: 'Erreur', description: error.message });
      return false;
    }
    await fetchData();
    return true;
  }

  const [theme, _setTheme] = useState<Theme>(() =>
    loadFromStorage("gestifiltres-theme", "default-light")
  );
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() =>
    loadFromStorage("gestifiltres-savedThemes", [])
  );
  const [customColors, setCustomColors] = useState<CustomColors>(() => {
    const saved = loadFromStorage(
      "gestifiltres-customColors",
      defaultCustomColors
    );
    // Ensure all fields from defaultCustomColors are present (migration)
    return { ...defaultCustomColors, ...saved };
  });

  const [highlightedFilterGroupId, setHighlightedFilterGroupId] = useState<
    string | null
  >(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  const [isFilterGroupModalOpen, setIsFilterGroupModalOpen] = useState(false);
  const [editingFilterGroup, setEditingFilterGroup] =
    useState<FilterGroup | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] =
    useState<Partial<MaintenanceRecord> | null>(null);
  const [isMaintenanceViewOnly, setIsMaintenanceViewOnly] = useState(false);

  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [stockUpdateInfo, setStockUpdateInfo] =
    useState<StockUpdateInfo | null>(null);

  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [editingCustomTheme, setEditingCustomTheme] =
    useState<SavedTheme | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMaintenanceImportModalOpen, setIsMaintenanceImportModalOpen] =
    useState(false);

  // Spare Parts state
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [sparePartInstallations, setSparePartInstallations] = useState<SparePartInstallation[]>([]);
  const [isSparePartModalOpen, setIsSparePartModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [isInstallationModalOpen, setIsInstallationModalOpen] = useState(false);
  const [preselectedSparePartId, setPreselectedSparePartId] = useState<string | undefined>(undefined);

  const [confirmationDialogConfig, setConfirmationDialogConfig] =
    useState<ConfirmationDialogConfig>({
      isOpen: false,
      title: "",
      description: "",
      onConfirm: () => { },
    });

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    // Create a more unique ID to prevent duplicates
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, ...toast }]);
  }, []);


  const fetchData = useCallback(async () => {
    try {
      const [
        machinesRes,
        filterGroupsRes,
        filterTypesRes,
        maintenanceRecordsRes,
        adjustmentsRes,
        sparePartsRes,
        installationsRes,
        oilStocksRes,
      ] = await Promise.all([
        supabase.from("machines").select("*"),
        supabase.from("filter_groups").select("*"),
        supabase.from("filter_types").select("*"),
        supabase.from("maintenance_records").select("*"),
        supabase.from("monthly_daily_adjustments").select("*"),
        supabase.from("spare_parts").select("*"),
        supabase.from("spare_part_installations").select("*"),
        supabase.from("oil_stocks").select("*"),
      ]);

      if (machinesRes.error) throw machinesRes.error;
      if (filterGroupsRes.error) throw filterGroupsRes.error;
      if (filterTypesRes.error) throw filterTypesRes.error;
      if (maintenanceRecordsRes.error) throw maintenanceRecordsRes.error;
      if (oilStocksRes.error) throw oilStocksRes.error;

      // Transform oil stocks
      if (oilStocksRes.data && oilStocksRes.data.length > 0) {
        const transformedOilStocks = (oilStocksRes.data || []).map((stock: any) => ({
          id: stock.id,
          type: stock.type,
          currentLevel: stock.current_level,
          totalBarrels: stock.total_barrels,
          alertThreshold: stock.alert_threshold,
        }));
        setOilStocks(transformedOilStocks);
      }

      // Transform database results to match application types
      const transformedMachines = (machinesRes.data || []).map(
        (machine: any) => ({
          id: machine.id,
          code: machine.code,
          designation: machine.designation,
          marque: machine.marque,
          type: machine.type,
          serialNumber: machine.serial_number || "",
          registrationNumber: machine.registration_number || "",
          serviceHours: machine.service_hours,
          assignedFilters: machine.assigned_filters || [],
        })
      );

      const transformedFilterGroups = (filterGroupsRes.data || []).map(
        (group: any) => ({
          id: group.id,
          name: group.name,
          filterType: group.filter_type || "",
          originalReferenceId: group.original_reference_id,
          references: group["references"] || [],
        })
      );

      const transformedMaintenanceRecords = (
        maintenanceRecordsRes.data || []
      ).map((record: any) => ({
        id: record.id,
        machineId: record.machine_id,
        maintenanceRange: record.maintenance_range,
        serviceHours: record.service_hours,
        date: record.date,
        filtersUsed: record.filters_used || [],
        oilsUsed: record.oils_used || [],
        downtimeHours: record.downtime_hours || 0,
        panneHours: record.panne_hours || 0,
      }));

      setMonthlyDailyAdjustments(adjustmentsRes.data || []);

      // Helper: CRUD for monthly_daily_adjustments
      const createDailyAdjustment = async (adj: { machineId: string; date: string; downtimeHours: number; panneHours: number; notes?: string }) => {
        const payload = {
          id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          machine_id: adj.machineId,
          date: adj.date,
          downtime_hours: adj.downtimeHours || 0,
          panne_hours: adj.panneHours || 0,
          notes: adj.notes || null,
        };
        const res = await (supabase as any).from('monthly_daily_adjustments').insert(payload as any);
        if (res.error) {
          addToast({ type: 'error', title: 'Erreur', description: res.error.message });
          return null;
        }
        await fetchData();
        return res.data?.[0] || null;
      };

      const updateDailyAdjustment = async (id: string, changes: Partial<{ downtimeHours: number; panneHours: number; notes?: string }>) => {
        const payload: any = {};
        if (changes.downtimeHours !== undefined) payload.downtime_hours = changes.downtimeHours;
        if (changes.panneHours !== undefined) payload.panne_hours = changes.panneHours;
        if (changes.notes !== undefined) payload.notes = changes.notes;
        const res = await (supabase as any).from('monthly_daily_adjustments').update(payload).eq('id', id);
        if (res.error) {
          addToast({ type: 'error', title: 'Erreur', description: res.error.message });
          return false;
        }
        await fetchData();
        return true;
      };

      const deleteDailyAdjustment = async (id: string) => {
        const res = await (supabase as any).from('monthly_daily_adjustments').delete().eq('id', id);
        if (res.error) {
          addToast({ type: 'error', title: 'Erreur', description: res.error.message });
          return false;
        }
        await fetchData();
        return true;
      };

      // expose helpers via actions later (we'll add them to actions object)

      // Transform spare parts
      const transformedSpareParts: SparePart[] = (sparePartsRes?.data || []).map(
        (part: any) => ({
          id: part.id,
          reference: part.reference,
          designation: part.designation,
          category: part.category || undefined,
          manufacturer: part.manufacturer || undefined,
          unitPrice: part.unit_price || 0,
          stockQuantity: part.stock_quantity || 0,
          minStock: part.min_stock || 0,
          location: part.location || undefined,
        })
      );

      // Transform installations
      const transformedInstallations: SparePartInstallation[] = (installationsRes?.data || []).map(
        (inst: any) => ({
          id: inst.id,
          sparePartId: inst.spare_part_id,
          machineId: inst.machine_id,
          quantity: inst.quantity,
          installationDate: inst.installation_date,
          serviceHoursAtInstall: inst.service_hours_at_install || undefined,
          installedBy: inst.installed_by || undefined,
          notes: inst.notes || undefined,
        })
      );

      setMachines(transformedMachines);
      setFilterGroups(transformedFilterGroups);
      setFilterTypes(filterTypesRes.data || []);
      setMaintenanceRecords(transformedMaintenanceRecords);
      setSpareParts(transformedSpareParts);
      setSparePartInstallations(transformedInstallations);
    } catch (error: any) {
      console.error("Failed to fetch data from Supabase:", error);
      addToast({
        type: "error",
        title: "Erreur de chargement",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("gestifiltres-theme", JSON.stringify(theme));
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(
        "gestifiltres-customColors",
        JSON.stringify(customColors)
      );
    }
  }, [customColors]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(
        "gestifiltres-savedThemes",
        JSON.stringify(savedThemes)
      );
    }
  }, [savedThemes]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateToFilterGroup = (groupId: string) => {
    setIsAIAssistantOpen(false);
    setCurrentView(View.FILTER_MANAGEMENT);
    setHighlightedFilterGroupId(groupId);
  };

  useEffect(() => {
    const now = new Date().toISOString();
    const currentValidAlerts: Omit<Notification, "read" | "createdAt">[] = [];

    const historyByMachine = new Map<string, MaintenanceRecord[]>();
    maintenanceRecords.forEach((rec) => {
      if (!historyByMachine.has(rec.machineId))
        historyByMachine.set(rec.machineId, []);
      historyByMachine.get(rec.machineId)!.push(rec);
    });

    machines.forEach((machine) => {
      const history = historyByMachine.get(machine.id) || [];
      const nextMaint = calculateNextMaintenance(machine, history);
      if (nextMaint && nextMaint.dueIn <= 50) {
        currentValidAlerts.push({
          id: `maint-alert-${machine.id}-${nextMaint.hours}`,
          type: "maintenance",
          message: `L'engin ${machine.designation} (${machine.code}) nécessite une maintenance (Gamme ${nextMaint.gamme}) dans ${nextMaint.dueIn}h.`,
          entityId: machine.id,
        });
      }
    });

    filterGroups.forEach((group) => {
      group.references.forEach((ref) => {
        if (ref.stock > 0 && ref.stock <= 5) {
          currentValidAlerts.push({
            id: `stock-alert-${ref.id}`,
            type: "stock",
            message: `Le stock pour le filtre ${ref.reference} (${ref.manufacturer}) est faible (${ref.stock} unités).`,
            entityId: group.id,
          });
        }
      });
    });

    setNotifications((prevNotifications) => {
      const prevMap = new Map(prevNotifications.map((n) => [n.id, n]));

      const nextNotifications = currentValidAlerts.map((alert) => {
        const prev = prevMap.get(alert.id);
        if (prev) {
          return { ...prev, message: alert.message };
        }
        return { ...alert, read: false, createdAt: now };
      });
      return nextNotifications;
    });
  }, [machines, filterGroups, maintenanceRecords]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const selectMachine = (machineId: string) => {
    const machine = machines.find((m) => m.id === machineId);
    if (machine) {
      setSelectedMachine(machine);
      setCurrentView(View.MACHINE_DETAIL);
    }
  };

  const assignFilterToMachine = async (
    machineId: string,
    assignedFilterId: string,
    filterGroupId: string | null
  ) => {
    const machineToUpdate = machines.find((m) => m.id === machineId);
    if (!machineToUpdate) return;

    const newAssignedFilters = machineToUpdate.assignedFilters.map((af) =>
      af.id === assignedFilterId ? { ...af, filterGroupId } : af
    );

    const { error } = await supabase
      .from("machines")
      .update({ assigned_filters: newAssignedFilters } as any)
      .eq("id", machineId);
    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      fetchData();
      if (selectedMachine?.id === machineId) {
        const updatedMachine = {
          ...machineToUpdate,
          assignedFilters: newAssignedFilters,
        };
        setSelectedMachine(updatedMachine);
      }
    }
  };


  const addFilterTypeToMachine = async (
    machineId: string,
    assignedFilter: AssignedFilter
  ) => {
    // Backward compatibility: single add
    return addMultipleFilterTypesToMachine(machineId, [assignedFilter]);
  };

  // Batch add multiple filter types to a machine at once
  const addMultipleFilterTypesToMachine = async (
    machineId: string,
    assignedFilters: AssignedFilter[]
  ) => {
    const machineToUpdate = machines.find((m) => m.id === machineId);
    if (!machineToUpdate) return;

    const newAssignedFilters = [
      ...machineToUpdate.assignedFilters,
      ...assignedFilters,
    ];
    const { error } = await supabase
      .from("machines")
      .update({ assigned_filters: newAssignedFilters } as any)
      .eq("id", machineId);

    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      addToast({
        type: "success",
        title: "Filtres ajoutés",
        description: `${assignedFilters.length} type(s) de filtre ajouté(s) avec succès.`,
      });
      // Mettre à jour seulement la machine concernée sans recharger toutes les données
      const updatedMachines = machines.map(machine =>
        machine.id === machineId
          ? { ...machine, assignedFilters: newAssignedFilters }
          : machine
      );
      setMachines(updatedMachines);
      if (selectedMachine?.id === machineId) {
        const updatedMachine = {
          ...machineToUpdate,
          assignedFilters: newAssignedFilters,
        };
        setSelectedMachine(updatedMachine);
      }
    }
  };

  const removeFilterTypeFromMachine = async (
    machineId: string,
    assignedFilterId: string
  ) => {
    const machineToUpdate = machines.find((m) => m.id === machineId);
    if (!machineToUpdate) return;

    const newAssignedFilters = machineToUpdate.assignedFilters.filter(
      (af) => af.id !== assignedFilterId
    );
    const { error } = await supabase
      .from("machines")
      .update({ assigned_filters: newAssignedFilters } as any)
      .eq("id", machineId);

    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      fetchData();
      if (selectedMachine?.id === machineId) {
        const updatedMachine = {
          ...machineToUpdate,
          assignedFilters: newAssignedFilters,
        };
        setSelectedMachine(updatedMachine);
      }
    }
  };

  const openConfirmationDialog = (
    config: Omit<ConfirmationDialogConfig, "isOpen" | "onClose">
  ) => {
    setConfirmationDialogConfig({ ...config, isOpen: true });
  };

  const closeConfirmationDialog = () => {
    setConfirmationDialogConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    confirmationDialogConfig.onConfirm();
    closeConfirmationDialog();
  };

  const openMachineModal = (machine: Machine | null) => {
    setEditingMachine(machine);
    setIsMachineModalOpen(true);
  };
  const closeMachineModal = () => setIsMachineModalOpen(false);

  const saveMachine = async (machineData: {
    code: string;
    designation: string;
    marque: string;
    type: string;
    serialNumber?: string;
    registrationNumber?: string;
    serviceHours: number;
  }) => {
    // Prevent duplicates: the code is the unique identifier of a machine.
    // Block saving when another machine (different id) already uses this code;
    // keep the modal open so the user can fix it.
    const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
    const duplicateMachine = machines.find(
      (m) =>
        m.id !== editingMachine?.id &&
        norm(m.code) === norm(machineData.code)
    );
    if (duplicateMachine) {
      addToast({
        type: "error",
        title: "Engin déjà existant",
        description: `Un engin similaire existe déjà : ${duplicateMachine.code} (${duplicateMachine.designation}).`,
      });
      return;
    }

    // Prepare the machine data for insertion
    const machineToSave = editingMachine
      ? {
        id: editingMachine.id,
        code: machineData.code,
        designation: machineData.designation,
        marque: machineData.marque,
        type: machineData.type,
        serial_number: machineData.serialNumber || null, // Use null instead of empty string
        registration_number: machineData.registrationNumber || null, // Use null instead of empty string
        service_hours: machineData.serviceHours,
        assigned_filters: editingMachine.assignedFilters || [],
        pole_id: poleId || null,
      }
      : {
        id: `m-${Date.now()}`,
        code: machineData.code,
        designation: machineData.designation,
        marque: machineData.marque,
        type: machineData.type,
        serial_number: machineData.serialNumber || null, // Use null instead of empty string
        registration_number: machineData.registrationNumber || null, // Use null instead of empty string
        service_hours: machineData.serviceHours,
        assigned_filters: [],
        pole_id: poleId || null,
      };

    const { error } = await supabase
      .from("machines")
      .upsert(machineToSave as any);

    if (error) {
      console.error("Error saving machine:", error);
      addToast({
        type: "error",
        title: "Erreur",
        description: `Échec de la sauvegarde de l'engin: ${error.message}`,
      });
    } else {
      fetchData();
      const successMessage = editingMachine
        ? "Engin Mis à Jour"
        : "Engin Ajouté";
      addToast({
        type: "success",
        title: successMessage,
        description: `L'engin ${machineToSave.designation} a été sauvegardé.`,
      });
      if (selectedMachine?.id === machineToSave.id) {
        // Transform database format to application format for state
        const transformedMachine: Machine = {
          id: machineToSave.id,
          code: machineToSave.code,
          designation: machineToSave.designation,
          marque: machineToSave.marque,
          type: machineToSave.type,
          serialNumber: machineToSave.serial_number || undefined, // Handle null to undefined conversion
          registrationNumber: machineToSave.registration_number || undefined, // Handle null to undefined conversion
          serviceHours: machineToSave.service_hours,
          assignedFilters: machineToSave.assigned_filters,
        };
        setSelectedMachine(transformedMachine);
      }
    }
    closeMachineModal();
  };

  const deleteMachine = async (machineId: string) => {
    const { error } = await supabase
      .from("machines")
      .delete()
      .eq("id", machineId)
      .eq("pole_id", poleId);
    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      fetchData();
      addToast({ type: "info", title: "Engin Supprimé" });
    }
  };

  const closeImportModal = () => setIsImportModalOpen(false);
  const openMaintenanceImportModal = async () => {
    // Refresh data before opening the modal to ensure we have the latest maintenance records
    await fetchData();
    setIsMaintenanceImportModalOpen(true);
  };
  const closeMaintenanceImportModal = () =>
    setIsMaintenanceImportModalOpen(false);

  const importMaintenanceRecords = async (newMaintenanceData: any[]) => {
    // Filter out any records that don't have the minimum required data
    const validMaintenanceData = newMaintenanceData.filter(record =>
      record.date &&
      record.serviceHours !== undefined &&
      record.maintenanceRange
    );

    if (validMaintenanceData.length === 0) {
      addToast({
        type: "warning",
        title: "Importation Annulée",
        description: "Aucun enregistrement de maintenance valide à importer.",
      });
      closeMaintenanceImportModal();
      return;
    }

    // Function to normalize values for comparison
    const normalizeValue = (value: any) => {
      if (typeof value === 'string') {
        return value.trim();
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      if (value === null || value === undefined) {
        return '';
      }
      return String(value);
    };

    // Function to check if two records are duplicates
    const isDuplicateRecord = (existingRecord: any, newRecord: any) => {
      // Normalize dates (remove time part if exists)
      const date1 = normalizeValue(existingRecord.date).split('T')[0];
      const date2 = normalizeValue(newRecord.date).split('T')[0];

      // Handle database format vs import format
      const machineId1 = existingRecord.machineId || existingRecord.machine_id;
      const machineId2 = newRecord.machineId || newRecord.machine_id;

      const serviceHours1 = existingRecord.serviceHours !== undefined ?
        existingRecord.serviceHours : existingRecord.service_hours;
      const serviceHours2 = newRecord.serviceHours !== undefined ?
        newRecord.serviceHours : newRecord.service_hours;

      const maintenanceRange1 = existingRecord.maintenanceRange || existingRecord.maintenance_range;
      const maintenanceRange2 = newRecord.maintenanceRange || newRecord.maintenance_range;

      // Normalize maintenance range (case insensitive)
      const range1 = normalizeValue(maintenanceRange1).toUpperCase();
      const range2 = normalizeValue(maintenanceRange2).toUpperCase();

      const isDup = (
        normalizeValue(machineId1) === normalizeValue(machineId2) &&
        date1 === date2 &&
        serviceHours1 === serviceHours2 &&
        range1 === range2
      );


      return isDup;
    };

    // Filter out duplicates by checking against existing maintenance records
    const uniqueMaintenanceData = validMaintenanceData.filter((newRecord) => {
      // Check if this record already exists in the database
      const isExistingRecord = maintenanceRecords.some((existingRecord) => {
        return isDuplicateRecord(existingRecord, newRecord);
      });

      return !isExistingRecord;
    });

    if (uniqueMaintenanceData.length === 0) {
      addToast({
        type: "warning",
        title: "Importation Annulée",
        description: "Tous les enregistrements de maintenance sélectionnés existent déjà.",
      });
      closeMaintenanceImportModal();
      return;
    }

    const maintenanceRecordsToAdd = uniqueMaintenanceData.map((record) => ({
      id: `maint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      machine_id: record.machineId || null,
      date: record.date,
      service_hours: record.serviceHours,
      maintenance_range: record.maintenanceRange,
      filters_used: [],
      pole_id: poleId || null,
    }));

    const { error } = await supabase
      .from("maintenance_records")
      .insert(maintenanceRecordsToAdd as any);

    if (error) {
      console.error("Error importing maintenance records:", error);
      addToast({
        type: "error",
        title: "Erreur d'importation",
        description: `Échec de l'importation des enregistrements de maintenance: ${error.message}`,
      });
    } else {
      fetchData();
      const duplicateCount = validMaintenanceData.length - uniqueMaintenanceData.length;

      // Show appropriate toast based on results
      if (duplicateCount > 0) {
        addToast({
          type: "success",
          title: "Importation Réussie",
          description: `${maintenanceRecordsToAdd.length} enregistrements de maintenance ont été ajoutés. ${duplicateCount} doublons ont été ignorés.`,
        });
      } else {
        addToast({
          type: "success",
          title: "Importation Réussie",
          description: `${maintenanceRecordsToAdd.length} enregistrements de maintenance ont été ajoutés.`,
        });
      }
    }
    closeMaintenanceImportModal();
  };

  const importMachines = async (
    newMachinesData: Omit<Machine, "id" | "assignedFilters">[]
  ) => {
    const machinesToAdd = newMachinesData.map((nm) => ({
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: nm.code,
      designation: nm.designation,
      marque: nm.marque,
      type: nm.type,
      serial_number: nm.serialNumber || null, // Use null instead of empty string
      registration_number: nm.registrationNumber || null, // Use null instead of empty string
      service_hours: nm.serviceHours,
      assigned_filters: [],
      pole_id: poleId || null,
    }));

    // Filter out any records that might have invalid data
    const validMachinesToAdd = machinesToAdd.filter(
      (machine) =>
        machine.code && machine.designation && machine.marque && machine.type
    );

    if (validMachinesToAdd.length === 0) {
      addToast({
        type: "warning",
        title: "Importation Annulée",
        description: "Aucun engin valide à importer.",
      });
      closeImportModal();
      return;
    }

    const { error } = await supabase
      .from("machines")
      .insert(validMachinesToAdd as any);

    if (error) {
      console.error("Error importing machines:", error);
      addToast({
        type: "error",
        title: "Erreur d'importation",
        description: `Échec de l'importation des engins: ${error.message}`,
      });
    } else {
      fetchData();
      addToast({
        type: "success",
        title: "Importation Réussie",
        description: `${validMachinesToAdd.length} engins ont été ajoutés.`,
      });
    }
    closeImportModal();
  };

  // La fonction importMaintenanceRecords est déjà définie plus haut

  const openFilterGroupModal = (group: FilterGroup | null, allGroups?: FilterGroup[]) => {
    setEditingFilterGroup(group);
    setIsFilterGroupModalOpen(true);
  };
  const closeFilterGroupModal = () => setIsFilterGroupModalOpen(false);

  const saveFilterGroup = async (
    groupData: FilterGroup | Omit<FilterGroup, "id">
  ) => {
    const groupToSave =
      "id" in groupData && groupData.id
        ? {
          id: groupData.id,
          name: groupData.name,
          filter_type: groupData.filterType,
          original_reference_id: groupData.originalReferenceId,
          references: groupData.references,
        }
        : {
          id: `fg-${Date.now()}`,
          name: groupData.name,
          filter_type: groupData.filterType,
          original_reference_id: groupData.originalReferenceId,
          references: groupData.references,
        };
    const { error } = await supabase
      .from("filter_groups")
      .upsert(groupToSave as any);
    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      fetchData();
      const successMessage =
        "id" in groupData && groupData.id ? "Groupe Mis à Jour" : "Groupe Créé";
      addToast({
        type: "success",
        title: successMessage,
        description: `Le groupe ${groupToSave.name} a été sauvegardé.`,
      });
    }
    closeFilterGroupModal();
  };

  const deleteFilterGroup = async (groupId: string) => {
    const { error } = await supabase
      .from("filter_groups")
      .delete()
      .eq("id", groupId)
      .eq("pole_id", poleId);
    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      // Also need to un-assign from machines. This is a non-atomic operation for simplicity.
      machines.forEach(async (m) => {
        if (m.assignedFilters.some((af) => af.filterGroupId === groupId)) {
          const newAssigned = m.assignedFilters.map((af) =>
            af.filterGroupId === groupId ? { ...af, filterGroupId: null } : af
          );
          await supabase
            .from("machines")
            .update({ assigned_filters: newAssigned } as any)
            .eq("id", m.id);
        }
      });
      fetchData();
      addToast({ type: "info", title: "Groupe Supprimé" });
    }
  };

  const openMaintenanceModal = (
    record: Partial<MaintenanceRecord> | null,
    viewOnly: boolean = false
  ) => {
    setEditingMaintenanceRecord(record);
    setIsMaintenanceViewOnly(viewOnly);
    setIsMaintenanceModalOpen(true);
  };
  const closeMaintenanceModal = () => setIsMaintenanceModalOpen(false);
  const saveMaintenanceRecord = async (
    recordData: MaintenanceRecord | Omit<MaintenanceRecord, "id">
  ) => {
    const recordToSave =
      "id" in recordData && recordData.id
        ? {
          id: recordData.id,
          machine_id: recordData.machineId,
          date: recordData.date,
          service_hours: recordData.serviceHours,
          maintenance_range: recordData.maintenanceRange,
          filters_used: recordData.filtersUsed,
          oils_used: recordData.oilsUsed,
          downtime_hours: (recordData as any).downtimeHours || 0,
          panne_hours: (recordData as any).panneHours || 0,
          pole_id: poleId || null,
        }
        : {
          id: `maint-${Date.now()}`,
          machine_id: recordData.machineId,
          date: recordData.date,
          service_hours: recordData.serviceHours,
          maintenance_range: recordData.maintenanceRange,
          filters_used: recordData.filtersUsed,
          oils_used: recordData.oilsUsed,
          downtime_hours: (recordData as any).downtimeHours || 0,
          panne_hours: (recordData as any).panneHours || 0,
          pole_id: poleId || null,
        };

    const { error } = await supabase
      .from("maintenance_records")
      .upsert(recordToSave as any);

    if (error) {
      addToast({ type: "error", title: "Erreur", description: error.message });
    } else {
      // Update machine service hours if needed
      const machine = machines.find((m) => m.id === recordData.machineId);
      if (machine && recordData.serviceHours > machine.serviceHours) {
        await supabase
          .from("machines")
          .update({ service_hours: recordData.serviceHours } as any)
          .eq("id", machine.id);
      }

      // If the maintenance record includes used filters, decrement stock for those references
      // across all filter groups that contain the same reference (matching by reference + manufacturer).
      const usedFilters = (recordData as any).filtersUsed as
        | { filterTypeId: string; referenceId: string; quantity: number }[]
        | undefined;

      if (usedFilters && usedFilters.length > 0) {
        const updatesMap = new Map<string, FilterReference[]>();

        usedFilters.forEach((uf) => {
          const qty = uf.quantity || 0;
          if (qty <= 0) return;

          // locate origin reference by id to get its reference/manufacturer keys
          const origin = filterGroups
            .map((g) => g.references.map((r) => ({ ...r, __groupId: g.id } as any)))
            .flat()
            .find((r: any) => r.id === uf.referenceId);

          if (!origin) return;
          const referenceKey = origin.reference;
          const manufacturerKey = origin.manufacturer;

          filterGroups.forEach((g) => {
            const hasMatching = g.references.some(
              (r) => r.reference === referenceKey && r.manufacturer === manufacturerKey
            );
            if (!hasMatching) return;

            const currentRefs = updatesMap.get(g.id) || g.references;
            const updatedRefs = currentRefs.map((r) => {
              if (r.reference === referenceKey && r.manufacturer === manufacturerKey) {
                const newStock = Math.max(0, r.stock - qty);
                return { ...r, stock: newStock };
              }
              return r;
            });

            updatesMap.set(g.id, updatedRefs);
          });
        });

        if (updatesMap.size > 0) {
          const updates = Array.from(updatesMap.entries()).map(([grpId, refs]) =>
            supabase.from("filter_groups").update({ references: refs } as any).eq("id", grpId)
          );

          try {
            const results = await Promise.all(updates);
            const errors = results.filter((r) => r.error).map((r) => r.error);
            if (errors.length > 0) {
              console.error("Errors updating stock after maintenance:", errors);
              addToast({ type: "error", title: "Erreur", description: "Erreur lors de la mise à jour du stock." });
            }
          } catch (e) {
            console.error("Error updating stock after maintenance:", e);
            addToast({ type: "error", title: "Erreur", description: "Erreur lors de la mise à jour du stock." });
          }
        }
      }

      // Decrement Oil Stocks
      if (recordData.oilsUsed && recordData.oilsUsed.length > 0) {
        const newStocks = state.oilStocks.map(stock => {
          const used = recordData.oilsUsed.find(uo => uo.oilStockId === stock.id);
          if (used) {
            return { ...stock, currentLevel: Math.max(0, stock.currentLevel - used.quantity) };
          }
          return stock;
        });
        updateOilStocksInternal(newStocks);
      }

      // Refresh data and notify success (already done below)

      // Refresh data and notify success
      fetchData();
      const successMessage =
        "id" in recordData && recordData.id
          ? "Maintenance Mise à Jour"
          : "Maintenance Enregistrée";
      addToast({ type: "success", title: successMessage });
    }
    closeMaintenanceModal();
  };

  const deleteMaintenanceRecord = async (recordId: string, showNotification: boolean = true) => {
    const { error } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", recordId)
      .eq("pole_id", poleId);
    if (error) {
      if (showNotification) {
        addToast({ type: "error", title: "Erreur", description: error.message });
      }
      return false; // Return false to indicate failure
    } else {
      fetchData();
      if (showNotification) {
        addToast({ type: "info", title: "Enregistrement Supprimé" });
      }
      return true; // Return true to indicate success
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    if (notification.type === "maintenance") {
      selectMachine(notification.entityId);
    } else if (notification.type === "stock") {
      navigateToFilterGroup(notification.entityId);
    }
  };
  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openAddStockModal = (info: StockUpdateInfo) => {
    setStockUpdateInfo(info);
    setIsAddStockModalOpen(true);
  };
  const closeAddStockModal = () => setIsAddStockModalOpen(false);

  const addStock = async (quantity: number) => {
    if (!stockUpdateInfo) return;
    const { filterReference, filterGroupId, isRemove } = stockUpdateInfo;

    // Find all groups that have this reference (matching by reference number and manufacturer)
    const groupsToUpdate = filterGroups.map(group => {
      const hasMatchingReference = group.references.some(ref =>
        ref.reference === filterReference.reference &&
        ref.manufacturer === filterReference.manufacturer
      );

      if (!hasMatchingReference) return null;

      const newReferences = group.references.map(ref => {
        if (ref.reference !== filterReference.reference || ref.manufacturer !== filterReference.manufacturer) return ref;
        const newStock = isRemove ? ref.stock - quantity : ref.stock + quantity;
        return { ...ref, stock: newStock };
      });

      return {
        id: group.id,
        references: newReferences,
      };
    }).filter((g): g is { id: string; references: FilterReference[] } => g !== null);

    if (groupsToUpdate.length === 0) return;

    // Update all groups that have matching references
    const updates = groupsToUpdate.map(group =>
      supabase
        .from("filter_groups")
        .update({ references: group.references } as any)
        .eq("id", group.id)
    );

    try {
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error).map(r => r.error);

      if (errors.length > 0) {
        console.error("Errors updating stock:", errors);
        addToast({ type: "error", title: "Erreur", description: "Erreur lors de la mise à jour du stock dans certains groupes." });
      } else {
        fetchData();
        addToast({
          type: "success",
          title: isRemove ? "Stock Consommé" : "Stock Ajouté",
          description: isRemove
            ? `${quantity} unité(s) consommée(s) pour ${filterReference.reference} (mis à jour dans ${groupsToUpdate.length} groupe(s)).`
            : `${quantity} unité(s) ajoutée(s) pour ${filterReference.reference} (mis à jour dans ${groupsToUpdate.length} groupe(s)).`,
        });
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      addToast({ type: "error", title: "Erreur", description: "Une erreur est survenue lors de la mise à jour du stock." });
    }

    closeAddStockModal();
  };

  const setTheme = (themeId: Theme) => {
    _setTheme(themeId);
    if (themeId.startsWith("custom-")) {
      const saved = savedThemes.find((t) => t.id === themeId);
      if (saved) setCustomColors(saved.colors);
    }
  };

  const openThemeCustomizer = (themeToEdit: SavedTheme | ThemeInfo | null) => {
    if (!themeToEdit) {
      setEditingCustomTheme(null);
      setCustomColors(defaultCustomColors);
    } else if ('colors' in themeToEdit && !('id' in themeToEdit && typeof themeToEdit.id === 'string' && themeToEdit.id.startsWith('custom-'))) {
      // Predefined theme (ThemeInfo)
      const predefined = themeToEdit as ThemeInfo;
      setEditingCustomTheme(null);
      setCustomColors({
        ...defaultCustomColors,
        background: predefined.colors.bg,
        card: predefined.colors.card,
        primary: predefined.colors.primary,
        foreground: predefined.colors.text,
      });
    } else {
      // Saved custom theme
      const saved = themeToEdit as SavedTheme;
      setEditingCustomTheme(saved);
      setCustomColors(saved.colors);
    }
    setIsThemeCustomizerOpen(true);
  };
  const closeThemeCustomizer = () => {
    setTheme(theme);
    setIsThemeCustomizerOpen(false);
  };

  const saveCustomTheme = (
    themeData: Omit<SavedTheme, "id"> & { id?: string }
  ) => {
    if (themeData.id) {
      const updatedThemes = savedThemes.map((t) =>
        t.id === themeData.id ? { ...t, ...themeData } : t
      );
      setSavedThemes(updatedThemes);
      setTheme(themeData.id);
    } else {
      const newTheme: SavedTheme = { ...themeData, id: `custom-${Date.now()}` };
      setSavedThemes([...savedThemes, newTheme]);
      setTheme(newTheme.id);
    }
    addToast({
      type: "success",
      title: "Thème Enregistré",
      description: `Le thème "${themeData.name}" a été sauvegardé.`,
    });
  };

  const deleteCustomTheme = (themeId: string) => {
    setSavedThemes(savedThemes.filter((t) => t.id !== themeId));
    if (theme === themeId) {
      setTheme("default-light");
    }
    addToast({ type: "info", title: "Thème Supprimé" });
  };

  const openSparePartModal = (part: SparePart | null) => {
    setEditingSparePart(part);
    setIsSparePartModalOpen(true);
  };

  const closeSparePartModal = () => {
    setEditingSparePart(null);
    setIsSparePartModalOpen(false);
  };

  const saveSparePart = async (partData: SparePart | Omit<SparePart, "id">) => {
    const isEditing = "id" in partData;
    const payload = {
      reference: partData.reference,
      designation: partData.designation,
      category: partData.category || null,
      manufacturer: partData.manufacturer || null,
      unit_price: partData.unitPrice,
      stock_quantity: partData.stockQuantity,
      min_stock: partData.minStock,
      location: partData.location || null,
    };

    let error;
    if (isEditing) {
      const res = await supabase
        .from("spare_parts")
        .update(payload)
        .eq("id", partData.id);
      error = res.error;
    } else {
      const res = await supabase.from("spare_parts").insert([{
        ...payload,
        id: `sp-${Date.now()}`,
        pole_id: poleId || null,
      }]);
      error = res.error;
    }

    if (error) {
      addToast({
        type: "error",
        title: "Erreur",
        description: error.message,
      });
      return false;
    }

    addToast({
      type: "success",
      title: isEditing ? "Pièce Mise à Jour" : "Pièce Ajoutée",
    });
    await fetchData();
    return true;
  };

  const deleteSparePart = async (partId: string) => {
    const { error } = await supabase
      .from("spare_parts")
      .delete()
      .eq("id", partId)
      .eq("pole_id", poleId);

    if (error) {
      addToast({
        type: "error",
        title: "Erreur",
        description: error.message,
      });
      return false;
    }

    addToast({ type: "info", title: "Pièce Supprimée" });
    await fetchData();
    return true;
  };

  const openInstallationModal = (partId?: string) => {
    setPreselectedSparePartId(partId);
    setIsInstallationModalOpen(true);
  };

  const closeInstallationModal = () => {
    setPreselectedSparePartId(undefined);
    setIsInstallationModalOpen(false);
  };

  const saveSparePartInstallation = async (
    instData: Omit<SparePartInstallation, "id">
  ) => {
    const payload = {
      spare_part_id: instData.sparePartId,
      machine_id: instData.machineId,
      quantity: instData.quantity,
      installation_date: instData.installationDate,
      service_hours_at_install: instData.serviceHoursAtInstall || null,
      installed_by: instData.installedBy || null,
      notes: instData.notes || null,
    };

    const { error } = await supabase.from("spare_part_installations").insert([{
      ...payload,
      id: `inst-${Date.now()}`,
      pole_id: poleId || null,
    }]);

    if (error) {
      addToast({
        type: "error",
        title: "Erreur",
        description: error.message,
      });
      return false;
    }

    // Automatically decrement stock
    const part = spareParts.find((p) => p.id === instData.sparePartId);
    if (part) {
      await supabase
        .from("spare_parts")
        .update({ stock_quantity: Math.max(0, part.stockQuantity - instData.quantity) })
        .eq("id", part.id);
    }

    addToast({
      type: "success",
      title: "Montage Enregistré",
      description: "Le stock de la pièce a été automatiquement mis à jour.",
    });
    await fetchData();
    return true;
  };

  const actions = {
    setCurrentView,
    toggleSidebar,
    closeSidebar,
    selectMachine,
    assignFilterToMachine,
    addFilterTypeToMachine,
    addMultipleFilterTypesToMachine,
    removeFilterTypeFromMachine,
    openConfirmationDialog,
    closeConfirmationDialog,
    handleConfirm,
    openMachineModal,
    closeMachineModal,
    saveMachine,
    deleteMachine,
    openFilterGroupModal,
    closeFilterGroupModal,
    saveFilterGroup,
    deleteFilterGroup,
    openMaintenanceModal,
    closeMaintenanceModal,
    saveMaintenanceRecord,
    deleteMaintenanceRecord,
    navigateToFilterGroup,
    clearHighlightedFilterGroup: () => setHighlightedFilterGroupId(null),
    handleNotificationClick,
    markAllNotificationsAsRead,
    openAIAssistant: () => setIsAIAssistantOpen(true),
    closeAIAssistant: () => setIsAIAssistantOpen(false),
    openScanner: () => setIsScannerOpen(true),
    closeScanner: () => setIsScannerOpen(false),
    addToast,
    removeToast,
    openAddStockModal,
    closeAddStockModal,
    addStock,
    setTheme,
    openThemeCustomizer,
    closeThemeCustomizer,
    saveCustomTheme,
    deleteCustomTheme,
    openImportModal: () => setIsImportModalOpen(true),
    closeImportModal,
    importMachines,
    importMaintenanceRecords,
    openMaintenanceImportModal,
    closeMaintenanceImportModal,
    // daily adjustments CRUD
    createDailyAdjustment: (adj: { machineId: string; date: string; downtimeHours: number; panneHours: number; notes?: string }) => (createDailyAdjustment as any)(adj),
    updateDailyAdjustment: (id: string, changes: Partial<{ downtimeHours: number; panneHours: number; notes?: string }>) => (updateDailyAdjustment as any)(id, changes),
    deleteDailyAdjustment: (id: string) => (deleteDailyAdjustment as any)(id),
    // Spare Parts
    openSparePartModal,
    closeSparePartModal,
    saveSparePart,
    deleteSparePart,
    openInstallationModal,
    closeInstallationModal,
    saveSparePartInstallation,
    setOilStocks,
    updateOilStocks: async (newStocks: OilStock[]) => {
      await updateOilStocksInternal(newStocks);
    },
  };

  async function updateOilStocksInternal(newStocks: OilStock[]) {
    setOilStocks(newStocks);
    try {
      const stocksToSave = newStocks.map(stock => ({
        id: stock.id,
        type: stock.type,
        current_level: stock.currentLevel,
        total_barrels: stock.totalBarrels,
        alert_threshold: stock.alertThreshold
      }));
      const { error } = await (supabase as any).from('oil_stocks').upsert(stocksToSave);
      if (error) throw error;
    } catch (e: any) {
      console.error("Error saving oil stocks:", e);
      addToast({ type: "error", title: "Erreur", description: "Impossible de sauvegarder le stock d'huile." });
    }
  }

  const state = {
    isLoading,
    currentView,
    machines,
    filterGroups,
    filterTypes,
    selectedMachine,
    maintenanceRecords,
    oilStocks,
    theme,
    customColors,
    savedThemes,
    highlightedFilterGroupId,
    isSidebarOpen,
    notifications,
    toasts,
    isScannerOpen,
    isAIAssistantOpen,
    isMachineModalOpen,
    editingMachine,
    isFilterGroupModalOpen,
    editingFilterGroup,
    isMaintenanceModalOpen,
    editingMaintenanceRecord,
    isMaintenanceViewOnly,
    isAddStockModalOpen,
    stockUpdateInfo,
    isThemeCustomizerOpen,
    editingCustomTheme,
    isImportModalOpen,
    isMaintenanceImportModalOpen,
    confirmationDialogConfig,
    monthlyDailyAdjustments,
    // Spare Parts
    spareParts,
    sparePartInstallations,
    isSparePartModalOpen,
    editingSparePart,
    isInstallationModalOpen,
    preselectedSparePartId,
  };

  return { state, actions };
};
