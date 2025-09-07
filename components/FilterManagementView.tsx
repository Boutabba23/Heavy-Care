import React, { useState, useEffect, useRef } from "react";
import {
  FilterGroup,
  FilterType,
  StockUpdateInfo,
  FilterReference,
} from "../types";
import Button from "./ui/Button";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  EllipsisVerticalIcon,
  FilterIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
} from "../constants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/Table";
import Input from "./ui/Input";
import Select from "./ui/Select";
import EmptyState from "./ui/EmptyState";
import { useAppLogic } from "../hooks/useAppLogic";
import Badge from "./ui/Badge";
import { exportFiltersToCSV } from "../utils/export";
import QRCodeModal from "./QRCodeModal";

interface FilterManagementViewProps {
  filterGroups: FilterGroup[];
  filterTypes: FilterType[];
  onDeleteGroup: (groupId: string) => void;
  onOpenFilterGroupModal: (group: FilterGroup | null) => void;
  onOpenConfirmationDialog: ReturnType<
    typeof useAppLogic
  >["actions"]["openConfirmationDialog"];
  highlightedFilterGroupId: string | null;
  onClearHighlight: () => void;
  onOpenAddStockModal: (info: StockUpdateInfo) => void;
}

const getStockBadgeVariant = (
  stock: number
): "default" | "destructive" | "warning" => {
  if (stock === 0) return "destructive";
  if (stock < 10) return "warning";
  return "default";
};

// Function to get badge variant based on filter type
const getFilterTypeBadgeVariant = (
  filterTypeId: string
): "default" | "destructive" | "warning" | "success" => {
  // Define color mapping for different filter types based on actual IDs in the database
  const filterTypeColorMap: Record<
    string,
    "default" | "destructive" | "warning" | "success"
  > = {
    "ft-oil": "success", // Green for oil filters
    "ft-air": "warning", // Yellow for air filters
    "ft-fuel": "destructive", // Red for fuel filters
    "ft-hydraulic": "default", // Blue for hydraulic filters
    "ft-transmission": "default", // Blue for transmission filters
    // Add more mappings as needed
  };

  // Return the mapped color or default if not found
  return filterTypeColorMap[filterTypeId] || "default";
};

const FilterManagementView: React.FC<FilterManagementViewProps> = (props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterType, setSelectedFilterType] = useState("");
  const [openGroupMenuId, setOpenGroupMenuId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [qrCodeModalGroup, setQrCodeModalGroup] = useState<FilterGroup | null>(
    null
  );
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (props.highlightedFilterGroupId) {
      setHighlightedId(props.highlightedFilterGroupId);
      const element = groupRefs.current[props.highlightedFilterGroupId];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          setHighlightedId(null);
          props.onClearHighlight();
        }, 2000); // Duration of the highlight animation
      } else {
        props.onClearHighlight();
      }
    }
  }, [props.highlightedFilterGroupId, props.onClearHighlight]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openGroupMenuId && !target.closest(".menu-container")) {
        setOpenGroupMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openGroupMenuId]);

  const handleDeleteClick = (group: FilterGroup) => {
    props.onOpenConfirmationDialog({
      title: "Supprimer le groupe de filtres",
      description: `Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ? Cette action est irréversible et le groupe sera désassigné de tous les engins.`,
      onConfirm: () => props.onDeleteGroup(group.id),
    });
  };

  const handleAddStockClick = (
    e: React.MouseEvent,
    filterReference: FilterReference,
    filterGroupId: string
  ) => {
    e.stopPropagation();
    props.onOpenAddStockModal({ filterReference, filterGroupId });
  };

  const filteredFilterGroups = props.filterGroups.filter((group) => {
    // Filter by search query (name, references, manufacturer)
    const matchesSearchQuery =
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.references.some(
        (ref) =>
          ref.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ref.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Filter by filter type if selected
    const matchesFilterType =
      !selectedFilterType || group.filterType === selectedFilterType;

    return matchesSearchQuery && matchesFilterType;
  });

  const renderContent = () => {
    if (props.filterGroups.length === 0) {
      return (
        <EmptyState
          icon={<FilterIcon className="h-24 w-24" />}
          title="Aucun groupe de filtres créé"
          description="Commencez par créer votre premier groupe pour organiser vos références de filtres compatibles."
          action={
            <Button onClick={() => props.onOpenFilterGroupModal(null)}>
              <PlusIcon className="mr-2 h-5 w-5" />
              Créer un groupe de filtres
            </Button>
          }
        />
      );
    }

    if (
      filteredFilterGroups.length === 0 &&
      (searchQuery || selectedFilterType)
    ) {
      const filterDescription = [];
      if (searchQuery) filterDescription.push(`recherche "${searchQuery}"`);
      if (selectedFilterType) {
        const filterTypeName =
          props.filterTypes.find((ft) => ft.id === selectedFilterType)?.name ||
          "filtre sélectionné";
        filterDescription.push(`type "${filterTypeName}"`);
      }

      return (
        <EmptyState
          icon={<SearchIcon className="h-24 w-24" />}
          title="Aucun résultat"
          description={`Aucun groupe de filtres ne correspond à votre ${filterDescription.join(
            " et "
          )}.`}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedFilterType("");
              }}
            >
              Effacer les filtres
            </Button>
          }
        />
      );
    }

    return (
      <div className="space-y-6">
        {filteredFilterGroups.map((group) => {
          const originalReference = group.originalReferenceId
            ? group.references.find(
                (ref) => ref.id === group.originalReferenceId
              )
            : null;

          const compatibleReferences = originalReference
            ? group.references.filter((ref) => ref.id !== originalReference.id)
            : group.references;

          return (
            <Card
              key={group.id}
              // fix: The ref callback for a forwarded ref should not return a value.
              // Wrapping the assignment in curly braces `{}` makes the arrow function return `void`.
              ref={(el) => {
                groupRefs.current[group.id] = el;
              }}
              className={highlightedId === group.id ? "highlight-effect" : ""}
            >
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 mr-2 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle>{group.name}</CardTitle>
                      {group.filterType && (
                        <Badge
                          variant={getFilterTypeBadgeVariant(group.filterType)}
                          className="text-xs px-2 py-0.5"
                        >
                          {props.filterTypes.find(
                            (ft) => ft.id === group.filterType
                          )?.name || "Type inconnu"}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                      {group.references.length} référence(s) au total.
                    </CardDescription>
                  </div>
                  <div className="relative menu-container flex-shrink-0 flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrCodeModalGroup(group);
                      }}
                    >
                      <QrCodeIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenGroupMenuId(
                          openGroupMenuId === group.id ? null : group.id
                        );
                      }}
                    >
                      <EllipsisVerticalIcon />
                    </Button>
                    {openGroupMenuId === group.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50 animate-fadeIn">
                        <ul className="py-1">
                          <li>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                props.onOpenFilterGroupModal(group);
                                setOpenGroupMenuId(null);
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
                                handleDeleteClick(group);
                                setOpenGroupMenuId(null);
                              }}
                              className="w-full text-left flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                            >
                              <TrashIcon className="mr-3 h-4 w-4" />
                              Supprimer
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {originalReference && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-muted-foreground mb-2">
                      Référence originale :
                    </h4>
                    <div className="rounded-md border">
                      <Table className="table-zebra">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Image</TableHead>
                            <TableHead className="min-w-20">
                              Référence
                            </TableHead>
                            <TableHead className="min-w-24">
                              Fabricant
                            </TableHead>
                            <TableHead className="min-w-16">
                              Prix (DA)
                            </TableHead>
                            <TableHead className="w-16">Stock</TableHead>
                            <TableHead className="text-right w-24">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow key={originalReference.id}>
                            <TableCell className="w-12">
                              {originalReference.image ? (
                                <img
                                  src={originalReference.image}
                                  alt={originalReference.reference}
                                  className="h-10 w-10 object-contain rounded-sm bg-white p-1"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  N/A
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-20 text-sm">
                              {originalReference.reference}
                            </TableCell>
                            <TableCell className="min-w-24 text-sm whitespace-nowrap">
                              {originalReference.manufacturer}
                            </TableCell>
                            <TableCell className="min-w-16 text-sm">
                              {originalReference.price.toLocaleString()}
                            </TableCell>
                            <TableCell className=" w-16">
                              <Badge
                                variant={getStockBadgeVariant(
                                  originalReference.stock
                                )}
                              >
                                {originalReference.stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right w-24">
                              <Button
                                size="sm"
                                onClick={(e) =>
                                  handleAddStockClick(
                                    e,
                                    originalReference,
                                    group.id
                                  )
                                }
                              >
                                <PlusIcon className="mr-1 h-5 w-5" />
                                <span>Stock</span>
                              </Button>
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
                          <TableHead className="w-12">Image</TableHead>
                          <TableHead className="min-w-20">Référence</TableHead>
                          <TableHead className="min-w-24">Fabricant</TableHead>
                          <TableHead className="min-w-16">Prix (DA)</TableHead>
                          <TableHead className="w-16">Stock</TableHead>
                          <TableHead className="text-right w-24">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compatibleReferences.map((ref) => (
                          <TableRow key={ref.id}>
                            <TableCell className="w-12">
                              {ref.image ? (
                                <img
                                  src={ref.image}
                                  alt={ref.reference}
                                  className="h-10 w-10 object-contain rounded-sm bg-white p-1"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  N/A
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-20 text-sm">
                              {ref.reference}
                            </TableCell>
                            <TableCell className="min-w-24 text-sm whitespace-nowrap">
                              {ref.manufacturer}
                            </TableCell>
                            <TableCell className="min-w-16 text-sm">
                              {ref.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="w-16">
                              <Badge variant={getStockBadgeVariant(ref.stock)}>
                                {ref.stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right w-24">
                              <Button
                                size="sm"
                                onClick={(e) =>
                                  handleAddStockClick(e, ref, group.id)
                                }
                              >
                                <PlusIcon className="mr-1 h-5 w-5" />
                                <span>Stock</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {originalReference
                      ? "Aucune autre référence compatible ajoutée."
                      : "Aucune référence ajoutée à ce groupe."}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">
                Gestion des Groupes de Filtres
              </CardTitle>
              <CardDescription>
                Créez et organisez vos groupes de filtres compatibles.
              </CardDescription>
            </div>
            <div className="flex items-center flex-shrink-0 gap-2">
              {props.filterGroups.length > 0 && (
                <Button
                  onClick={() => exportFiltersToCSV(props.filterGroups)}
                  variant="outline"
                >
                  <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
                  Exporter
                </Button>
              )}
              <Button onClick={() => props.onOpenFilterGroupModal(null)}>
                <PlusIcon className="mr-2 h-5 w-5" />
                <span>Nouveau Groupe</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {props.filterGroups.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="mb-6">
            <CardTitle>Rechercher un Groupe de Filtres</CardTitle>
            <CardDescription>
              Filtrez par nom de groupe, référence de filtre ou type de filtre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, référence..."
                  className="w-full pl-11"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-64">
                <Select
                  value={selectedFilterType}
                  onChange={(e) => setSelectedFilterType(e.target.value)}
                  className="w-full"
                >
                  <option value="">Tous les types de filtres</option>
                  {props.filterTypes.map((filterType) => (
                    <option key={filterType.id} value={filterType.id}>
                      {filterType.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {renderContent()}

      {qrCodeModalGroup && (
        <QRCodeModal
          isOpen={!!qrCodeModalGroup}
          onClose={() => setQrCodeModalGroup(null)}
          title={qrCodeModalGroup.name}
          url={`${window.location.origin}${window.location.pathname}?filterGroupId=${qrCodeModalGroup.id}`}
        />
      )}
    </div>
  );
};

export default FilterManagementView;
