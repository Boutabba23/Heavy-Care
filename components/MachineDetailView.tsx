import React, { useState, useEffect, useMemo } from "react";
import { Machine, FilterType, FilterGroup, MaintenanceRecord, AssignedFilter } from "../types";
import Button from "./ui/Button";
import { BackIcon, PlusIcon, TrashIcon, EyeIcon } from "../constants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/Card";
import Select from "./ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/Table";
import { useAppLogic } from "../hooks/useAppLogic";
import Badge from "./ui/Badge";
import { calculateNextMaintenance } from "../utils/maintenance";
import { rangeColors, rangeTooltips } from "../utils/gamme";

interface MachineDetailViewProps {
  machine: Machine;
  filterTypes: FilterType[];
  filterGroups: FilterGroup[];
  maintenanceRecords: MaintenanceRecord[];
  onAssignFilter: (
    machineId: string,
    filterTypeId: string,
    filterGroupId: string | null
  ) => void;
  onAddFilterType: (machineId: string, filterTypeId: string) => void;
  onRemoveFilterType: (machineId: string, filterTypeId: string) => void;
  onBack: () => void;
  onOpenConfirmationDialog: ReturnType<
    typeof useAppLogic
  >["actions"]["openConfirmationDialog"];
  onOpenMaintenanceModal: (
    record: Partial<MaintenanceRecord> | null,
    viewOnly?: boolean
  ) => void;
  onDeleteMaintenance: (recordId: string) => void;
}

const getStockBadgeVariant = (
  stock: number
): "default" | "destructive" | "warning" => {
  if (stock === 0) return "destructive";
  if (stock < 10) return "warning";
  return "default";
};

const getStatusBadgeVariant = (
  dueIn: number
): "success" | "destructive" | "warning" => {
  if (dueIn <= 50) return "destructive";
  if (dueIn <= 100) return "warning";
  return "success";
};

const MachineDetailView: React.FC<MachineDetailViewProps> = ({
  machine,
  filterTypes,
  filterGroups,
  onAssignFilter,
  onBack,
  onAddFilterType,
  onRemoveFilterType,
  onOpenConfirmationDialog,
  maintenanceRecords,
  onOpenMaintenanceModal,
  onDeleteMaintenance,
}) => {
  const { actions: { addToast } } = useAppLogic();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedNewFilterType, setSelectedNewFilterType] =
    useState<string>("");
  const [assignedFilterGroups, setAssignedFilterGroups] = useState<Record<string, string>>({});
  const [localAssignedFilters, setLocalAssignedFilters] = useState<EnhancedAssignedFilter[]>([]);
  
  // Create a local enhanced version of AssignedFilter with a unique ID
  interface EnhancedAssignedFilter extends AssignedFilter {
    uniqueId: string;
  }

  // Generate a unique ID for each assigned filter
  const generateUniqueId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Convert AssignedFilter to EnhancedAssignedFilter
  const enhanceAssignedFilters = (filters: AssignedFilter[]): EnhancedAssignedFilter[] => {
    return filters.map((filter, index) => ({
      ...filter,
      uniqueId: `${filter.filterTypeId}-${index}-${generateUniqueId()}`
    }));
  };

  // Synchroniser les filtres assignés locaux avec ceux du parent
  useEffect(() => {
    setLocalAssignedFilters(enhanceAssignedFilters(machine.assignedFilters));
  }, [machine.assignedFilters]);
  
  // Générer un identifiant unique pour chaque instance de filtre assigné
  const getFilterInstanceKey = (assignedFilter: EnhancedAssignedFilter) => {
    return assignedFilter.uniqueId;
  }

  const availableFilterTypes = useMemo(() => {
    return filterTypes;
  }, [filterTypes]);

  useEffect(() => {
    // Initialiser au premier chargement
    if (filterTypes.length > 0 && !selectedNewFilterType) {
      setSelectedNewFilterType(filterTypes[0].id);
    }
  }, [filterTypes]); // Dépend de filterTypes pour se mettre à jour si la liste change

  const machineMaintenanceHistory = useMemo(() => {
    return maintenanceRecords
      .filter((record) => record.machineId === machine.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [maintenanceRecords, machine.id]);

  const nextMaintenance = useMemo(() => {
    const history = maintenanceRecords.filter(
      (r) => r.machineId === machine.id
    );
    return calculateNextMaintenance(machine, history);
  }, [machine, maintenanceRecords]);

  const handleDeleteMaintenanceClick = (record: MaintenanceRecord) => {
    onOpenConfirmationDialog({
      title: "Supprimer l'enregistrement",
      description: `Êtes-vous sûr de vouloir supprimer cette opération de maintenance du ${new Date(
        record.date
      ).toLocaleDateString()} ? Cette action est irréversible.`,
      onConfirm: () => onDeleteMaintenance(record.id),
    });
  };

  const handleFilterChange = (
    filterInstanceKey: string,
    filterTypeId: string,
    newFilterGroupId: string
  ) => {
    // Mettre à jour l'état local avec la clé unique
    setAssignedFilterGroups(prev => ({
      ...prev,
      [filterInstanceKey]: newFilterGroupId
    }));
    
    // Mettre à jour également notre état local de filtres assignés
    // Only update the specific filter instance, not all filters with the same type
    setLocalAssignedFilters(prev => {
      return prev.map(filter => {
        // Si le filtre correspond à l'instance en cours de modification
        if (filter.uniqueId === filterInstanceKey) {
          return {
            ...filter,
            filterGroupId: newFilterGroupId === "none" ? null : newFilterGroupId
          };
        }
        return filter;
      });
    });

    // Appeler la fonction parent
    onAssignFilter(
      machine.id,
      filterTypeId,
      newFilterGroupId === "none" ? null : newFilterGroupId
    );
  };

  const handleAddClick = () => {
    if (selectedNewFilterType) {
      // Appeler la fonction parent
      onAddFilterType(machine.id, selectedNewFilterType);
      
      // Ne pas ajouter manuellement à l'état local ici
      // Le useEffect se chargera de synchroniser avec l'état parent
    }
  };

  const handleRemoveClick = (filterInstanceKey: string, filterTypeId: string) => {
    onOpenConfirmationDialog({
      title: "Supprimer le type de filtre",
      description:
        "Êtes-vous sûr de vouloir supprimer ce filtre pour cet engin ? L'assignation sera perdue.",
      onConfirm: () => {
        // Supprimer l'entrée de l'état local
        setAssignedFilterGroups(prev => {
          const newState = { ...prev };
          delete newState[filterInstanceKey];
          return newState;
        });

        // Supprimer uniquement l'instance spécifique de notre état local
        const newLocalAssignedFilters = localAssignedFilters.filter(
          filter => filter.uniqueId !== filterInstanceKey
        );
        setLocalAssignedFilters(newLocalAssignedFilters);

        // Vérifier s'il reste d'autres instances du même type
        const remainingInstances = newLocalAssignedFilters.filter(
          filter => filter.filterTypeId === filterTypeId
        );

        // Si c'était la dernière instance de ce type, on appelle la fonction parent
        if (remainingInstances.length === 0) {
          onRemoveFilterType(machine.id, filterTypeId);
        }

        // Afficher un toast pour confirmer la suppression
        addToast({
          type: "success",
          title: "Filtre supprimé",
          description: "Le filtre a été supprimé avec succès."
        });
      },
    });
  };

  const sortedAssignedFilters = [...localAssignedFilters].sort((a, b) => {
    const nameA =
      filterTypes.find((ft) => ft.id === a.filterTypeId)?.name || "";
    const nameB =
      filterTypes.find((ft) => ft.id === b.filterTypeId)?.name || "";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={onBack} className="mr-4">
          <BackIcon className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Détails de l'unité
            </h1>
            {nextMaintenance && (
              <Badge
                variant={getStatusBadgeVariant(nextMaintenance.dueIn)}
                className="text-base px-4 py-2 flex items-center gap-2"
              >
                {nextMaintenance.dueIn >= 0 ? (
                  <>
                    <span>Prochaine maintenance</span>
                    <span
                      className={`font-bold inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs cursor-help ${
                        rangeColors[
                          nextMaintenance.gamme as keyof typeof rangeColors
                        ]
                      }`}
                      title={
                        rangeTooltips[
                          nextMaintenance.gamme as keyof typeof rangeTooltips
                        ]
                      }
                    >
                      {nextMaintenance.gamme}
                    </span>
                    <span>
                      dans {nextMaintenance.dueIn} hs (à{" "}
                      {nextMaintenance.hours.toLocaleString()} hs)
                    </span>
                  </>
                ) : (
                  <>
                    <span>Maintenance</span>
                    <span
                      className={`font-bold inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs cursor-help ${
                        rangeColors[
                          nextMaintenance.gamme as keyof typeof rangeColors
                        ]
                      }`}
                      title={
                        rangeTooltips[
                          nextMaintenance.gamme as keyof typeof rangeTooltips
                        ]
                      }
                    >
                      {nextMaintenance.gamme}
                    </span>
                    <span>
                      en retard de {-nextMaintenance.dueIn} hs (dû à{" "}
                      {nextMaintenance.hours.toLocaleString()} hs)
                    </span>
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Code</p>
              <p className="text-lg font-semibold">{machine.code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Désignation
              </p>
              <p className="text-lg font-semibold">{machine.designation}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Marque
              </p>
              <p className="text-lg font-semibold">{machine.marque}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-lg font-semibold">{machine.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Numéro de Série
              </p>
              <p className="text-lg font-semibold">
                {machine.serialNumber || "Non renseigné"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Immatriculation
              </p>
              <p className="text-lg font-semibold">
                {machine.registrationNumber || "Non renseigné"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Heures de service
              </p>
              <p className="text-lg font-semibold">
                {machine.serviceHours.toLocaleString()} hs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Historique de Maintenance
              </h1>
              <CardDescription>
                Consultez et gérez les opérations de maintenance de cet engin.
              </CardDescription>
            </div>
            <Button
              onClick={() => onOpenMaintenanceModal({ machineId: machine.id })}
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              Ajouter une maintenance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {machineMaintenanceHistory.length > 0 ? (
            <div className="rounded-md border mt-6">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Gamme</TableHead>
                    <TableHead>Heures de service</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineMaintenanceHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-bold inline-block text-center w-8 h-8 leading-8 rounded-full border text-xs cursor-help ${
                            rangeColors[record.maintenanceRange]
                          }`}
                          title={rangeTooltips[record.maintenanceRange]}
                        >
                          {record.maintenanceRange}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.serviceHours.toLocaleString()} hs
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onOpenMaintenanceModal(record, true)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteMaintenanceClick(record)}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun historique de maintenance pour cet engin.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 ">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Filtrations de l'unité
              </h1>
              <CardDescription>
                Assignez un groupe de filtres compatibles pour chaque type de
                filtre.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAdding(!isAdding)}
              className="flex-shrink-0"
            >
              {!isAdding ? (
                <>
                  <PlusIcon className="mr-2 h-5 w-5" />
                  <span>Ajouter un type de filtre</span>
                </>
              ) : (
                <span>Annuler</span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdding && (
            <div className="p-4 border rounded-lg bg-muted/50 animate-fadeIn">
              <h4 className="font-semibold mb-2">
                Ajouter un nouveau type de filtre
              </h4>
              {availableFilterTypes.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedNewFilterType}
                    onChange={(e) => setSelectedNewFilterType(e.target.value)}
                    className="flex-grow"
                  >
                    {filterTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.name}
                      </option>
                    ))}
                  </Select>
                  <Button onClick={handleAddClick}>Ajouter</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tous les types de filtres disponibles ont déjà été ajoutés.
                </p>
              )}
            </div>
          )}

          {sortedAssignedFilters.map((assignedFilter) => {
            // Créer une clé unique pour cette instance de filtre
            const filterInstanceKey = getFilterInstanceKey(assignedFilter);
            const filterType = filterTypes.find(
              (ft) => ft.id === assignedFilter.filterTypeId
            );
            if (!filterType) return null;

            // Utiliser la valeur de l'état local si elle existe, sinon la valeur originale
            const assignedGroupId = assignedFilterGroups[filterInstanceKey] || assignedFilter.filterGroupId;
            const filterGroup = assignedGroupId
              ? filterGroups.find((fg) => fg.id === assignedGroupId)
              : null;
            const references = filterGroup?.references || [];

            const originalReference = filterGroup?.originalReferenceId
              ? references.find(
                  (ref) => ref.id === filterGroup.originalReferenceId
                )
              : null;

            const compatibleReferences = originalReference
              ? references.filter((ref) => ref.id !== originalReference.id)
              : references;

            return (
              <Card
                key={filterInstanceKey}
                className="border-border overflow-hidden"
              >
                <CardHeader className="flex flex-row justify-between items-start">
                  <div className="flex flex-row justify-between w-full">
                    <CardTitle className="text-xl">{filterType.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                      onClick={() => handleRemoveClick(filterInstanceKey, filterType.id)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <span className="text-sm font-medium">
                      Groupe de filtres assigné :
                    </span>
                    <Select
                      value={assignedFilterGroups[filterInstanceKey] || assignedFilter.filterGroupId || "none"}
                      onChange={(e) =>
                        handleFilterChange(filterInstanceKey, filterType.id, e.target.value)
                      }
                      className="max-w-xs"
                    >
                      <option value="none">-- Non assigné --</option>
                      {filterGroups
                        .filter((group) => group.filterType === filterType.id)
                        .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                    </Select>
                  </div>

                  {(assignedFilterGroups[filterInstanceKey] || assignedFilter.filterGroupId) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      {originalReference && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-muted-foreground mb-2">
                            Référence originale :
                          </h4>
                          <div className="rounded-md border">
                            <Table className="table-zebra">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Image</TableHead>
                                  <TableHead>Référence</TableHead>
                                  <TableHead>Fabricant</TableHead>
                                  <TableHead>Prix (DA)</TableHead>
                                  <TableHead>Stock</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow key={originalReference.id}>
                                  <TableCell>
                                    {originalReference.image ? (
                                      <img
                                        src={originalReference.image}
                                        alt={originalReference.reference}
                                        className="h-12 w-12 object-contain rounded-sm bg-white p-1"
                                      />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {originalReference.reference}
                                  </TableCell>
                                  <TableCell>
                                    {originalReference.manufacturer}
                                  </TableCell>
                                  <TableCell>
                                    {originalReference.price.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={getStockBadgeVariant(
                                        originalReference.stock
                                      )}
                                    >
                                      {originalReference.stock}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      <h4 className="font-semibold text-muted-foreground mb-2">
                        Références compatibles :
                      </h4>
                      {compatibleReferences.length > 0 ? (
                        <div className="rounded-md border">
                          <Table className="table-zebra">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Référence</TableHead>
                                <TableHead>Fabricant</TableHead>
                                <TableHead>Prix (DA)</TableHead>
                                <TableHead>Stock</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {compatibleReferences.map((ref) => (
                                <TableRow key={ref.id}>
                                  <TableCell>
                                    {ref.image ? (
                                      <img
                                        src={ref.image}
                                        alt={ref.reference}
                                        className="h-12 w-12 object-contain rounded-sm bg-white p-1"
                                      />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        N/A
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>{ref.reference}</TableCell>
                                  <TableCell>{ref.manufacturer}</TableCell>
                                  <TableCell>
                                    {ref.price.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={getStockBadgeVariant(ref.stock)}
                                    >
                                      {ref.stock}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {originalReference
                            ? "Aucune autre référence compatible dans ce groupe."
                            : "Aucune référence dans ce groupe."}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineDetailView;
