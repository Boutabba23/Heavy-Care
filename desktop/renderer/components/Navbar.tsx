"use client";

import React from "react";
import {
  View,
  Notification,
  Machine,
  FilterGroup,
  SparePart,
  SavedTheme,
} from "../types";
import {
  CameraIcon,
  ChartBarIcon,
  DropletIcon,
  ExcavatorIcon,
  FilterIcon,
  LogoutIcon,
  SettingsIcon,
  SparklesIcon,
  Squares2x2Icon,
  UserIcon,
  WrenchIcon,
  SparePartsIcon,
  ThemeBrushIcon,
  CheckIcon,
  CheckCircleIcon,
  BellIcon,
} from "../constants";
import { themes } from "../utils/themes";
import GlobalSearch from "./GlobalSearch";
import { useEffect, useRef, useState } from "react";

interface NavbarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isMobileOpen: boolean;
  closeSidebar: () => void;
  onToggleMenu: () => void;
  // search
  machines: Machine[];
  filterGroups: FilterGroup[];
  spareParts: SparePart[];
  onSelectMachine: (machineId: string) => void;
  onNavigateToGroup: (groupId: string) => void;
  // theme
  savedThemes: SavedTheme[];
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
  // user / profile
  user: any;
  userEmail: string;
  onLogout: () => void;
  onOpenAIAssistant: () => void;
  onOpenScanner: () => void;
  // notifications
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllNotificationsAsRead: () => void;
}

type MenuKey = "dashboard" | "inventory" | "theme" | "profile";

const Caret = () => (
  <svg
    className="h-2.5 w-2.5 transition-transform duration-150"
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
 * Neo-brutalist single top header.
 * Brand • section navigation (Dashboard ▾ / Machines / Maintenance /
 * Inventory ▾) • global search • theme picker • profile avatar menu.
 * Former sidebar titles live under the grouped sections; the old
 * second header row is fully absorbed. No horizontal scrolling.
 */
const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  closeSidebar,
  onToggleMenu,
  machines,
  filterGroups,
  spareParts,
  onSelectMachine,
  onNavigateToGroup,
  savedThemes,
  currentTheme,
  onThemeChange,
  user,
  userEmail,
  onLogout,
  onOpenAIAssistant,
  onOpenScanner,
  notifications,
  onNotificationClick,
  onMarkAllNotificationsAsRead,
}) => {
  const [openMenu, setOpenMenu] = React.useState<MenuKey | null>(null);
  const [profilePane, setProfilePane] = useState<"menu" | "notifications">(
    "menu",
  );
  const [imageError, setImageError] = useState(false);
  const rootRef = React.useRef<HTMLElement>(null);

  const closeMenus = React.useCallback(() => {
    setOpenMenu(null);
    setProfilePane("menu");
  }, []);

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeMenus();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [closeMenus]);

  const navigate = (view: View) => {
    setCurrentView(view);
    closeMenus();
    closeSidebar();
  };

  const getUserName = (email: string) => {
    if (!email) return "Utilisateur";
    const namePart = email.split("@")[0];
    if (namePart.includes(".")) {
      const firstName = namePart.split(".")[0];
      return (
        firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      );
    }
    return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
  };

  const userName = getUserName(userEmail);
  const avatarSrc =
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.io/api/?name=${encodeURIComponent(userName)}&background=random`;
  const hasUnreadNotifications = notifications.some((n) => !n.read);

  // ---- shared styles -------------------------------------------------------
  const chipBase =
    "flex items-center gap-2 whitespace-nowrap border-2 border-foreground px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-150";
  const chipIdle = `${chipBase} bg-card text-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none`;
  const chipActive = `${chipBase} bg-primary text-primary-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]`;

  const dropItem =
    "flex w-full items-center gap-2 border-2 border-transparent px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-foreground transition-colors duration-100 hover:border-foreground hover:bg-muted";

  const iconBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground bg-card text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none";

  // ---- data ----------------------------------------------------------------
  const dashboardViews = [View.DASHBOARD, View.ANALYTICS, View.MONTHLY_SUMMARY];
  const inventoryViews = [
    View.FILTER_MANAGEMENT,
    View.SPARE_PARTS,
    View.OIL_MANAGEMENT,
  ];
  const isViewActive = (views: View[]) => views.includes(currentView);
  const menuOpenClass = (menu: MenuKey, groupActive: boolean) =>
    `${openMenu === menu || groupActive ? chipActive : chipIdle}`;

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

  const ThemeSwatch = ({ color }: { color: string }) => (
    <div
      className="h-3 w-3 shrink-0 border-2 border-foreground"
      style={{ backgroundColor: color }}
    />
  );

  const themeRow = (
    t: { id: string; name: string; colors: any },
    isSaved = false,
  ) => (
    <button
      key={t.id}
      onClick={() => {
        onThemeChange(t.id);
        closeMenus();
      }}
      className={`flex w-full items-center px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-muted ${
        currentTheme === t.id ? "text-primary" : "text-foreground"
      }`}
    >
      {isSaved ? (
        <ThemeBrushIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ThemeSwatch color={t.colors.primary} />
      )}
      <span className="flex-1 text-left">{t.name}</span>
      {currentTheme === t.id && <CheckIcon className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <header
      ref={rootRef}
      className="sticky top-0 z-40 w-full border-b-2 border-foreground bg-card"
    >
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
        {/* Brand */}
        {/* Brand — the landing/home button */}
        <button
          onClick={() => navigate(View.LANDING)}
          className="flex shrink-0 items-center gap-2 border-2 border-foreground bg-card p-1 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
          aria-label="Accueil"
        >
          <img src="/icon.png" alt="HeavyCare" className="h-9 w-9 object-contain" />
        </button>

        {/* Desktop sections — fixed, no scroll */}
        <nav className="hidden items-center gap-2 py-4 md:flex">
          {/* Dashboard group */}
          <div className="relative">
            <button
              className={menuOpenClass("dashboard", isViewActive(dashboardViews))}
              onClick={() =>
                setOpenMenu(openMenu === "dashboard" ? null : "dashboard")
              }
            >
              <Squares2x2Icon className="h-4 w-4" /> Dashboard <Caret />
            </button>
            {openMenu === "dashboard" && (
              <div className="absolute left-0 top-full z-50 mt-2 flex min-w-56 flex-col gap-1 border-2 border-foreground bg-card p-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
                <DashboardItems />
              </div>
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
            className={
              isViewActive([View.MAINTENANCE]) ? chipActive : chipIdle
            }
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
              <div className="absolute left-0 top-full z-50 mt-2 flex min-w-56 flex-col gap-1 border-2 border-foreground bg-card p-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
                <InventoryItems />
              </div>
            )}
          </div>
        </nav>

        {/* Global search (center) */}
        <div className="hidden flex-1 justify-center px-2 md:flex">
          <GlobalSearch
            machines={machines}
            filterGroups={filterGroups}
            spareParts={spareParts}
            onSelectMachine={onSelectMachine}
            onNavigateToGroup={onNavigateToGroup}
            onSetView={setCurrentView}
          />
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Theme picker (desktop — mobile uses Paramètres) */}
          <div className="relative hidden md:block">
            <button
              className={iconBtn}
              title="Changer le thème"
              onClick={() =>
                setOpenMenu(openMenu === "theme" ? null : "theme")
              }
            >
              <ThemeBrushIcon
                className="h-4 w-4"
                style={{
                  color:
                    (themes.find((t) => t.id === currentTheme) ||
                      savedThemes.find((t) => t.id === currentTheme) ||
                      themes[0]).colors.primary,
                }}
              />
            </button>
            {openMenu === "theme" && (
              <div className="absolute right-0 top-full z-50 mt-2 flex w-60 flex-col border-2 border-foreground bg-card p-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
                <p className="border-b-2 border-foreground bg-muted px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Thèmes Prédéfinis
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {(themes as any[]).map((t) => themeRow(t))}
                </div>
                {savedThemes.length > 0 && (
                  <>
                    <p className="border-y-2 border-foreground bg-muted px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Mes Thèmes
                    </p>
                    <div className="max-h-40 overflow-y-auto">
                      {(savedThemes as any[]).map((t) => themeRow(t, true))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => navigate(View.SETTINGS)}
                  className="mt-2 w-full border-2 border-foreground bg-card py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  Gérer les thèmes
                </button>
              </div>
            )}
          </div>

          {/* Profile avatar menu */}
          <div className="relative">
            <button
              onClick={() =>
                setOpenMenu(openMenu === "profile" ? null : "profile")
              }
              className="relative focus:outline-none"
              aria-label="Menu utilisateur"
            >
              <div
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center overflow-hidden border-2 border-foreground bg-muted transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none`}
              >
                {!imageError ? (
                  <img
                    src={avatarSrc}
                    alt={userName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-sm font-black uppercase text-foreground">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {hasUnreadNotifications && (
                <span className="absolute -right-1.5 -top-1.5 h-3 w-3 border-2 border-foreground bg-destructive" />
              )}
            </button>

            {openMenu === "profile" && (
              <div className="absolute right-0 top-full z-50 mt-2 flex max-h-[80vh] w-72 flex-col border-2 border-foreground bg-card shadow-[5px_5px_0_0_hsl(var(--foreground))] sm:w-80 lg:absolute">
                {profilePane === "menu" ? (
                  <>
                    <div className="border-b-2 border-foreground bg-muted px-4 py-3">
                      <p className="truncate text-sm font-black uppercase tracking-wide text-foreground">
                        {userName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </p>
                    </div>

                    <div className="flex flex-col p-2">
                      <button
                        className={dropItem}
                        onClick={() => {
                          onOpenScanner();
                          closeMenus();
                        }}
                      >
                        <CameraIcon className="h-4 w-4 text-muted-foreground" />{" "}
                        Scanner QR
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => {
                          onOpenAIAssistant();
                          closeMenus();
                        }}
                      >
                        <SparklesIcon className="h-4 w-4 text-primary" />{" "}
                        Assistant HeavyCare
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => setProfilePane("notifications")}
                      >
                        <span className="relative">
                          <BellIcon className="h-4 w-4 text-muted-foreground" />
                          {hasUnreadNotifications && (
                            <span className="absolute -right-1 -top-1 h-2 w-2 border border-foreground bg-destructive" />
                          )}
                        </span>
                        Notifications
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => navigate(View.SETTINGS)}
                      >
                        <SettingsIcon className="h-4 w-4 text-muted-foreground" />{" "}
                        Paramètres
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => navigate(View.USER_PROFILE)}
                      >
                        <span className="flex h-6 w-6 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
                          <UserIcon className="h-3.5 w-3.5" />
                        </span>
                        Mon Profil
                      </button>
                      <button
                        className="flex w-full items-center gap-2 border-2 border-transparent px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-destructive transition-colors duration-100 hover:border-foreground hover:bg-destructive/10"
                        onClick={() => {
                          onLogout();
                          closeMenus();
                        }}
                      >
                        <LogoutIcon className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex max-h-[80vh] flex-col">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-foreground bg-card p-3">
                      <button
                        onClick={() => setProfilePane("menu")}
                        className="border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase tracking-widest text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
                      >
                        ← Retour
                      </button>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Notifications
                      </p>
                      {hasUnreadNotifications && (
                        <button
                          onClick={onMarkAllNotificationsAsRead}
                          className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-card text-primary transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
                          title="Tout marquer comme lu"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="divide-y-2 divide-foreground/10 flex-1 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime(),
                          )
                          .map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => {
                                onNotificationClick(notification);
                                closeMenus();
                                closeSidebar();
                              }}
                              className={`flex w-full items-start gap-3 border-2 border-transparent p-3.5 text-left transition-colors hover:border-foreground hover:bg-muted ${
                                !notification.read ? "bg-muted" : ""
                              }`}
                            >
                              <div
                                className={`flex-shrink-0 flex h-8 w-8 items-center justify-center border-2 border-foreground ${
                                  notification.type === "maintenance"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-destructive text-destructive-foreground"
                                }`}
                              >
                                {notification.type === "maintenance" ? (
                                  <WrenchIcon className="h-4 w-4" />
                                ) : (
                                  <FilterIcon className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs leading-relaxed ${
                                    !notification.read
                                      ? "font-black text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {notification.message}
                                </p>
                                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {new Date(
                                    notification.createdAt,
                                  ).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                  })}{" "}
                                  —{" "}
                                  {new Date(
                                    notification.createdAt,
                                  ).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="mt-1.5 h-2 w-2 shrink-0 border border-foreground bg-primary" />
                              )}
                            </button>
                          ))
                      ) : (
                        <div className="px-4 py-10 text-center">
                          <BellIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
                          <p className="text-sm text-muted-foreground">
                            Aucune notification
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <button
            onClick={onToggleMenu}
            onContextMenu={(e) => e.preventDefault()}
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
          <GlobalSearch
            machines={machines}
            filterGroups={filterGroups}
            spareParts={spareParts}
            onSelectMachine={onSelectMachine}
            onNavigateToGroup={onNavigateToGroup}
            onSetView={setCurrentView}
          />
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
          <div className="flex items-center justify-between">
            <button
              className={`${chipIdle}`}
              onClick={onOpenScanner}
            >
              <CameraIcon className="h-4 w-4" /> Scanner QR
            </button>
            <button
              className={`${chipIdle}`}
              onClick={onOpenAIAssistant}
            >
              <SparklesIcon className="h-4 w-4" /> Assistant
            </button>
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
                className={dropItem}
                onClick={() => onLogout()}
              >
                <LogoutIcon className="h-4 w-4 text-destructive" />
                <span className="text-destructive">Déconnexion</span>
              </button>
            </div>
          </div>
        </nav>
      )}

    </header>
  );
};

export default Navbar;
