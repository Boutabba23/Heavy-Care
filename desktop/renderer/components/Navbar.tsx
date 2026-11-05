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
  LogoIcon,
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

const Caret = ({ className = "" }: { className?: string }) => (
  <svg
    className={`h-2 w-2 ${className}`}
    viewBox="0 0 10 6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M1 1l4 4 4-4" strokeLinecap="round" />
  </svg>
);

/**
 * Friendly-brutalist single top header (soft pills, thin dark outline, pastels).
 * Brand • section navigation in a pill group (Dashboard ▾ / Machines /
 * Maintenance / Inventory ▾) • global search • theme picker • profile avatar.
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
  const [brandIconError, setBrandIconError] = useState(false);
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
  const pillIdle =
    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-muted";
  const pillActive =
    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold bg-foreground text-background";

  const dropItem =
    "flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-start text-[13px] font-semibold text-foreground transition-colors duration-100 hover:bg-muted";

  // ---- data ----------------------------------------------------------------
  const dashboardViews = [View.DASHBOARD, View.ANALYTICS, View.MONTHLY_SUMMARY];
  const inventoryViews = [
    View.FILTER_MANAGEMENT,
    View.SPARE_PARTS,
    View.OIL_MANAGEMENT,
  ];
  const isViewActive = (views: View[]) => views.includes(currentView);
  const groupClass = (menu: MenuKey, groupActive: boolean) =>
    `${openMenu === menu || groupActive ? pillActive : pillIdle}`;

  const DashboardItems = () => (
    <>
      <button className={dropItem} onClick={() => navigate(View.DASHBOARD)}>
        <Squares2x2Icon className="h-4 w-4 text-emerald-600" /> Tableau de bord
      </button>
      <button className={dropItem} onClick={() => navigate(View.ANALYTICS)}>
        <ChartBarIcon className="h-4 w-4 text-purple-500" /> Analyses
      </button>
      <button
        className={dropItem}
        onClick={() => navigate(View.MONTHLY_SUMMARY)}
      >
        <ChartBarIcon className="h-4 w-4 text-sky-500" /> Synthese Mensuelle
      </button>
    </>
  );

  const InventoryItems = () => (
    <>
      <button
        className={dropItem}
        onClick={() => navigate(View.FILTER_MANAGEMENT)}
      >
        <FilterIcon className="h-4 w-4 text-sky-500" /> Gestion des Filtres
      </button>
      <button className={dropItem} onClick={() => navigate(View.SPARE_PARTS)}>
        <SparePartsIcon className="h-4 w-4 text-lime-600" /> Pièces de Rechange
      </button>
      <button
        className={dropItem}
        onClick={() => navigate(View.OIL_MANAGEMENT)}
      >
        <DropletIcon className="h-4 w-4 text-amber-500" /> Gestion des Huiles
      </button>
    </>
  );

  const ThemeSwatch = ({ color }: { color: string }) => (
    <div
      className="h-3 w-3 shrink-0 rounded-full border border-foreground/40"
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
      className={`flex w-full items-center rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-muted ${
        currentTheme === t.id ? "text-foreground" : "text-foreground/80"
      }`}
    >
      {isSaved ? (
        <ThemeBrushIcon className="mr-2.5 h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ThemeSwatch color={t.colors.primary} />
      )}
      <span className="flex-1 text-left">{t.name}</span>
      {currentTheme === t.id && (
        <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
      )}
    </button>
  );

  return (
    <header
      ref={rootRef}
      className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => navigate(View.LANDING)}
          className="flex shrink-0 items-center gap-0.5 rounded-full p-1 transition-colors duration-150 hover:bg-muted"
          aria-label="Accueil"
        >
          {brandIconError ? (
            <LogoIcon className="h-10 w-10 shrink-0" />
          ) : (
            <img
              src="/icon.png"
              alt="HeavyCare"
              className="h-10 w-10 object-contain"
              onError={() => setBrandIconError(true)}
            />
          )}
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-orange-500"
            aria-hidden="true"
          />
        </button>

        {/* Desktop sections — pill group, centered like the reference */}
        <nav className="hidden items-center gap-1 rounded-full border-2 border-foreground/90 bg-card p-1.5 md:flex">
          {/* Dashboard group */}
          <div className="relative">
            <button
              className={groupClass("dashboard", isViewActive(dashboardViews))}
              onClick={() =>
                setOpenMenu(openMenu === "dashboard" ? null : "dashboard")
              }
            >
              Dashboard
              <Caret
                className={openMenu === "dashboard" ? "rotate-180" : ""}
              />
            </button>
            {openMenu === "dashboard" && (
              <div className="absolute left-0 top-full z-50 mt-2 flex min-w-56 flex-col rounded-3xl border-2 border-foreground/90 bg-card p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                <DashboardItems />
              </div>
            )}
          </div>

          {/* Machines — direct */}
          <button
            className={
              isViewActive([View.MACHINE_LIST, View.MACHINE_DETAIL])
                ? pillActive
                : pillIdle
            }
            onClick={() => navigate(View.MACHINE_LIST)}
          >
            <ExcavatorIcon className="h-4 w-4" /> Machines
          </button>

          {/* Maintenance — direct */}
          <button
            className={isViewActive([View.MAINTENANCE]) ? pillActive : pillIdle}
            onClick={() => navigate(View.MAINTENANCE)}
          >
            <WrenchIcon className="h-4 w-4" /> Maintenance
          </button>

          {/* Inventory group */}
          <div className="relative">
            <button
              className={groupClass("inventory", isViewActive(inventoryViews))}
              onClick={() =>
                setOpenMenu(openMenu === "inventory" ? null : "inventory")
              }
            >
              Inventory
              <Caret
                className={openMenu === "inventory" ? "rotate-180" : ""}
              />
            </button>
            {openMenu === "inventory" && (
              <div className="absolute left-0 top-full z-50 mt-2 flex min-w-56 flex-col rounded-3xl border-2 border-foreground/90 bg-card p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                <InventoryItems />
              </div>
            )}
          </div>
        </nav>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Global search (desktop) */}
          <div className="hidden flex-1 justify-end px-2 md:flex md:w-64 lg:w-96">
            <GlobalSearch
              machines={machines}
              filterGroups={filterGroups}
              spareParts={spareParts}
              onSelectMachine={onSelectMachine}
              onNavigateToGroup={onNavigateToGroup}
              onSetView={setCurrentView}
            />
          </div>

          {/* Theme picker (desktop) */}
          <div className="relative hidden md:block">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted"
              title="Changer le thème"
              onClick={() =>
                setOpenMenu(openMenu === "theme" ? null : "theme")
              }
            >
              <ThemeBrushIcon
                className="h-5 w-5"
                style={{
                  color:
                    (themes.find((t) => t.id === currentTheme) ||
                      savedThemes.find((t) => t.id === currentTheme) ||
                      themes[0]).colors.primary,
                }}
              />
            </button>
            {openMenu === "theme" && (
              <div className="absolute right-0 top-full z-50 mt-3 flex w-60 flex-col rounded-3xl border-2 border-foreground/90 bg-card p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                <p className="px-3.5 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Thèmes Prédéfinis
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {(themes as any[]).map((t) => themeRow(t))}
                </div>
                {savedThemes.length > 0 && (
                  <>
                    <p className="px-3.5 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Mes Thèmes
                    </p>
                    <div className="max-h-40 overflow-y-auto">
                      {(savedThemes as any[]).map((t) => themeRow(t, true))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => navigate(View.SETTINGS)}
                  className="mt-1 w-full rounded-full px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
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
                className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-muted transition-transform duration-150 hover:scale-105 ${
                  currentView === View.USER_PROFILE ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                }`}
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
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-orange-500" />
              )}
            </button>

            {openMenu === "profile" && (
              <div className="absolute right-0 top-full z-50 mt-3 flex max-h-[80vh] w-72 flex-col overflow-hidden rounded-3xl border-2 border-foreground/90 bg-card shadow-[0_12px_32px_rgba(0,0,0,0.12)] sm:w-80">
                {profilePane === "menu" ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
                      <img
                        src={avatarSrc}
                        alt={userName}
                        className="h-10 w-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {userName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {userEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col p-2">
                      <button className={dropItem} onClick={() => {
                        onOpenScanner();
                        closeMenus();
                      }}>
                        <CameraIcon className="h-4 w-4 text-muted-foreground" />{" "}
                        Scanner QR
                      </button>
                      <button className={dropItem} onClick={() => {
                        onOpenAIAssistant();
                        closeMenus();
                      }}>
                        <SparklesIcon className="h-4 w-4 text-emerald-600" />{" "}
                        Assistant HeavyCare
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => setProfilePane("notifications")}
                      >
                        <span className="relative">
                          <BellIcon className="h-4 w-4 text-muted-foreground" />
                          {hasUnreadNotifications && (
                            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-orange-500" />
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
                        <UserIcon className="h-4 w-4 text-muted-foreground" />{" "}
                        Mon Profil
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-start text-[13px] font-semibold text-orange-600 transition-colors duration-100 hover:bg-orange-500/10"
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
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-card p-3">
                      <button
                        onClick={() => setProfilePane("menu")}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        ← Retour
                      </button>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Notifications
                      </p>
                      {hasUnreadNotifications && (
                        <button
                          onClick={onMarkAllNotificationsAsRead}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-500/10"
                          title="Tout marquer comme lu"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 divide-y divide-foreground/5 overflow-y-auto">
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
                              className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted ${
                                !notification.read ? "bg-muted/60" : ""
                              }`}
                            >
                              <div
                                className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${
                                  notification.type === "maintenance"
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-rose-100 text-rose-600"
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
                                  className={`text-[13px] leading-relaxed ${
                                    !notification.read
                                      ? "font-semibold text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
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
                                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
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
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-card text-foreground transition-transform duration-150 hover:scale-105 md:hidden"
          >
            <MenuLines isOpen={isMobileOpen} />
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMobileOpen && (
        <nav className="mx-3 mb-3 flex max-h-[70vh] flex-col gap-2 overflow-y-auto rounded-3xl border-2 border-foreground/90 bg-card p-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)] md:hidden">
          <GlobalSearch
            machines={machines}
            filterGroups={filterGroups}
            spareParts={spareParts}
            onSelectMachine={onSelectMachine}
            onNavigateToGroup={onNavigateToGroup}
            onSetView={setCurrentView}
          />
          <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Dashboard
          </p>
          <DashboardItems />
          <button
            className={pillIdle + " justify-between"}
            onClick={() => navigate(View.MACHINE_LIST)}
          >
            <span className="flex items-center gap-2">
              <ExcavatorIcon className="h-4 w-4" /> Machines
            </span>
            <ArrowDot color="bg-emerald-400" />
          </button>
          <button
            className={pillIdle + " justify-between"}
            onClick={() => navigate(View.MAINTENANCE)}
          >
            <span className="flex items-center gap-2">
              <WrenchIcon className="h-4 w-4" /> Maintenance
            </span>
            <ArrowDot color="bg-orange-400" />
          </button>
          <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Inventory
          </p>
          <InventoryItems />
          <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Profil
          </p>
          <button className={dropItem} onClick={() => navigate(View.SETTINGS)}>
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />{" "}
            Paramètres
          </button>
          <button
            className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-start text-[13px] font-semibold text-orange-600 transition-colors hover:bg-orange-500/10"
            onClick={() => onLogout()}
          >
            <LogoutIcon className="h-4 w-4" /> Déconnexion
          </button>
        </nav>
      )}
    </header>
  );
};

const ArrowDot = ({ color }: { color: string }) => (
  <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
);

const MenuLines = ({ isOpen }: { isOpen: boolean }) => (
  <span className="relative flex h-4 w-4 flex-col items-center justify-center">
    <span
      className={`absolute h-0.5 w-5 rounded-full bg-foreground transition-transform duration-200 ${
        isOpen ? "rotate-45" : "-translate-y-1.5"
      }`}
    />
    <span
      className={`absolute h-0.5 w-5 rounded-full bg-foreground transition-opacity duration-200 ${
        isOpen ? "opacity-0" : "opacity-100"
      }`}
    />
    <span
      className={`absolute h-0.5 w-5 rounded-full bg-foreground transition-transform duration-200 ${
        isOpen ? "-rotate-45" : "translate-y-1.5"
      }`}
    />
  </span>
);

export default Navbar;
