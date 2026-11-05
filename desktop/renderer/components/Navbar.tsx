"use client";

import React from "react";
import { View } from "../types";
import {
  ExcavatorIcon,
  FilterIcon,
  SettingsIcon,
  WrenchIcon,
  Squares2x2Icon,
  ChartBarIcon,
  SparePartsIcon,
  DropletIcon,
  LogoIcon,
} from "../constants";

interface NavbarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isMobileOpen: boolean;
  closeSidebar: () => void;
  onToggleMenu: () => void;
}

/**
 * Neo-brutalist top navigation.
 * Replaces the fixed sidebar: thick black borders, hard offset shadows,
 * bold uppercase typography, solid fills — clean and friendly.
 */
const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  closeSidebar,
  onToggleMenu,
}) => {
  const NavItem = ({
    view,
    label,
    icon,
    className = "",
  }: {
    view: View;
    label: string;
    icon: React.ReactNode;
    className?: string;
  }) => {
    // Highlight the "Gestion de Matériel" link even when viewing a specific machine's detail
    const isActive =
      currentView === view ||
      (view === View.MACHINE_LIST && currentView === View.MACHINE_DETAIL);

    return (
      <button
        onClick={() => {
          setCurrentView(view);
          closeSidebar();
        }}
        className={`flex items-center gap-2 whitespace-nowrap border-2 border-foreground px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-150 ${isActive
          ? "bg-primary text-primary-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
          : "bg-card text-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
          } ${className}`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-card">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => {
            setCurrentView(View.DASHBOARD);
            closeSidebar();
          }}
          className="flex shrink-0 items-center gap-2 border-2 border-foreground bg-card px-2 py-1 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          <LogoIcon className="h-9 w-9 shrink-0" />
          <span className="text-sm font-black uppercase tracking-widest text-foreground hidden sm:hidden md:block">
            HeavyCare
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex flex-1 items-center gap-2 overflow-x-auto">
          <NavItem
            view={View.DASHBOARD}
            label="Tableau de bord"
            icon={<Squares2x2Icon className="h-4 w-4" />}
          />
          <NavItem
            view={View.MACHINE_LIST}
            label="Gestion de Matériel"
            icon={<ExcavatorIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.FILTER_MANAGEMENT}
            label="Gestion des Filtres"
            icon={<FilterIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.MAINTENANCE}
            label="Maintenance Préventive"
            icon={<WrenchIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.SPARE_PARTS}
            label="Pièces de Rechange"
            icon={<SparePartsIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.OIL_MANAGEMENT}
            label="Gestion des Huiles"
            icon={<DropletIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.ANALYTICS}
            label="Analyses"
            icon={<ChartBarIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.MONTHLY_SUMMARY}
            label="Synthese Mensuelle"
            icon={<ChartBarIcon className="h-4 w-4" />}
          />
          <NavItem
            view={View.SETTINGS}
            label="Paramètres"
            icon={<SettingsIcon className="h-4 w-4" />}
          />
        </nav>

        {/* Mobile burger */}
        <button
          onClick={onToggleMenu}
          aria-label="Menu"
          className="ml-auto flex h-10 w-10 items-center justify-center border-2 border-foreground bg-card transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] md:ml-0 md:hidden"
        >
          <span
            className={`h-0.5 w-5 bg-foreground transition-transform duration-200 ${isMobileOpen
              ? "-rotate-45"
              : "translate-y-[-4px]"
              }`}
          />
          <span
            className={`${isMobileOpen ? "opacity-0" : "opacity-100"} absolute h-0.5 w-5 bg-foreground transition-opacity duration-200`}
          />
          <span
            className={`h-0.5 w-5 bg-foreground transition-transform duration-200 ${isMobileOpen
              ? "rotate-45"
              : "translate-y-[4px]"
              }`}
          />
        </button>
      </div>

      {/* Mobile menu panel */}
      {isMobileOpen && (
        <nav className="flex flex-col gap-2 border-t-2 border-foreground bg-card p-3 md:hidden">
          <NavItem
            view={View.DASHBOARD}
            label="Tableau de bord"
            icon={<Squares2x2Icon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.MACHINE_LIST}
            label="Gestion de Matériel"
            icon={<ExcavatorIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.FILTER_MANAGEMENT}
            label="Gestion des Filtres"
            icon={<FilterIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.MAINTENANCE}
            label="Maintenance Préventive"
            icon={<WrenchIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.SPARE_PARTS}
            label="Pièces de Rechange"
            icon={<SparePartsIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.OIL_MANAGEMENT}
            label="Gestion des Huiles"
            icon={<DropletIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.ANALYTICS}
            label="Analyses"
            icon={<ChartBarIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.MONTHLY_SUMMARY}
            label="Synthese Mensuelle"
            icon={<ChartBarIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
          <NavItem
            view={View.SETTINGS}
            label="Paramètres"
            icon={<SettingsIcon className="h-4 w-4" />}
            className="w-full justify-start"
          />
        </nav>
      )}
    </header>
  );
};

export default Navbar;
