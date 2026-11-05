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
  userEmail?: string;
  onLogout: () => void;
}

type MenuKey = "dashboard" | "inventory" | "profile";

// SVG caret (no icon dependency)
const Caret = () => (
  <svg
    className="h-2.5 w-2.5"
    viewBox="0 0 10 6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M1 1l4 4 4-4" strokeLinecap="square" />
  </svg>
);

/**
 * Neo-brutalist top navigation — fixed single row, no horizontal scroll.
 * The old sidebar titles live under grouped sections:
 *   Dashboard ▾ (Tableau de bord / Analyses / Synthese) • Machines •
 *   Maintenance • Inventory ▾ (Filtres / Pièces / Huiles) • Profile ▾
 * Bold uppercase, thick borders, hard offset shadows.
 */
const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  closeSidebar,
  onToggleMenu,
  userEmail,
  onLogout,
}) => {
  const [openMenu, setOpenMenu] = React.useState<MenuKey | null>(null);
  const rootRef = React.useRef<HTMLElement>(null);

  // Close dropdowns on outside click / Escape
  React.useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const navigate = (view: View) => {
    setCurrentView(view);
    setOpenMenu(null);
    closeSidebar();
  };

  const isFirstLetter = (email?: string) =>
    (email?.charAt(0) || "?").toUpperCase();

  // ---- shared styles -------------------------------------------------------
  const chipBase =
    "flex items-center gap-2 whitespace-nowrap border-2 border-foreground px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-150";
  const chipIdle = `${chipBase} bg-card text-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none`;
  const chipActive = `${chipBase} bg-primary text-primary-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]`;

  const dropItem =
    "flex w-full items-center gap-2 border-2 border-transparent px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-foreground transition-colors duration-100 hover:border-foreground hover:bg-muted";

  // ---- data ----------------------------------------------------------------
  const dashboardViews = [View.DASHBOARD, View.ANALYTICS, View.MONTHLY_SUMMARY];
  const inventoryViews = [
    View.FILTER_MANAGEMENT,
    View.SPARE_PARTS,
    View.OIL_MANAGEMENT,
  ];

  const isViewActive = (views: View[]) => views.includes(currentView);

  const DashboardItems = () => (
    <>
      <button className={dropItem} onClick={() => navigate(View.DASHBOARD)}>
        <Squares2x2Icon className="h-4 w-4" /> Tableau de bord
      </button>
      <button className={dropItem} onClick={() => navigate(View.ANALYTICS)}>
        <ChartBarIcon className="h-4 w-4" /> Analyses
      </button>
      <button
        className={dropItem}
        onClick={() => navigate(View.MONTHLY_SUMMARY)}
      >
        <ChartBarIcon className="h-4 w-4" /> Synthese Mensuelle
      </button>
    </>
  );

  const InventoryItems = () => (
    <>
      <button
        className={dropItem}
        onClick={() => navigate(View.FILTER_MANAGEMENT)}
      >
        <FilterIcon className="h-4 w-4" /> Gestion des Filtres
      </button>
      <button className={dropItem} onClick={() => navigate(View.SPARE_PARTS)}>
        <SparePartsIcon className="h-4 w-4" /> Pièces de Rechange
      </button>
      <button
        className={dropItem}
        onClick={() => navigate(View.OIL_MANAGEMENT)}
      >
        <DropletIcon className="h-4 w-4" /> Gestion des Huiles
      </button>
    </>
  );

  const menuOpenClass = (menu: MenuKey, groupActive: boolean) =>
    `${openMenu === menu || groupActive ? chipActive : chipIdle}`;

  // ---- dropdown panel ------------------------------------------------------
  const DropPanel = ({ children }: { children: React.ReactNode }) => (
    <div className="absolute left-0 top-full z-50 mt-2 flex min-w-56 flex-col gap-1 border-2 border-foreground bg-card p-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
      {children}
    </div>
  );

  return (
    <header
      ref={rootRef}
      className="sticky top-0 z-40 w-full border-b-2 border-foreground bg-card"
    >
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
        {/* Brand — the landing/home button */}
        <button
          onClick={() => navigate(View.LANDING)}
          className="flex shrink-0 items-center gap-2 border-2 border-foreground bg-card px-2 py-1 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          <LogoIcon className="h-9 w-9 shrink-0" />
          <span className="hidden text-sm font-black uppercase tracking-widest text-foreground sm:inline">
            HeavyCare
          </span>
        </button>

        {/* Desktop sections — fixed, no scroll */}
        <nav className="hidden flex-1 items-center gap-2 md:flex">
          {/* Dashboard group */}
          <div className="relative">
            <button
              className={menuOpenClass("dashboard", isViewActive(dashboardViews))}
              onClick={() =>
                setOpenMenu(openMenu === "dashboard" ? null : "dashboard")
              }
            >
              <Squares2x2Icon className="h-4 w-4" /> Dashboard
              <Caret />
            </button>
            {openMenu === "dashboard" && (
              <DropPanel>
                <DashboardItems />
              </DropPanel>
            )}
          </div>

          {/* Machines — direct */}
          <button
            className={
              isViewActive([View.MACHINE_LIST, View.MACHINE_DETAIL])
                ? chipActive
                : chipIdle
            }
            onClick={() => navigate(View.MACHINE_LIST)}
          >
            <ExcavatorIcon className="h-4 w-4" /> Machines
          </button>

          {/* Maintenance — direct */}
          <button
            className={isViewActive([View.MAINTENANCE]) ? chipActive : chipIdle}
            onClick={() => navigate(View.MAINTENANCE)}
          >
            <WrenchIcon className="h-4 w-4" /> Maintenance
          </button>

          {/* Inventory group */}
          <div className="relative">
            <button
              className={menuOpenClass("inventory", isViewActive(inventoryViews))}
              onClick={() =>
                setOpenMenu(openMenu === "inventory" ? null : "inventory")
              }
            >
              <SparePartsIcon className="h-4 w-4" /> Inventory <Caret />
            </button>
            {openMenu === "inventory" && (
              <DropPanel>
                <InventoryItems />
              </DropPanel>
            )}
          </div>
        </nav>

        {/* Right side: avatar (desktop) + avatar/burger (mobile) */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Profile group — desktop */}
          <div className="relative hidden md:block">
            <button
              className="flex items-center gap-1.5"
              onClick={() =>
                setOpenMenu(openMenu === "profile" ? null : "profile")
              }
              aria-label="Profil"
            >
              <span
                className={`${currentView === View.SETTINGS ? "" : "bg-primary text-primary-foreground"} flex h-9 w-9 items-center justify-center rounded-none border-2 border-foreground text-sm font-black uppercase shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none`}
              >
                {isFirstLetter(userEmail)}
              </span>
              <Caret />
            </button>
            {openMenu === "profile" && (
              <div className="absolute right-0 top-full z-50 mt-2 flex min-w-52 flex-col gap-1 border-2 border-foreground bg-card p-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
                <div className="border-2 border-foreground bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground/70">
                  {userEmail}
                </div>
                <button className={dropItem} onClick={() => navigate(View.SETTINGS)}>
                  <SettingsIcon className="h-4 w-4" /> Paramètres
                </button>
                <button
                  className="flex w-full items-center gap-2 border-2 border-transparent px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-destructive transition-colors duration-100 hover:border-foreground hover:bg-destructive/10"
                  onClick={onLogout}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Déconnexion
                </button>
              </div>
            )}
          </div>

          {/* Mobile: avatar + burger */}
          <span className="flex h-9 w-9 items-center justify-center border-2 border-foreground bg-primary text-sm font-black uppercase text-primary-foreground md:hidden">
            {isFirstLetter(userEmail)}
          </span>
          <button
            onClick={onToggleMenu}
            aria-label="Menu"
            className="relative flex h-9 w-9 items-center justify-center border-2 border-foreground bg-card transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] md:hidden"
          >
            <span
              className={`h-0.5 w-4 bg-foreground transition-transform duration-200 ${
                isMobileOpen ? "rotate-45" : "-translate-y-[3px]"
              }`}
            />
            <span
              className={`absolute h-0.5 w-4 bg-foreground transition-opacity duration-200 ${
                isMobileOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`h-0.5 w-4 bg-foreground transition-transform duration-200 ${
                isMobileOpen ? "-rotate-45" : "translate-y-[3px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu panel — stacked, no scrolling */}
      {isMobileOpen && (
        <nav className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto border-t-2 border-foreground bg-card p-3 md:hidden">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">
              Dashboard
            </p>
            <div className="flex flex-col gap-1">
              <DashboardItems />
            </div>
          </div>
          <button
            className={`${chipIdle} w-full justify-between`}
            onClick={() => navigate(View.MACHINE_LIST)}
          >
            <span className="flex items-center gap-2">
              <ExcavatorIcon className="h-4 w-4" /> Machines
            </span>
          </button>
          <button
            className={`${chipIdle} w-full justify-between`}
            onClick={() => navigate(View.MAINTENANCE)}
          >
            <span className="flex items-center gap-2">
              <WrenchIcon className="h-4 w-4" /> Maintenance
            </span>
          </button>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">
              Inventory
            </p>
            <div className="flex flex-col gap-1">
              <InventoryItems />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">
              Profil
            </p>
            <div className="flex flex-col gap-1">
              <button
                className={dropItem}
                onClick={() => navigate(View.SETTINGS)}
              >
                <SettingsIcon className="h-4 w-4" /> Paramètres
              </button>
              <button
                className="flex w-full items-center gap-2 border-2 border-transparent px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-destructive transition-colors duration-100 hover:border-foreground hover:bg-destructive/10"
                onClick={onLogout}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Déconnexion
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
