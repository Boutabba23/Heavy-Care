"use client";

import React from "react";
import { useAppLogic } from "../hooks/useAppLogic";
import { useAuth } from "../contexts/AuthContext";
import LandingPage from "./LandingPage";
import NoPoleScreen from "./NoPoleScreen";
import MachineDetailView from "./MachineDetailView";import FilterManagementView from "./FilterManagementView";
import UserProfile from "./UserProfile";
import LoginPage from "./LoginPage";
import { Notification, View } from "../types";
import Navbar from "./Navbar";
import MachineListView from "./MachineListView";
import SettingsView from "./ThemeSettingsView";
import MachineModal from "./MachineModal";
import { MaintenanceView } from "./MaintenanceView";
import DashboardView, { AnalyticsView } from "./DashboardView";
import MonthlySummaryView from "./MonthlySummaryView";
import FilterGroupModal from "./FilterGroupModal";
import MaintenanceModal from "./MaintenanceModal";
import ConfirmationDialog from "./ConfirmationDialog";
import { themes } from "../utils/themes";
import AIAssistantModal from "./AIAssistantModal";
import ScannerModal from "./ScannerModal";
import ToastContainer from "./ToastContainer";
import AddStockModal from "./AddStockModal";
import ThemeCustomizerModal from "./ThemeCustomizerModal";
import { hexToHsl, isColorDark } from "../utils/colors";
import ImportModal from "./ImportModal";
import ImportMaintenanceModal from "./ImportMaintenanceModal";
import { SparePartsView } from "./SparePartsView";
import SparePartModal from "./SparePartModal";
import SparePartInstallationModal from "./SparePartInstallationModal";
import OilManagementView from "./OilManagementView";
import PoleAdminView from "./PoleAdminView";
import { LogoIcon } from "../constants";

const AppContent: React.FC = () => {
  const { user, loading: authLoading, signOut, pole, role, isSuperAdmin, isPoleAdmin } = useAuth();
  const { state, actions } = useAppLogic();

  // pole_admin and super_admin can create/edit/delete machines, filter groups, etc.
  // regular user can only view and create maintenance records
  const canWrite = isSuperAdmin || isPoleAdmin;

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const machineId = params.get("machineId");
    const filterGroupId = params.get("filterGroupId");

    if (user) {
      if (machineId) {
        actions.selectMachine(machineId);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } else if (filterGroupId) {
        actions.navigateToFilterGroup(filterGroupId);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }
  }, [user, actions]);

  React.useEffect(() => {
    const root = window.document.documentElement;
    const customStyleTagId = "custom-theme-styles";

    const classesToRemove = Array.from(root.classList).filter((cls) =>
      cls.startsWith("theme-")
    );
    if (classesToRemove.length > 0) {
      root.classList.remove(...classesToRemove);
    }
    const oldStyleTag = document.getElementById(customStyleTagId);
    if (oldStyleTag) {
      oldStyleTag.remove();
    }
    root.classList.remove("dark", "theme-custom");

    if (state.theme.startsWith("custom")) {
      const style = document.createElement("style");
      style.id = customStyleTagId;
      const colors = state.customColors;

      style.innerHTML = `
        .theme-custom {
          --background: ${hexToHsl(colors.background)};
          --foreground: ${hexToHsl(colors.foreground)};
          --muted-foreground: ${hexToHsl(colors.foregroundSecondary)};
          --card: ${hexToHsl(colors.card)};
          --card-foreground: ${hexToHsl(colors.cardForeground)};
          --popover: ${hexToHsl(colors.card)};
          --popover-foreground: ${hexToHsl(colors.cardForeground)};
          --primary: ${hexToHsl(colors.primary)};
          --primary-foreground: ${hexToHsl(colors.primaryForeground)};
          --secondary: ${hexToHsl(colors.accent)};
          --secondary-foreground: ${hexToHsl(colors.cardForeground)};
          --muted: ${hexToHsl(colors.accent)};
          --accent: ${hexToHsl(colors.accent)};
          --accent-foreground: ${hexToHsl(colors.cardForeground)};
          --destructive: ${hexToHsl(colors.destructive)};
          --destructive-foreground: ${hexToHsl(colors.destructiveForeground)};
          --border: ${hexToHsl(colors.border)};
          --input: ${hexToHsl(colors.input)};
          --ring: ${hexToHsl(colors.ring)};
          --warning: 38 92% 50%;
          --warning-foreground: 48 96% 6%;

          ${colors.backgroundImage ? `
            --background: transparent;
            --card: ${hexToHsl(colors.card)} / 0.85;
          ` : ''}
        }
        
        ${colors.backgroundImage ? `
        body {
          background-image: url(${colors.backgroundImage});
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          background-repeat: no-repeat;
          background-color: hsl(${hexToHsl(colors.background)});
        }
        ` : ''}
      `;
      document.head.appendChild(style);
      root.classList.add("theme-custom");

      if (isColorDark(colors.background)) {
        root.classList.add("dark");
      }
    } else {
      root.classList.add(`theme-${state.theme}`);
      const selectedThemeInfo = themes.find((t) => t.id === state.theme);
      if (selectedThemeInfo?.type === "dark") {
        root.classList.add("dark");
      }
    }
  }, [state.theme, state.customColors]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const renderLoadingScreen = () => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <LogoIcon className="h-12 w-12 text-primary animate-pulse" />
      <p className="mt-4 text-muted-foreground">Chargement...</p>
    </div>
  );

  if (authLoading) {
    return renderLoadingScreen();
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <LoginPage />
      </div>
    );
  }

  if (state.isLoading) {
    return renderLoadingScreen();
  }

  // Multi-pole gate: a cloud user without an assigned pole would see an
  // empty, silently broken app (RLS hides all business data). Block early.
  if (!isSuperAdmin && !pole) {
    return <NoPoleScreen />;
  }

  const renderView = () => {
    switch (state.currentView) {
      case View.LANDING:
        return (
          <LandingPage
            onSetView={actions.setCurrentView}
            stats={{
              machines: state.machines.length,
              maintenanceRecords: state.maintenanceRecords.length,
              spareParts: state.spareParts.length,
              filterGroups: state.filterTypes.length,
            }}
          />
        );
      case View.DASHBOARD:
        return (
          <DashboardView
            machines={state.machines}
            filterGroups={state.filterGroups}
            maintenanceRecords={state.maintenanceRecords}
            onSelectMachine={actions.selectMachine}
            onSetView={actions.setCurrentView}
          />
        );
      case View.MACHINE_LIST:
        return (
          <MachineListView
            machines={state.machines}
            onSelectMachine={actions.selectMachine}
            onAddMachine={() => actions.openMachineModal(null)}
            onEditMachine={(machine) => actions.openMachineModal(machine)}
            onDeleteMachine={actions.deleteMachine}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
            theme={state.theme}
            customCardBorders={state.customColors.cardBorders}
            onOpenImportModal={actions.openImportModal}
            canWrite={canWrite}
          />
        );
      case View.MACHINE_DETAIL:
        if (!state.selectedMachine) return null;
        return (
          <MachineDetailView
            machine={state.selectedMachine}
            filterTypes={state.filterTypes}
            filterGroups={state.filterGroups}
            onAssignFilter={actions.assignFilterToMachine}
            onAddFilterType={actions.addFilterTypeToMachine}
            onRemoveFilterType={actions.removeFilterTypeFromMachine}
            onBack={() => actions.setCurrentView(View.MACHINE_LIST)}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
            maintenanceRecords={state.maintenanceRecords}
            onOpenMaintenanceModal={actions.openMaintenanceModal}
            onDeleteMaintenance={actions.deleteMaintenanceRecord}
          />
        );
      case View.FILTER_MANAGEMENT:
        return (
          <FilterManagementView
            filterGroups={state.filterGroups}
            filterTypes={state.filterTypes}
            onDeleteGroup={actions.deleteFilterGroup}
            onOpenFilterGroupModal={actions.openFilterGroupModal}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
            highlightedFilterGroupId={state.highlightedFilterGroupId}
            onClearHighlight={actions.clearHighlightedFilterGroup}
            onOpenAddStockModal={actions.openAddStockModal}
            canWrite={canWrite}
          />
        );
      case View.MAINTENANCE:
        return (
          <MaintenanceView
            maintenanceRecords={state.maintenanceRecords}
            machines={state.machines}
            onOpenMaintenanceModal={actions.openMaintenanceModal}
            onDeleteMaintenance={actions.deleteMaintenanceRecord}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
            onOpenMaintenanceImportModal={actions.openMaintenanceImportModal}
            addToast={actions.addToast}
            canWrite={canWrite}
          />
        );
      case View.ANALYTICS:
        return (
          <AnalyticsView
            machines={state.machines}
            filterGroups={state.filterGroups}
            maintenanceRecords={state.maintenanceRecords}
            filterTypes={state.filterTypes}
          />
        );
      case View.SETTINGS:
        return (
          <SettingsView
            currentTheme={state.theme}
            savedThemes={state.savedThemes}
            onThemeChange={actions.setTheme}
            onOpenCustomizer={actions.openThemeCustomizer}
            onDeleteTheme={actions.deleteCustomTheme}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
          />
        );
      case View.USER_PROFILE:
        return <UserProfile />;
      case View.MONTHLY_SUMMARY:
        return (
          <MonthlySummaryView
            machines={state.machines}
            maintenanceRecords={state.maintenanceRecords}
            addToast={actions.addToast}
          />
        );
      case View.SPARE_PARTS:
        return (
          <SparePartsView
            spareParts={state.spareParts}
            installations={state.sparePartInstallations}
            machines={state.machines}
            onAddSparePart={() => actions.openSparePartModal(null)}
            onEditSparePart={actions.openSparePartModal}
            onDeleteSparePart={actions.deleteSparePart}
            onAddInstallation={actions.openInstallationModal}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
            canWrite={canWrite}
          />
        );
      case View.OIL_MANAGEMENT:
        return (
          <OilManagementView
            machines={state.machines}
            oilStocks={state.oilStocks}
            onUpdateStock={(actions as any).updateOilStocks}
            addToast={actions.addToast}
            canWrite={canWrite}
          />
        );
      case View.POLE_ADMIN:
        return (
          <PoleAdminView
            machines={state.machines}
            filterGroups={state.filterGroups}
            filterTypes={state.filterTypes}
            onSelectMachine={actions.selectMachine}
            onOpenMachineModal={actions.openMachineModal}
            onDeleteMachine={actions.deleteMachine}
            onOpenFilterGroupModal={actions.openFilterGroupModal}
            onDeleteFilterGroup={actions.deleteFilterGroup}
            onOpenConfirmationDialog={actions.openConfirmationDialog}
            poleId={pole?.id ?? null}
            addToast={actions.addToast}
          />
        );
      default:
        return (
          <DashboardView
            machines={state.machines}
            filterGroups={state.filterGroups}
            maintenanceRecords={state.maintenanceRecords}
            onSelectMachine={actions.selectMachine}
            onSetView={actions.setCurrentView}
          />
        );
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    actions.handleNotificationClick(notification);
  };

  const handleScanSuccess = (filterGroupId: string) => {
    actions.navigateToFilterGroup(filterGroupId);
    actions.closeScanner();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        currentView={state.currentView}
        setCurrentView={actions.setCurrentView}
        isMobileOpen={state.isSidebarOpen}
        closeSidebar={actions.closeSidebar}
        onToggleMenu={actions.toggleSidebar}
        // search
        machines={state.machines}
        filterGroups={state.filterGroups}
        spareParts={state.spareParts}
        onSelectMachine={actions.selectMachine}
        onNavigateToGroup={actions.navigateToFilterGroup}
        // theme
        savedThemes={state.savedThemes}
        currentTheme={state.theme}
        onThemeChange={actions.setTheme}
        // user / profile
        user={user}
        userEmail={user?.email || ""}
        pole={pole}
        userRole={role || ""}
        isSuperAdmin={isSuperAdmin}
        isPoleAdmin={isPoleAdmin}
        onLogout={handleLogout}
        onOpenAIAssistant={actions.openAIAssistant}
        onOpenScanner={actions.openScanner}
        // notifications
        notifications={state.notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllNotificationsAsRead={actions.markAllNotificationsAsRead}
      />
      <div className="flex flex-col">
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8">
          {renderView()}
        </main>
      </div>

      <ToastContainer toasts={state.toasts} onDismiss={actions.removeToast} />

      {state.isScannerOpen && (
        <ScannerModal
          isOpen={state.isScannerOpen}
          onClose={actions.closeScanner}
          onScan={handleScanSuccess}
        />
      )}
      {state.isAIAssistantOpen && (
        <AIAssistantModal
          isOpen={state.isAIAssistantOpen}
          onClose={actions.closeAIAssistant}
          filterGroups={state.filterGroups}
          onNavigateToGroup={actions.navigateToFilterGroup}
        />
      )}
      {state.isMachineModalOpen && (
        <MachineModal
          isOpen={state.isMachineModalOpen}
          onClose={actions.closeMachineModal}
          onSave={actions.saveMachine}
          machine={state.editingMachine}
          machines={state.machines}
        />
      )}
      {state.isFilterGroupModalOpen && (
        <FilterGroupModal
          isOpen={state.isFilterGroupModalOpen}
          onClose={actions.closeFilterGroupModal}
          onSave={actions.saveFilterGroup}
          group={state.editingFilterGroup}
          filterTypes={state.filterTypes}
          allFilterGroups={state.filterGroups}
        />
      )}
      {state.isMaintenanceModalOpen && (
        <MaintenanceModal
          isOpen={state.isMaintenanceModalOpen}
          onClose={actions.closeMaintenanceModal}
          onSave={actions.saveMaintenanceRecord}
          machines={state.machines}
          filterTypes={state.filterTypes}
          filterGroups={state.filterGroups}
          oilStocks={state.oilStocks}
          record={state.editingMaintenanceRecord}
          viewOnly={state.isMaintenanceViewOnly}
        />
      )}
      {state.isAddStockModalOpen && (
        <AddStockModal
          isOpen={state.isAddStockModalOpen}
          onClose={actions.closeAddStockModal}
          onAdd={actions.addStock}
          stockInfo={state.stockUpdateInfo}
        />
      )}
      {state.isThemeCustomizerOpen && (
        <ThemeCustomizerModal
          isOpen={state.isThemeCustomizerOpen}
          onClose={actions.closeThemeCustomizer}
          onSave={actions.saveCustomTheme}
          initialColors={state.customColors}
          editingTheme={state.editingCustomTheme}
        />
      )}
      {state.isImportModalOpen && (
        <ImportModal
          isOpen={state.isImportModalOpen}
          onClose={actions.closeImportModal}
          onImportMachines={actions.importMachines}
          existingMachines={state.machines} // Pass existing machines
        />
      )}
      {state.isMaintenanceImportModalOpen && (
        <ImportMaintenanceModal
          isOpen={state.isMaintenanceImportModalOpen}
          onClose={actions.closeMaintenanceImportModal}
          onImportMaintenanceRecords={actions.importMaintenanceRecords}
          machines={state.machines}
          maintenanceRecords={state.maintenanceRecords} // Pass existing maintenance records
          addToast={actions.addToast}
        />
      )}
      <ConfirmationDialog
        isOpen={state.confirmationDialogConfig.isOpen}
        onClose={actions.closeConfirmationDialog}
        onConfirm={actions.handleConfirm}
        title={state.confirmationDialogConfig.title}
        description={state.confirmationDialogConfig.description}
      />
      {state.isSparePartModalOpen && (
        <SparePartModal
          isOpen={state.isSparePartModalOpen}
          onClose={actions.closeSparePartModal}
          onSave={actions.saveSparePart}
          part={state.editingSparePart}
        />
      )}
      {state.isInstallationModalOpen && (
        <SparePartInstallationModal
          isOpen={state.isInstallationModalOpen}
          onClose={actions.closeInstallationModal}
          onSave={actions.saveSparePartInstallation}
          spareParts={state.spareParts}
          machines={state.machines}
          preselectedSparePartId={state.preselectedSparePartId}
        />
      )}
    </div>
  );
};

export default AppContent;
