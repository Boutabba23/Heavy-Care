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
import SyncStatusBox from "./SyncStatusBox";
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
 * Neo-brutalist single top header — rounded corners, thin dark outline,
 * hard black offset shadows, accents driven by the selected theme
 * (--primary). Brand • grouped sections • search • theme • profile.
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
  // Hard offset shadow used by panels (theme-aware foreground)
  const hardShadow = "shadow-[5px_6px_0_0_hsl(var(--foreground))]";
  const dropPanel = `rounded-2xl border-2 border-foreground bg-card ${hardShadow}`;

  const pillIdle =
    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-muted";
  const pillActive = `flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground border-2 border-foreground`;

  const dropItem =
    "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start text-[13px] font-semibold text-foreground transition-colors duration-100 hover:bg-muted";

  // Small hard-shadow icon button (avatar / theme / burger) — hover presses onto the shadow like the landing "Commencer" button
  const iconTile = `rounded-full bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] ring-2 ring-foreground transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-1 active:translate-y-1 active:shadow-none`;

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
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
          <Squares2x2Icon className="h-4 w-4 text-emerald-700" />
        </span>{" "}
        Tableau de bord
      </button>
      <button className={dropItem} onClick={() => navigate(View.ANALYTICS)}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
          <ChartBarIcon className="h-4 w-4 text-purple-600" />
        </span>{" "}
        Analyses
      </button>
      <button
        className={dropItem}
        onClick={() => navigate(View.MONTHLY_SUMMARY)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
          <ChartBarIcon className="h-4 w-4 text-sky-600" />
        </span>{" "}
        Synthese Mensuelle
      </button>
    </>
  );

  const InventoryItems = () => (
    <>
      <button
        className={dropItem}
        onClick={() => navigate(View.FILTER_MANAGEMENT)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
          <FilterIcon className="h-4 w-4 text-sky-600" />
        </span>{" "}
        Gestion des Filtres
      </button>
      <button className={dropItem} onClick={() => navigate(View.SPARE_PARTS)}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100">
          <SparePartsIcon className="h-4 w-4 text-rose-600" />
        </span>{" "}
        Pièces de Rechange
      </button>
      <button
        className={dropItem}
        onClick={() => navigate(View.OIL_MANAGEMENT)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
          <DropletIcon className="h-4 w-4 text-amber-600" />
        </span>{" "}
        Gestion des Huiles
      </button>
    </>
  );

  const ThemeSwatch = ({ color }: { color: string }) => (
    <div
      className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-foreground"
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
      className={`flex w-full items-center rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-muted ${
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
      className="sticky top-0 z-40 w-full bg-background"
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => navigate(View.LANDING)}
          className="flex shrink-0 items-center gap-1 rounded-full p-1 transition-colors duration-150 hover:bg-muted"
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
            className="h-2 w-2 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
        </button>

        {/* Desktop sections */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Dashboard group */}
          <div className="relative">
            <button
              className={groupClass("dashboard", isViewActive(dashboardViews))}
              onClick={() =>
                setOpenMenu(openMenu === "dashboard" ? null : "dashboard")
              }
            >
              Tableau de bord
              <Caret className={openMenu === "dashboard" ? "rotate-180" : ""} />
            </button>
            {openMenu === "dashboard" && (
              <div className={`absolute left-0 top-full z-50 mt-3 flex min-w-60 flex-col p-2 ${dropPanel}`}>
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
            <ExcavatorIcon className="h-4 w-4" /> Engins
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
              Stock
              <Caret className={openMenu === "inventory" ? "rotate-180" : ""} />
            </button>
            {openMenu === "inventory" && (
              <div className={`absolute left-0 top-full z-50 mt-3 flex min-w-60 flex-col p-2 ${dropPanel}`}>
                <InventoryItems />
              </div>
            )}
          </div>
        </nav>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Global search (desktop) */}
          <div className="hidden flex-1 justify-end px-1 md:flex md:w-56 lg:w-80">
            <GlobalSearch
              machines={machines}
              filterGroups={filterGroups}
              spareParts={spareParts}
              onSelectMachine={onSelectMachine}
              onNavigateToGroup={onNavigateToGroup}
              onSetView={setCurrentView}
            />
          </div>

          {/* Sync status (desktop only) */}
          <SyncStatusBox />

          {/* Theme picker (desktop) */}
          <div className="relative hidden md:block">
            <button
              className={`${iconTile} flex h-10 w-10 items-center justify-center`}
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
              <div className={`absolute right-0 top-full z-50 mt-3 flex w-60 flex-col p-2 ${dropPanel}`}>
                <p className="px-2 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Thèmes Prédéfinis
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {(themes as any[]).map((t) => themeRow(t))}
                </div>
                {savedThemes.length > 0 && (
                  <>
                    <p className="px-2 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Mes Thèmes
                    </p>
                    <div className="max-h-40 overflow-y-auto">
                      {(savedThemes as any[]).map((t) => themeRow(t, true))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => navigate(View.SETTINGS)}
                  className="mt-1 w-full rounded-xl px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
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
              <div className={iconTile + " overflow-hidden flex h-10 w-10 items-center justify-center"}>
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
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-foreground bg-primary" />
              )}
            </button>

            {openMenu === "profile" && (
              <div className={`absolute right-0 top-full z-50 mt-3 flex max-h-[80vh] w-72 flex-col overflow-hidden sm:w-80 ${dropPanel}`}>
                {profilePane === "menu" ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
                      <img
                        src={avatarSrc}
                        alt={userName}
                        className="h-10 w-10 rounded-full border-2 border-foreground object-cover"
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
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                          <CameraIcon className="h-4 w-4 text-muted-foreground" />
                        </span>{" "}
                        Scanner QR
                      </button>
                      <button className={dropItem} onClick={() => {
                        onOpenAIAssistant();
                        closeMenus();
                      }}>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                          <SparklesIcon className="h-4 w-4 text-emerald-600" />
                        </span>{" "}
                        Assistant HeavyCare
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => setProfilePane("notifications")}
                      >
                        <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                          <BellIcon className="h-4 w-4 text-amber-600" />
                          {hasUnreadNotifications && (
                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-foreground bg-primary" />
                          )}
                        </span>
                        Notifications
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => navigate(View.SETTINGS)}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                          <SettingsIcon className="h-4 w-4 text-purple-600" />
                        </span>{" "}
                        Paramètres
                      </button>
                      <button
                        className={dropItem}
                        onClick={() => navigate(View.USER_PROFILE)}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <UserIcon className="h-4 w-4" />
                        </span>{" "}
                        Mon Profil
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start text-[13px] font-semibold text-rose-600 transition-colors duration-100 hover:bg-rose-50"
                        onClick={() => {
                          onLogout();
                          closeMenus();
                        }}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100">
                          <LogoutIcon className="h-4 w-4" />
                        </span>
                        Déconnexion
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
                                className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl ${
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
                                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
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
            className={iconTile + " flex h-10 w-10 items-center justify-center md:hidden"}
          >
            <MenuLines isOpen={isMobileOpen} />
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMobileOpen && (
        <nav className={`mx-3 mb-3 flex max-h-[70vh] flex-col gap-1 overflow-y-auto p-3 ${dropPanel}`}>
          <GlobalSearch
            machines={machines}
            filterGroups={filterGroups}
            spareParts={spareParts}
            onSelectMachine={onSelectMachine}
            onNavigateToGroup={onNavigateToGroup}
            onSetView={setCurrentView}
          />
          <p className="px-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tableau de bord
          </p>
          <DashboardItems />
          <button
            className={pillIdle}
            onClick={() => navigate(View.MACHINE_LIST)}
          >
            <ExcavatorIcon className="h-4 w-4 text-emerald-600" /> Engins
          </button>
          <button
            className={pillIdle}
            onClick={() => navigate(View.MAINTENANCE)}
          >
            <WrenchIcon className="h-4 w-4 text-orange-500" /> Maintenance
          </button>
          <p className="px-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Inventaire
          </p>
          <InventoryItems />
          <p className="px-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Profil
          </p>
          <button className={dropItem} onClick={() => navigate(View.SETTINGS)}>
            <SettingsIcon className="h-4 w-4 text-purple-600" /> Paramètres
          </button>
          <button
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            onClick={() => onLogout()}
          >
            <LogoutIcon className="h-4 w-4" /> Déconnexion
          </button>
        </nav>
      )}
    </header>
  );
};

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
