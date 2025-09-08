import React, { useState, useMemo, useEffect } from "react";
import { MaintenanceRecord, Machine, Toast } from "../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/Card";
import Button from "./ui/Button";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  SearchIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  WrenchIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from "../constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/Table";
import Input from "./ui/Input";
import EmptyState from "./ui/EmptyState";
import { useAppLogic } from "../hooks/useAppLogic";
import Select from "./ui/Select";
import Label from "./ui/Label";
import { rangeColors } from "../utils/gamme";

interface MaintenanceViewProps {
  maintenanceRecords: MaintenanceRecord[];
  machines: Machine[];
  onOpenMaintenanceModal: (
    record: Partial<MaintenanceRecord> | null,
    viewOnly?: boolean
  ) => void;
  onDeleteMaintenance: (recordId: string, showNotification?: boolean) => void;
  onOpenConfirmationDialog: ReturnType<
    typeof useAppLogic
  >["actions"]["openConfirmationDialog"];
  onOpenMaintenanceImportModal: () => Promise<void>; // Make sure this is properly typed as async
  addToast: (toast: Omit<Toast, "id">) => void; // Add this prop for toast notifications
}

const maintenanceSequence = ["C", "D", "C", "E", "C", "D", "F"];

// fix: Changed export to a named export to resolve module import issue.
export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  maintenanceRecords,
  machines,
  onOpenMaintenanceModal,
  onDeleteMaintenance,
  onOpenConfirmationDialog,
  onOpenMaintenanceImportModal,
  addToast,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [machineFilter, setMachineFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest(".menu-container")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  const getMachineName = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.designation || "Inconnu";
  };

  const exportMaintenanceToCSV = (records: MaintenanceRecord[]) => {
    const csvContent = [
      ["", "", "", "", ""], // Row 1
      ["", "", "", "", ""], // Row 2
      ["", "", "", "", ""], // Row 3
      ["", "", "", "", ""], // Row 4
      ["Date De Gamme", "Heurs De Gamme", "Gamme", "Code Engin", ""], // Row 5 (Headers)
      ...records.map((record) => [
        new Date(record.date).toISOString().split("T")[0], // Format date as YYYY-MM-DD
        record.serviceHours.toString(),
        record.maintenanceRange,
        machines.find((m) => m.id === record.machineId)?.code || "",
        "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "maintenance_records.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (record: MaintenanceRecord) => {
    onOpenConfirmationDialog({
      title: "Supprimer l'enregistrement",
      description: `Êtes-vous sûr de vouloir supprimer cette opération de maintenance pour ${getMachineName(
        record.machineId
      )} ? Cette action est irréversible.`,
      onConfirm: () => onDeleteMaintenance(record.id), // Use default behavior (show notification)
    });
  };

  // New function to delete maintenance records by machine
  const handleDeleteByMachine = () => {
    if (machineFilter === "all") return;

    const recordsOfMachine = maintenanceRecords.filter(
      (record) => record.machineId === machineFilter
    );
    if (recordsOfMachine.length === 0) return;

    const machineName = getMachineName(machineFilter);
    onOpenConfirmationDialog({
      title: "Supprimer les maintenances par engin",
      description: `Êtes-vous sûr de vouloir supprimer toutes les ${recordsOfMachine.length} opérations de maintenance pour l'engin "${machineName}" ? Cette action est irréversible.`,
      onConfirm: async () => {
        // Create an array of promises for all deletions
        const deletePromises = recordsOfMachine.map(record => 
          onDeleteMaintenance(record.id, false) // Pass false to suppress individual notifications
        );
        
        // Wait for all deletions to complete
        await Promise.all(deletePromises);
        
        // Show a single toast with the count of deleted records
        addToast({
          type: "info",
          title: "Maintenances Supprimées",
          description: `${recordsOfMachine.length} opération(s) de maintenance supprimée(s).`,
        });
      },
    });
  };

  // New function to delete maintenance records by gamme
  const handleDeleteByGamme = () => {
    if (rangeFilter === "all") return;

    const recordsOfGamme = maintenanceRecords.filter(
      (record) => record.maintenanceRange === rangeFilter
    );
    if (recordsOfGamme.length === 0) return;

    onOpenConfirmationDialog({
      title: "Supprimer les maintenances par gamme",
      description: `Êtes-vous sûr de vouloir supprimer toutes les ${recordsOfGamme.length} opérations de maintenance de gamme "${rangeFilter}" ? Cette action est irréversible.`,
      onConfirm: async () => {
        // Create an array of promises for all deletions
        const deletePromises = recordsOfGamme.map(record => 
          onDeleteMaintenance(record.id, false) // Pass false to suppress individual notifications
        );
        
        // Wait for all deletions to complete
        await Promise.all(deletePromises);
        
        // Show a single toast with the count of deleted records
        addToast({
          type: "info",
          title: "Maintenances Supprimées",
          description: `${recordsOfGamme.length} opération(s) de maintenance supprimée(s).`,
        });
      },
    });
  };

  // New function to delete all maintenance records
  const handleDeleteAllMaintenance = () => {
    if (maintenanceRecords.length === 0) return;

    onOpenConfirmationDialog({
      title: "Supprimer tout",
      description: `Êtes-vous sûr de vouloir supprimer toutes les ${maintenanceRecords.length} opérations de maintenance ? Cette action est irréversible.`,
      onConfirm: async () => {
        // Create an array of promises for all deletions
        const deletePromises = maintenanceRecords.map(record => 
          onDeleteMaintenance(record.id, false) // Pass false to suppress individual notifications
        );
        
        // Wait for all deletions to complete
        await Promise.all(deletePromises);
        
        // Show a single toast with the count of deleted records
        addToast({
          type: "info",
          title: "Maintenances Supprimées",
          description: `${maintenanceRecords.length} opération(s) de maintenance supprimée(s).`,
        });
      },
    });
  };

  const machineMaintenanceHistory = useMemo(() => {
    const historyMap = new Map<string, MaintenanceRecord[]>();

    for (const record of maintenanceRecords) {
      if (!historyMap.has(record.machineId)) {
        historyMap.set(record.machineId, []);
      }
      historyMap.get(record.machineId)!.push(record);
    }

    for (const records of Array.from(historyMap.values())) {
      records.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    return historyMap;
  }, [maintenanceRecords]);

  const filteredMaintenanceRecords = useMemo(() => {
    let records = [...maintenanceRecords];

    if (machineFilter !== "all") {
      records = records.filter((record) => record.machineId === machineFilter);
    }

    if (rangeFilter !== "all") {
      records = records.filter(
        (record) => record.maintenanceRange === rangeFilter
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter((record) => {
        const machine = machines.find((m) => m.id === record.machineId);
        const machineIdentifier = machine
          ? `${machine.designation} ${machine.code}`.toLowerCase()
          : "";
        const date = new Date(record.date).toLocaleDateString().toLowerCase();
        return machineIdentifier.includes(query) || date.includes(query);
      });
    }

    return records;
  }, [maintenanceRecords, machines, searchQuery, machineFilter, rangeFilter]);

  const getNextMaintenanceInfo = (
    record: MaintenanceRecord
  ): { gamme: string; hours: number } => {
    const machineHistory = machineMaintenanceHistory.get(record.machineId);
    if (!machineHistory) return { gamme: "?", hours: 0 };

    const recordIndexInHistory = machineHistory.findIndex(
      (r) => r.id === record.id
    );
    if (recordIndexInHistory === -1) return { gamme: "?", hours: 0 };

    const gammesPerformedSoFar = machineHistory
      .slice(0, recordIndexInHistory + 1)
      .map((r) => r.maintenanceRange);

    let masterSequencePointer = 0;

    for (const performedGamme of gammesPerformedSoFar) {
      let foundMatch = false;
      for (let i = masterSequencePointer; i < maintenanceSequence.length; i++) {
        if (maintenanceSequence[i] === performedGamme) {
          masterSequencePointer = i + 1;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        masterSequencePointer = 0;
        for (
          let i = masterSequencePointer;
          i < maintenanceSequence.length;
          i++
        ) {
          if (maintenanceSequence[i] === performedGamme) {
            masterSequencePointer = i + 1;
            break;
          }
        }
      }
    }

    const nextSequenceIndex =
      masterSequencePointer % maintenanceSequence.length;
    const nextGamme = maintenanceSequence[nextSequenceIndex];
    const nextHours = record.serviceHours + 250;

    return { gamme: nextGamme, hours: nextHours };
  };

  const renderContent = () => {
    if (maintenanceRecords.length === 0) {
      return (
        <EmptyState
          icon={<WrenchIcon className="h-24 w-24" />}
          title="Aucune maintenance enregistrée"
          description="Commencez par enregistrer votre première opération de maintenance pour suivre l'historique de votre parc."
          action={
            <Button onClick={() => onOpenMaintenanceModal(null)}>
              <PlusIcon className="mr-2 h-5 w-5" />
              Enregistrer une maintenance
            </Button>
          }
        />
      );
    }

    if (
      filteredMaintenanceRecords.length === 0 &&
      (searchQuery || machineFilter !== "all" || rangeFilter !== "all")
    ) {
      return (
        <EmptyState
          icon={<SearchIcon className="h-24 w-24" />}
          title="Aucun résultat"
          description={`Aucune opération ne correspond à vos critères de recherche.`}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setMachineFilter("all");
                setRangeFilter("all");
              }}
            >
              Effacer les filtres
            </Button>
          }
        />
      );
    }

    const recordsToRender = [...filteredMaintenanceRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const actionMenuItems = (record: MaintenanceRecord) => (
      <ul className="py-1">
        <li>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMaintenanceModal(record, true);
              setOpenMenuId(null);
            }}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            <EyeIcon className="mr-3 h-4 w-4" />
            Voir Détails
          </button>
        </li>
        <li>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMaintenanceModal(record);
              setOpenMenuId(null);
            }}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            <PencilIcon className="mr-3 h-4 w-4" />
            Modifier
          </button>
        </li>
        <li>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(record);
              setOpenMenuId(null);
            }}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <TrashIcon className="mr-3 h-4 w-4" />
            Supprimer
          </button>
        </li>
      </ul>
    );

    return (
      <>
        {/* Mobile Card View */}
        <div className="space-y-4 md:hidden">
          {recordsToRender.map((record) => {
            const nextMaint = getNextMaintenanceInfo(record);
            return (
              <Card key={record.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {getMachineName(record.machineId)}
                      </CardTitle>
                      <CardDescription>
                        {machines.find(m => m.id === record.machineId)?.code || ''} - {new Date(record.date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="relative menu-container flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-2 -mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === record.id ? null : record.id
                          );
                        }}
                      >
                        <EllipsisVerticalIcon />
                      </Button>
                      {openMenuId === record.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50 animate-fadeIn">
                          {actionMenuItems(record)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Heures de Service
                      </p>
                      <p className="font-semibold">
                        {record.serviceHours.toLocaleString()} hs
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Filtres Changés
                      </p>
                      <p className="font-semibold">
                        {record.filtersUsed.length} filtre(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Gamme Exécutée
                      </p>
                      <span
                        className={`font-bold inline-block text-center w-8 h-8 leading-8 rounded-full border text-sm ${
                          rangeColors[record.maintenanceRange]
                        }`}
                      >
                        {record.maintenanceRange}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Gamme Prochaine
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold inline-block text-center w-8 h-8 leading-8 rounded-full border text-sm ${
                            rangeColors[
                              nextMaint.gamme as keyof typeof rangeColors
                            ]
                          }`}
                        >
                          {nextMaint.gamme}
                        </span>
                        <span className="text-sm font-semibold">
                          {nextMaint.hours.toLocaleString()} hs
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <Table
                className="table-zebra"
                wrapperClassName="rounded-lg"
                isMenuOpen={!!openMenuId}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Engin</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heures de Service</TableHead>
                    <TableHead>Gamme éxecutée</TableHead>
                    <TableHead>Gamme Prochaine</TableHead>
                    <TableHead>Filtres Changés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsToRender.map((record, index) => {
                    const nextMaint = getNextMaintenanceInfo(record);
                    const isLastRow = index === recordsToRender.length - 1;
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium max-w-sm truncate">
                          {getMachineName(record.machineId)}
                        </TableCell>
                        <TableCell>
                          {machines.find(m => m.id === record.machineId)?.code || ''}
                        </TableCell>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {record.serviceHours.toLocaleString()} hs
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-bold inline-block text-center w-8 h-8 leading-8 rounded-full border text-xs ${
                              rangeColors[record.maintenanceRange]
                            }`}
                          >
                            {record.maintenanceRange}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold inline-block text-center w-8 h-8 leading-8 rounded-full border text-xs ${
                                rangeColors[
                                  nextMaint.gamme as keyof typeof rangeColors
                                ]
                              }`}
                            >
                              {nextMaint.gamme}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {nextMaint.hours.toLocaleString()} hs
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {record.filtersUsed.length} filtre(s)
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="relative menu-container flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(
                                  openMenuId === record.id ? null : record.id
                                );
                              }}
                            >
                              <EllipsisVerticalIcon />
                            </Button>
                            {openMenuId === record.id && (
                              <div
                                className={`absolute right-0 w-48 bg-card border border-border rounded-md shadow-lg z-50 ${
                                  isLastRow
                                    ? "bottom-full mb-2"
                                    : "top-full mt-2"
                                } animate-fadeIn`}
                              >
                                {actionMenuItems(record)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  return (
    <div>
      <Card className="mb-6 rounded-xl">
        <CardHeader className="rounded-xl">
          <div className="flex flex-col min-[1160px]:flex-row justify-between min-[1160px]:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">
                Suivi de la Maintenance Préventive
              </CardTitle>
              <CardDescription>
                Consultez et enregistrez les opérations de maintenance de votre
                parc.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button onClick={() => onOpenMaintenanceImportModal()} variant="outline">
                <ArrowUpTrayIcon className="mr-2 h-5 w-5" />
                Importer
              </Button>
              {maintenanceRecords.length > 0 && (
                <Button
                  onClick={() => exportMaintenanceToCSV(maintenanceRecords)}
                  variant="outline"
                >
                  <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
                  Exporter
                </Button>
              )}
              <Button
                onClick={() => onOpenMaintenanceModal(null)}
                className="flex-shrink-0"
              >
                <PlusIcon className="mr-2 h-5 w-5" />
                <span>Nouvelle Maintenance</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {maintenanceRecords.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="mb-6">
            <CardTitle>Rechercher une Opération</CardTitle>
            <CardDescription>
              Filtrez par code d'engin, gamme de maintenance, ou date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="machine-filter">Code</Label>
                <Select
                  id="machine-filter"
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                >
                  <option value="all">Tous les codes</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="range-filter">Gamme</Label>
                <Select
                  id="range-filter"
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                >
                  <option value="all">Toutes les gammes</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                </Select>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par texte..."
                  className="w-full pl-11"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            {/* Delete buttons section */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteByMachine}
                disabled={machineFilter === "all"}
                className="flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Supprimer par code
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteByGamme}
                disabled={rangeFilter === "all"}
                className="flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Supprimer par gamme
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAllMaintenance}
                disabled={maintenanceRecords.length === 0}
                className="flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Supprimer tout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {renderContent()}
    </div>
  );
};
