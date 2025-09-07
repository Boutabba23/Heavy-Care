"use client";

import React, { useMemo, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Machine,
  FilterGroup,
  MaintenanceRecord,
  FilterReference,
  View,
  FilterType,
} from "../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/Table";
import {
  TruckIcon,
  ExcavatorIcon,
  FilterIcon,
  WrenchIcon,
  SparklesIcon,
  DocumentTextIcon,
} from "../constants";
import { calculateNextMaintenance } from "../utils/maintenance";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import BarChart from "./ui/BarChart";

interface DashboardViewProps {
  machines: Machine[];
  filterGroups: FilterGroup[];
  maintenanceRecords: MaintenanceRecord[];
  onSelectMachine: (machineId: string) => void;
  onSetView: (view: View) => void;
}

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ title, value, icon, onClick, className, style }) => (
  <Card
    onClick={onClick}
    className={`cursor-pointer hover:shadow-md hover:border-primary/50 ${
      className || ""
    }`}
    style={style}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const getStockBadgeVariant = (
  stock: number
): "default" | "destructive" | "warning" => {
  if (stock === 0) return "destructive";
  if (stock < 10) return "warning";
  return "default";
};

const DashboardView: React.FC<DashboardViewProps> = ({
  machines,
  filterGroups,
  maintenanceRecords,
  onSelectMachine,
  onSetView,
}) => {
  const lowStockItems = useMemo((): FilterReference[] => {
    const items: FilterReference[] = [];
    filterGroups.forEach((group) => {
      group.references.forEach((ref) => {
        if (ref.stock < 10) {
          items.push(ref);
        }
      });
    });
    return items.sort((a, b) => a.stock - b.stock);
  }, [filterGroups]);

  const upcomingMaintenance = useMemo(() => {
    const upcoming: (Machine & {
      nextMaint: { gamme: string; hours: number; dueIn: number };
    })[] = [];
    const historyByMachine = new Map<string, MaintenanceRecord[]>();
    maintenanceRecords.forEach((rec) => {
      if (!historyByMachine.has(rec.machineId))
        historyByMachine.set(rec.machineId, []);
      historyByMachine.get(rec.machineId)!.push(rec);
    });

    machines.forEach((machine) => {
      const history = historyByMachine.get(machine.id) || [];
      const nextMaint = calculateNextMaintenance(machine, history);
      if (nextMaint && nextMaint.dueIn <= 100) {
        upcoming.push({ ...machine, nextMaint });
      }
    });
    return upcoming.sort((a, b) => a.nextMaint.dueIn - b.nextMaint.dueIn);
  }, [machines, maintenanceRecords]);

  const machineBrandsData = useMemo(() => {
    const brandCounts = machines.reduce((acc, machine) => {
      acc[machine.marque] = (acc[machine.marque] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(brandCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [machines]);

  const maintenanceHistoryData = useMemo(() => {
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const history: Record<string, number> = {};
    const monthLabels: Record<string, string> = {};

    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const monthLabel = `${monthNames[d.getMonth()]}'${String(
        d.getFullYear()
      ).slice(-2)}`;
      history[monthKey] = 0;
      monthLabels[monthKey] = monthLabel;
    }

    maintenanceRecords.forEach((record) => {
      const recordDate = new Date(record.date);
      const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`;
      if (monthKey in history) {
        history[monthKey]++;
      }
    });

    return Object.keys(history).map((key) => ({
      label: monthLabels[key],
      value: history[key],
    }));
  }, [maintenanceRecords]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Un aperçu de votre parc et de votre inventaire.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Engins"
          value={machines.length}
          icon={<ExcavatorIcon className="h-5 w-5" />}
          onClick={() => onSetView(View.MACHINE_LIST)}
          className="animate-slideInUp"
          style={{ animationDelay: "100ms" }}
        />
        <StatCard
          title="Groupes de Filtres"
          value={filterGroups.length}
          icon={<FilterIcon className="h-5 w-5" />}
          onClick={() => onSetView(View.FILTER_MANAGEMENT)}
          className="animate-slideInUp"
          style={{ animationDelay: "200ms" }}
        />
        <StatCard
          title="Opérations de Maintenance"
          value={maintenanceRecords.length}
          icon={<WrenchIcon className="h-5 w-5" />}
          onClick={() => onSetView(View.MAINTENANCE)}
          className="animate-slideInUp"
          style={{ animationDelay: "300ms" }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card
          className="flex flex-col animate-slideInUp"
          style={{ animationDelay: "400ms" }}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Maintenance à Venir</CardTitle>
                <CardDescription>
                  Engins nécessitant une maintenance dans les 100 prochaines
                  heures.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetView(View.MAINTENANCE)}
              >
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {upcomingMaintenance.length > 0 ? (
              <div className="space-y-4">
                {upcomingMaintenance.map((machine) => (
                  <div
                    key={machine.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-semibold">{machine.designation}</p>
                      <p className="text-sm text-muted-foreground">
                        {machine.marque} - {machine.code}
                      </p>
                    </div>
                    <div className="text-right">
                      {machine.nextMaint.dueIn >= 0 ? (
                        <>
                          <p
                            className={`font-bold text-lg ${
                              machine.nextMaint.dueIn < 25
                                ? "text-destructive"
                                : "text-warning"
                            }`}
                          >
                            {machine.nextMaint.dueIn} hs
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Gamme {machine.nextMaint.gamme} à{" "}
                            {machine.nextMaint.hours.toLocaleString()} hs
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-lg text-destructive">
                            En Retard
                          </p>
                          <p className="text-xs text-muted-foreground">
                            de {-machine.nextMaint.dueIn} hs
                          </p>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectMachine(machine.id)}
                    >
                      Détails
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Aucune maintenance urgente à signaler.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className="flex flex-col animate-slideInUp"
          style={{ animationDelay: "500ms" }}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Stock Faible</CardTitle>
                <CardDescription>
                  Références avec moins de 10 unités en stock.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetView(View.FILTER_MANAGEMENT)}
              >
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {lowStockItems.length > 0 ? (
              <div className="relative w-full border rounded-md max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Fabricant</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.reference}
                        </TableCell>
                        <TableCell>{item.manufacturer}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getStockBadgeVariant(item.stock)}>
                            {item.stock}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Aucune alerte de stock faible.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card
          className="flex flex-col animate-slideInUp"
          style={{ animationDelay: "600ms" }}
        >
          <CardHeader>
            <CardTitle>Répartition du parc par marque</CardTitle>
            <CardDescription>
              Visualisation du nombre d'engins pour chaque marque.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <BarChart data={machineBrandsData} />
          </CardContent>
        </Card>
        <Card
          className="flex flex-col animate-slideInUp"
          style={{ animationDelay: "700ms" }}
        >
          <CardHeader>
            <CardTitle>Historique des Maintenances</CardTitle>
            <CardDescription>
              Nombre d'opérations effectuées au cours des 6 derniers mois.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <BarChart data={maintenanceHistoryData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;

// --- ANALYTICS VIEW ---

interface AnalyticsViewProps {
  machines: Machine[];
  filterGroups: FilterGroup[];
  maintenanceRecords: MaintenanceRecord[];
  filterTypes: FilterType[];
}

const AnalyticsStatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ title, value, icon, description, className, style }) => (
  <Card className={className} style={style}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  machines,
  filterGroups,
  maintenanceRecords,
  filterTypes,
}) => {
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [activeChart, setActiveChart] = useState<"machine" | "filterType">(
    "machine"
  );

  const analyticsData = useMemo(() => {
    // --- Stat Cards Data ---
    const overdueMachines = machines.filter((m) => {
      const history = maintenanceRecords.filter((r) => r.machineId === m.id);
      const nextMaint = calculateNextMaintenance(m, history);
      return nextMaint && nextMaint.dueIn < 0;
    }).length;

    const totalStockValue = filterGroups.reduce((total, group) => {
      return (
        total +
        group.references.reduce((groupTotal, ref) => {
          return groupTotal + ref.price * ref.stock;
        }, 0)
      );
    }, 0);

    const allUsedFilters = maintenanceRecords.flatMap((rec) => rec.filtersUsed);
    const mostUsedFilter = allUsedFilters.reduce((acc, curr) => {
      acc[curr.referenceId] = (acc[curr.referenceId] || 0) + curr.quantity;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedFilterId = Object.keys(mostUsedFilter).sort(
      (a, b) => mostUsedFilter[b] - mostUsedFilter[a]
    )[0];
    let mostUsedFilterName = "N/A";
    if (mostUsedFilterId) {
      for (const group of filterGroups) {
        const ref = group.references.find((r) => r.id === mostUsedFilterId);
        if (ref) {
          mostUsedFilterName = ref.reference;
          break;
        }
      }
    }

    // --- Maintenance Cost Per Machine Chart ---
    const maintenanceCostByMachine = machines
      .map((machine) => {
        const cost = maintenanceRecords
          .filter((rec) => rec.machineId === machine.id)
          .reduce((totalCost, rec) => {
            return (
              totalCost +
              rec.filtersUsed.reduce((recCost, usedFilter) => {
                for (const group of filterGroups) {
                  const ref = group.references.find(
                    (r) => r.id === usedFilter.referenceId
                  );
                  if (ref) return recCost + ref.price * usedFilter.quantity;
                }
                return recCost;
              }, 0)
            );
          }, 0);

        return {
          label:
            machine.designation.length > 20
              ? machine.designation.substring(0, 17) + "..."
              : machine.designation,
          value: cost,
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // --- NEW: Maintenance Cost Per Filter Type Chart ---
    const costByFilterType: Record<string, number> = {};
    maintenanceRecords.forEach((rec) => {
      rec.filtersUsed.forEach((usedFilter) => {
        let price = 0;
        for (const group of filterGroups) {
          const ref = group.references.find(
            (r) => r.id === usedFilter.referenceId
          );
          if (ref) {
            price = ref.price;
            break;
          }
        }
        const currentCost = costByFilterType[usedFilter.filterTypeId] || 0;
        costByFilterType[usedFilter.filterTypeId] =
          currentCost + price * usedFilter.quantity;
      });
    });

    const maintenanceCostByFilterType = Object.entries(costByFilterType)
      .map(([typeId, cost]) => {
        const filterType = filterTypes.find((ft) => ft.id === typeId);
        const label = filterType ? filterType.name : "Type Inconnu";
        return {
          label: label.length > 20 ? label.substring(0, 17) + "..." : label,
          value: Math.round(cost),
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      overdueMachines,
      totalStockValue,
      mostUsedFilterName,
      maintenanceCostByMachine,
      maintenanceCostByFilterType,
    };
  }, [machines, filterGroups, maintenanceRecords, filterTypes]);

  const handlePrintReport = () => {
    const printArea = document.getElementById("ai-report-print-area");
    if (printArea) {
      printArea.classList.add("print-area");
      window.print();
      printArea.classList.remove("print-area");
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setAiSummary("");

    if (
      !process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY &&
      !process.env.GOOGLE_AI_API_KEY
    ) {
      setAiSummary(
        "<p class='text-destructive'>La clé API pour le service IA n'est pas configurée. Veuillez la définir dans les variables d'environnement.</p>"
      );
      setIsGeneratingSummary(false);
      return;
    }

    try {
      const ai = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ||
          process.env.GOOGLE_AI_API_KEY ||
          ""
      );

      const upcomingMaintenance = machines
        .map((machine) => {
          const history = maintenanceRecords.filter(
            (r) => r.machineId === machine.id
          );
          const nextMaint = calculateNextMaintenance(machine, history);
          return {
            designation: machine.designation,
            code: machine.code,
            serviceHours: machine.serviceHours,
            nextMaintenanceDueIn: nextMaint?.dueIn,
            nextMaintenanceHours: nextMaint?.hours,
          };
        })
        .filter(
          (m) =>
            m.nextMaintenanceDueIn !== undefined &&
            m.nextMaintenanceDueIn <= 100
        );

      const lowStockItems = filterGroups
        .flatMap((group) => group.references.filter((ref) => ref.stock < 10))
        .map((ref) => ({ reference: ref.reference, stock: ref.stock }));

      const prompt = `
                Voici les données actuelles de la flotte :
                - Nombre total d'engins : ${machines.length}
                - Valeur totale du stock de filtres : ${analyticsData.totalStockValue.toLocaleString()} DA

                Engins avec maintenance imminente ou en retard (due dans <= 100 heures) :
                ${JSON.stringify(upcomingMaintenance, null, 2)}

                Articles en stock faible (stock < 10) :
                ${JSON.stringify(lowStockItems, null, 2)}
                
                Coûts de maintenance par type de filtre (Top 10) :
                ${JSON.stringify(
                  analyticsData.maintenanceCostByFilterType,
                  null,
                  2
                )}

                Veuillez analyser ces données et fournir un résumé de gestion.
            `;

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(prompt);

      let formattedText = response.response
        .text()
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/(\r\n|\n|\r)/g, "<br />")
        .replace(/- (.*?)(<br \/>)/g, '<li class="ml-4 list-disc">$1</li>')
        .replace(/(<li.*<\/li>)+/g, "<ul>$&</ul>");

      setAiSummary(formattedText);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setAiSummary(
        "<p class='text-destructive'>Une erreur s'est produite lors de la génération du résumé. Veuillez réessayer.</p>"
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Analyses & Rapports
        </h1>
        <p className="text-muted-foreground">
          Informations clés sur la santé et les coûts de votre flotte.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsStatCard
          title="Maintenance en Retard"
          value={analyticsData.overdueMachines}
          description="Engins ayant dépassé leur intervalle"
          icon={<WrenchIcon className="h-5 w-5" />}
          className="animate-slideInUp"
          style={{ animationDelay: "100ms" }}
        />
        <AnalyticsStatCard
          title="Valeur du Stock"
          value={`${analyticsData.totalStockValue.toLocaleString()} DA`}
          description="Valeur totale de tous les filtres"
          icon={<FilterIcon className="h-5 w-5" />}
          className="animate-slideInUp"
          style={{ animationDelay: "200ms" }}
        />
        <AnalyticsStatCard
          title="Filtre le Plus Utilisé"
          value={analyticsData.mostUsedFilterName}
          description="Basé sur l'historique de maintenance"
          icon={<ExcavatorIcon className="h-5 w-5" />}
          className="animate-slideInUp"
          style={{ animationDelay: "300ms" }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card
          className="flex flex-col animate-slideInUp xl:min-h-[400px]"
          style={{ animationDelay: "400ms" }}
        >
          <CardHeader>
            <CardTitle>Résumé de la Flotte par IA</CardTitle>
            <CardDescription>
              Obtenez une analyse instantanée de l'état de votre parc.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
            >
              <SparklesIcon className="mr-2 h-5 w-5" />
              {isGeneratingSummary
                ? "Génération en cours..."
                : "Générer un résumé IA"}
            </Button>
            {(isGeneratingSummary || aiSummary) && (
              <div
                id="ai-report-print-area"
                className="mt-4 p-4 border rounded-lg bg-muted/30 flex-1 space-y-2 text-sm"
              >
                {isGeneratingSummary && (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    L'assistant IA analyse les données...
                  </p>
                )}
                {aiSummary && (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: aiSummary }} />
                    <div className="pt-4 mt-4 border-t no-print">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintReport}
                      >
                        <DocumentTextIcon className="mr-2 h-4 w-4" />
                        Imprimer le rapport
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card
          className="flex flex-col animate-slideInUp xl:min-h-[400px]"
          style={{ animationDelay: "500ms" }}
        >
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
              <div>
                <CardTitle>
                  {activeChart === "machine"
                    ? "Top 10 - Coût de Maintenance par Engin"
                    : "Top 10 - Coût par Type de Filtre"}
                </CardTitle>
                <CardDescription>
                  {activeChart === "machine"
                    ? "Coût total des filtres utilisés pour chaque engin."
                    : "Coût total des filtres par catégorie."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-muted self-start sm:self-center">
                <Button
                  size="sm"
                  variant={activeChart === "machine" ? "secondary" : "ghost"}
                  onClick={() => setActiveChart("machine")}
                >
                  Par Engin
                </Button>
                <Button
                  size="sm"
                  variant={activeChart === "filterType" ? "secondary" : "ghost"}
                  onClick={() => setActiveChart("filterType")}
                >
                  Par Filtre
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <BarChart
              data={
                activeChart === "machine"
                  ? analyticsData.maintenanceCostByMachine
                  : analyticsData.maintenanceCostByFilterType
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
