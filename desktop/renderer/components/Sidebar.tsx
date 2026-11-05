"use client";

import React from "react";
import { View } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  TruckIcon,
  ExcavatorIcon,
  FilterIcon,
  LogoutIcon,
  LogoIcon,
  SettingsIcon,
  WrenchIcon,
  Squares2x2Icon,
  ChartBarIcon,
  SparePartsIcon,
  DropletIcon,
} from "../constants";

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isMobileOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  closeSidebar,
}) => {
  const NavItem = ({
    view,
    label,
    icon,
  }: {
    view: View;
    label: string;
    icon: React.ReactNode;
  }) => {
    // Highlight the "Engins" link even when viewing a specific machine's detail
    const isActive =
      currentView === view ||
      (view === View.MACHINE_LIST && currentView === View.MACHINE_DETAIL);

    return (
      <button
        onClick={() => {
          setCurrentView(view);
          closeSidebar();
        }}
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
          ? "bg-gradient-to-r from-primary via-primary to-orange-400 text-primary-foreground shadow-md scale-105"
          : "text-foreground/80 hover:bg-muted"
          }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 bg-card border-r border-border flex flex-col`}
      >
        <div className="h-20 flex items-center px-4 mb-4 justify-center  border-border bg-slate-50/10 dark:bg-slate-900/10">
          <LogoIcon className="h-[100px] w-[100px] shrink-0" />

        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            view={View.DASHBOARD}
            label="Tableau de bord"
            icon={<Squares2x2Icon className="h-5 w-5" />}
          />
          <NavItem
            view={View.MACHINE_LIST}
            label="Gestion de Matériel"
            icon={<ExcavatorIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.FILTER_MANAGEMENT}
            label="Gestion des Filtres"
            icon={<FilterIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.MAINTENANCE}
            label="Maintenance Préventive"
            icon={<WrenchIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.SPARE_PARTS}
            label="Pièces de Rechange"
            icon={<SparePartsIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.OIL_MANAGEMENT}
            label="Gestion des Huiles"
            icon={<DropletIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.ANALYTICS}
            label="Analyses"
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.MONTHLY_SUMMARY}
            label="Synthese Mensuelle"
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.SETTINGS}
            label="Paramètres"
            icon={<SettingsIcon className="h-5 w-5" />}
          />
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
