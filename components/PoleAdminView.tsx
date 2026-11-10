"use client";

import React, { useState } from "react";
import { Machine, FilterGroup, FilterType } from "../types";
import { ExcavatorIcon, FilterIcon, PlusIcon, TrashIcon, PencilIcon } from "../constants";
import MachineModal from "./MachineModal";
import FilterGroupModal from "./FilterGroupModal";
import ConfirmationDialog from "./ConfirmationDialog";
// addToast is passed as a prop from useAppLogic actions

interface PoleAdminViewProps {
  machines: Machine[];
  filterGroups: FilterGroup[];
  filterTypes: FilterType[];
  onSelectMachine: (machineId: string) => void;
  onOpenMachineModal: (machine: Machine | null) => void;
  onDeleteMachine: (machineId: string) => void;
  onOpenFilterGroupModal: (group: FilterGroup | null) => void;
  onDeleteFilterGroup: (groupId: string) => void;
  onOpenConfirmationDialog: (config: {
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "danger" | "warning";
  }) => void;
  poleId: string | null;
  addToast: (toast: { type: "success" | "error" | "info"; title: string; description: string }) => void;
}

const PoleAdminView: React.FC<PoleAdminViewProps> = ({
  machines,
  filterGroups,
  filterTypes,
  onSelectMachine,
  onOpenMachineModal,
  onDeleteMachine,
  onOpenFilterGroupModal,
  onDeleteFilterGroup,
  onOpenConfirmationDialog,
  poleId,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<"machines" | "filters">("machines");
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isFilterGroupModalOpen, setIsFilterGroupModalOpen] = useState(false);
  const [editingFilterGroup, setEditingFilterGroup] = useState<FilterGroup | null>(null);

  const handleOpenMachineModal = (machine: Machine | null) => {
    setEditingMachine(machine);
    setIsMachineModalOpen(true);
  };

  const handleCloseMachineModal = () => {
    setIsMachineModalOpen(false);
    setEditingMachine(null);
  };

  const handleOpenFilterGroupModal = (group: FilterGroup | null) => {
    setEditingFilterGroup(group);
    setIsFilterGroupModalOpen(true);
  };

  const handleCloseFilterGroupModal = () => {
    setIsFilterGroupModalOpen(false);
    setEditingFilterGroup(null);
  };

  const handleDeleteMachine = (machine: Machine) => {
    onOpenConfirmationDialog({
      title: "Supprimer l'engin",
      description: `Voulez-vous vraiment supprimer "${machine.code} - ${machine.designation}" ? Cette action est irréversible.`,
      variant: "danger",
      onConfirm: () => {
        onDeleteMachine(machine.id);
        addToast({
          type: "success",
          title: "Engin supprimé",
          description: `${machine.code} a été supprimé.`,
        });
      },
    });
  };

  const handleDeleteFilterGroup = (group: FilterGroup) => {
    onOpenConfirmationDialog({
      title: "Supprimer le groupe de filtres",
      description: `Voulez-vous vraiment supprimer "${group.name}" et tous ses types de filtres associés ? Cette action est irréversible.`,
      variant: "danger",
      onConfirm: () => {
        onDeleteFilterGroup(group.id);
        addToast({
          type: "success",
          title: "Groupe supprimé",
          description: `${group.name} a été supprimé.`,
        });
      },
    });
  };

  const machineTabs = machines.filter((m) => m.pole_id === poleId);
  const poleFilterGroups = filterGroups.filter((g) => g.pole_id === poleId);
  const poleFilterTypes = filterTypes.filter((t) => t.pole_id === poleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration du Pôle</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des engins, filtres et stocks de votre pôle
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted rounded-xl p-1">
        <button
          onClick={() => setActiveTab("machines")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "machines"
              ? "bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <ExcavatorIcon className="h-4 w-4" />
            Engins ({machineTabs.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab("filters")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "filters"
              ? "bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Filtres ({poleFilterGroups.length} groupes, {poleFilterTypes.length} types)
          </span>
        </button>
      </div>

      {/* Machines Tab */}
      {activeTab === "machines" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Liste des Engins</h2>
            <button
              onClick={() => handleOpenMachineModal(null)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="h-4 w-4" /> Ajouter un engin
            </button>
          </div>

          {machineTabs.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border-2 border-border">
              <ExcavatorIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Aucun engin</h3>
              <p className="text-muted-foreground mt-1">Cliquez sur "Ajouter un engin" pour commencer</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {machineTabs.map((machine) => (
                <div
                  key={machine.id}
                  className="group bg-card rounded-xl border-2 border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                          {machine.code}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            machine.status === "En service"
                              ? "bg-emerald-100 text-emerald-700"
                              : machine.status === "En maintenance"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {machine.status}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold text-foreground truncate">{machine.designation}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{machine.marque}</p>
                      <p className="text-sm text-muted-foreground">{machine.type}</p>
                      {machine.serialNumber && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          S/N: {machine.serialNumber}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {machine.serviceHours}h
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenMachineModal(machine)}
                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                        title="Modifier"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMachine(machine)}
                        className="p-2 rounded-lg bg-muted hover:bg-red-100 hover:text-red-600 text-foreground transition-colors"
                        title="Supprimer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters Tab */}
      {activeTab === "filters" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Groupes de Filtres</h2>
            <button
              onClick={() => handleOpenFilterGroupModal(null)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="h-4 w-4" /> Nouveau groupe
            </button>
          </div>

          {poleFilterGroups.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border-2 border-border">
              <FilterIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Aucun groupe de filtres</h3>
              <p className="text-muted-foreground mt-1">Créez votre premier groupe pour organiser les types de filtres</p>
            </div>
          ) : (
            <div className="space-y-4">
              {poleFilterGroups.map((group) => {
                const groupTypes = poleFilterTypes.filter((t) => t.filter_group_id === group.id);
                return (
                  <div
                    key={group.id}
                    className="bg-card rounded-xl border-2 border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">{group.name}</h3>
                          <span className="text-sm text-muted-foreground font-mono">
                            ({groupTypes.length} type{groupTypes.length > 1 ? "s" : ""})
                          </span>
                        </div>
                        {group.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                        )}
                        {groupTypes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {groupTypes.map((type) => (
                              <span
                                key={type.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                              >
                                {type.name}
                                {type.part_number && (
                                  <span className="font-mono text-muted-foreground ml-1">
                                    ({type.part_number})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenFilterGroupModal(group)}
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFilterGroup(group)}
                          className="p-2 rounded-lg bg-muted hover:bg-red-100 hover:text-red-600 text-foreground transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Machine Modal */}
      {isMachineModalOpen && (
        <MachineModal
          isOpen={isMachineModalOpen}
          onClose={handleCloseMachineModal}
          onSave={(data) => {
            // The saveMachine action is called from useAppLogic
            // We need to trigger it via a callback - for now close and let parent handle
          }}
          machine={editingMachine}
          machines={machines}
        />
      )}

      {/* Filter Group Modal */}
      {isFilterGroupModalOpen && (
        <FilterGroupModal
          isOpen={isFilterGroupModalOpen}
          onClose={handleCloseFilterGroupModal}
          onSave={(data) => {
            // The saveFilterGroup action is called from useAppLogic
          }}
          group={editingFilterGroup}
          allFilterGroups={filterGroups}
          filterTypes={filterTypes}
        />
      )}
    </div>
  );
};

export default PoleAdminView;