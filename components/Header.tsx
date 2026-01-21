"use client";

import React from "react";
import { Machine, Notification, View, FilterGroup, SparePart } from "../types";
import { MenuIcon, SparklesIcon, CameraIcon, BellIcon, LogoutIcon, UserIcon, WrenchIcon, FilterIcon, BackIcon, CheckCircleIcon } from "../constants";
import NotificationModal from "./NotificationModal";
import GlobalSearch from "./GlobalSearch";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  currentView: View;
  selectedMachine: Machine | null;
  onOpenAIAssistant: () => void;
  onOpenScanner: () => void;
  onMenuClick: () => void;
  notifications: Notification[];
  isNotificationsOpen: boolean;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllNotificationsAsRead: () => void;
  machines: Machine[];
  filterGroups: FilterGroup[];
  spareParts: SparePart[];
  onSelectMachine: (machineId: string) => void;
  onNavigateToGroup: (groupId: string) => void;
  onSetView: (view: View) => void;
  user: any;
  userEmail: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = (props) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userMenuView, setUserMenuView] = useState<'menu' | 'notifications'>('menu');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [imageError, setImageError] = useState(false);

  const hasUnreadNotifications = props.notifications.some((n) => !n.read);
  // ... (keep useEffect) ...
  // ... (keep getUserName) ...
  // ... (keep userName) ...
  // ... (keep getTitle) ...

  // Update the avatar rendering part
  // Note: I need to insert the state at the top of the component and the rendering update in the return

  // This tool call is tricky because I need to update two separate places. 
  // I will use multi_replace_file_content instead.

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
        setUserMenuView('menu');
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getUserName = (email: string) => {
    if (!email) return "Utilisateur";
    const namePart = email.split("@")[0];
    if (namePart.includes(".")) {
      const firstName = namePart.split(".")[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
  };

  const userName = getUserName(props.userEmail);

  const getTitle = () => {
    switch (props.currentView) {
      case View.DASHBOARD: return "Tableau de bord";
      case View.MACHINE_LIST: return "Gestion de Matériel";
      case View.MACHINE_DETAIL: return props.selectedMachine?.designation || "Détail du Matériel";
      case View.FILTER_MANAGEMENT: return "Gestion des Filtres";
      case View.MAINTENANCE: return "Maintenance Préventive";
      case View.ANALYTICS: return "Analyses & Rapports";
      case View.MONTHLY_SUMMARY: return "Synthèse Mensuelle";
      case View.SETTINGS: return "Paramètres";
      case View.SPARE_PARTS: return "Pièces de Rechange";
      case View.OIL_MANAGEMENT: return "Gestion des Huiles";
      case View.USER_PROFILE: return "Mon Profil";
      default: return "";
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 flex-shrink-0 flex items-center px-4 sm:px-6 lg:px-8 border-b border-border/80 bg-card/70 backdrop-blur-sm">
      <button
        onClick={props.onMenuClick}
        className="md:hidden mr-4 p-2 -ml-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Ouvrir le menu"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      <div className="flex items-center sm:text-lg font-bold text-foreground truncate max-w-[150px] sm:max-w-none">
        {getTitle()}
      </div>

      <div className="flex-1 flex justify-center px-2 md:px-8">
        <GlobalSearch
          machines={props.machines}
          filterGroups={props.filterGroups}
          spareParts={props.spareParts}
          onSelectMachine={props.onSelectMachine}
          onNavigateToGroup={props.onNavigateToGroup}
          onSetView={props.onSetView}
        />
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Unified User Menu (Desktop & Mobile) */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center focus:outline-none group"
            aria-label="Menu utilisateur"
          >
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-transparent group-hover:border-primary/30 transition-all overflow-hidden bg-muted flex items-center justify-center">
                {!imageError ? (
                  <img
                    src={
                      props.user?.user_metadata?.avatar_url ||
                      `https://ui-avatars.io/api/?name=${encodeURIComponent(userName)}&background=random`
                    }
                    alt={userName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {hasUnreadNotifications && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
              )}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl shadow-xl bg-card border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {userMenuView === 'menu' ? (
                <>
                  <div className="px-4 py-3 border-b border-border mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{props.userEmail}</p>
                  </div>

                  <div className="border-b border-border pb-1 mb-1">
                    <button
                      onClick={() => { props.onOpenScanner(); setIsUserMenuOpen(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <CameraIcon className="h-4 w-4 mr-3 text-muted-foreground" />
                      Scanner QR
                    </button>
                    <button
                      onClick={() => { props.onOpenAIAssistant(); setIsUserMenuOpen(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <SparklesIcon className="h-4 w-4 mr-3 text-primary" />
                      Assistant HeavyCare
                    </button>
                    <button
                      onClick={() => setUserMenuView('notifications')}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <div className="relative mr-3">
                        <BellIcon className="h-4 w-4 text-muted-foreground" />
                        {hasUnreadNotifications && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />}
                      </div>
                      Notifications
                    </button>
                  </div>

                  <button
                    onClick={() => { props.onSetView(View.USER_PROFILE); setIsUserMenuOpen(false); }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    Mon Profil
                  </button>

                  <div className="px-2 pt-2 mt-1 border-t border-border mb-2">
                    <button
                      onClick={() => { props.onLogout(); setIsUserMenuOpen(false); }}
                      className="flex w-full items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <LogoutIcon className="h-4 w-4 mr-3" />
                      Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col max-h-[80vh]">
                  <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-card z-10">
                    <button
                      onClick={() => setUserMenuView('menu')}
                      className="flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <BackIcon className="h-3.5 w-3.5 mr-1" />
                      Retour
                    </button>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</p>
                    {hasUnreadNotifications && (
                      <button
                        onClick={props.onMarkAllNotificationsAsRead}
                        className="p-1 hover:bg-muted rounded text-primary transition-colors"
                        title="Tout marquer comme lu"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-border/50">
                    {props.notifications.length > 0 ? (
                      props.notifications
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(notification => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              props.onNotificationClick(notification);
                              setIsUserMenuOpen(false);
                              setUserMenuView('menu');
                            }}
                            className={`w-full text-left p-3.5 hover:bg-muted/50 transition-colors flex items-start gap-3 ${!notification.read ? 'bg-primary/5' : ''}`}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'maintenance' ? 'bg-warning/20' : 'bg-destructive/20'
                              }`}>
                              {notification.type === 'maintenance' ?
                                <WrenchIcon className="h-4 w-4 text-warning-foreground" /> :
                                <FilterIcon className="h-4 w-4 text-destructive" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-relaxed ${!notification.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                                {new Date(notification.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} à {new Date(notification.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!notification.read && <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                          </button>
                        ))
                    ) : (
                      <div className="py-10 text-center px-4">
                        <BellIcon className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Aucune notification</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
