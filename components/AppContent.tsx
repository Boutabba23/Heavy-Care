"use client";

import React from "react";
import { useAppLogic } from "../hooks/useAppLogic";
import { useAuth } from "../contexts/AuthContext";
import Header from "./Header";
import MachineListView from "./MachineListView";
import MachineDetailView from "./MachineDetailView";
import FilterManagementView from "./FilterManagementView";
import UserProfile from "./UserProfile";
import LoginPage from "./LoginPage";
import { Notification, View } from "../types";
import Sidebar from "./Sidebar";
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
import { LogoIcon } from "../constants";

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { state, actions } = useAppLogic();

  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

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
        }
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
    // Logout is now handled by the AuthContext
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

  const renderView = () => {
    switch (state.currentView) {
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
            adjustments={state.monthlyDailyAdjustments}
            onCreateAdjustment={actions.createDailyAdjustment}
            onUpdateAdjustment={actions.updateDailyAdjustment}
            onDeleteAdjustment={actions.deleteDailyAdjustment}
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
    setIsNotificationsOpen(false);
  };

  const handleScanSuccess = (filterGroupId: string) => {
    actions.navigateToFilterGroup(filterGroupId);
    actions.closeScanner();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        currentView={state.currentView}
        setCurrentView={actions.setCurrentView}
        isMobileOpen={state.isSidebarOpen}
        closeSidebar={actions.closeSidebar}
        onLogout={handleLogout}
        userEmail={user?.email || ""}
      />
      <div className="flex flex-col md:pl-64">
        <Header
          currentView={state.currentView}
          selectedMachine={state.selectedMachine}
          onMenuClick={actions.toggleSidebar}
          notifications={state.notifications}
          isNotificationsOpen={isNotificationsOpen}
          onToggleNotifications={() => setIsNotificationsOpen((p) => !p)}
          onCloseNotifications={() => setIsNotificationsOpen(false)}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsAsRead={actions.markAllNotificationsAsRead}
          onOpenAIAssistant={actions.openAIAssistant}
          onOpenScanner={actions.openScanner}
          machines={state.machines}
          filterGroups={state.filterGroups}
          spareParts={state.spareParts}
          onSelectMachine={actions.selectMachine}
          onNavigateToGroup={actions.navigateToFilterGroup}
          onSetView={actions.setCurrentView}
        />
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
