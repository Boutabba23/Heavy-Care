"use client";

import React from "react";
import { Machine, Notification, View, FilterGroup, SparePart } from "../types";
import { MenuIcon, SparklesIcon, CameraIcon, EllipsisVerticalIcon, BellIcon } from "../constants";
import NotificationBell from "./NotificationBell";
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
}

const BreadcrumbSeparator = () => (
  <span className="mx-2 text-muted-foreground">/</span>
);

const Header: React.FC<HeaderProps> = (props) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const hasUnreadNotifications = props.notifications.some((n) => !n.read);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getTitle = () => {
    switch (props.currentView) {
      case View.DASHBOARD:
        return "Tableau de bord";
      case View.MACHINE_LIST:
        return "Gestion de Matériel";
      case View.MACHINE_DETAIL:
        return props.selectedMachine?.designation || "Détail du Matériel";
      case View.FILTER_MANAGEMENT:
        return "Gestion des Filtres";
      case View.MAINTENANCE:
        return "Maintenance Préventive";
      case View.ANALYTICS:
        return "Analyses & Rapports";
      case View.MONTHLY_SUMMARY:
        return "Sythèse Mensuelle";
      case View.SETTINGS:
        return "Paramètres";
      case View.SPARE_PARTS:
        return "Pièces de Rechange";
      default:
        return "";
    }
  };

  return (
    <header className="sticky top-0 z-10 h-16 flex-shrink-0 flex items-center px-4 sm:px-6 lg:px-8 border-b border-border/80 bg-card/70 backdrop-blur-sm">
      <button
        onClick={props.onMenuClick}
        className="md:hidden mr-4 p-2 -ml-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Ouvrir le menu"
      >
        <MenuIcon className="h-6 w-6" />
      </button>
      <div className="flex items-center sm:text-xl max-sm:text-sm">

        <span className="font-bold text-foreground">{getTitle()}</span>
      </div>
      <div className="flex-1 flex justify-end md:justify-center">
        <GlobalSearch
          machines={props.machines}
          filterGroups={props.filterGroups}
          spareParts={props.spareParts}
          onSelectMachine={props.onSelectMachine}
          onNavigateToGroup={props.onNavigateToGroup}
          onSetView={props.onSetView}
        />
      </div>
      <div className="flex items-center">
        {/* Desktop Icons */}
        <div className="hidden md:flex items-center">
          <button
            onClick={props.onOpenScanner}
            className="relative p-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Ouvrir le scanner de QR code"
          >
            <CameraIcon className="h-6 w-6" />
          </button>
          <button
            onClick={props.onOpenAIAssistant}
            className="relative p-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Ouvrir l'assistant IA"
          >
            <SparklesIcon className="h-6 w-6 text-primary" />
          </button>
          <NotificationBell
            notifications={props.notifications}
            isOpen={props.isNotificationsOpen}
            onToggle={props.onToggleNotifications}
            onClose={props.onCloseNotifications}
            onNotificationClick={props.onNotificationClick}
            onMarkAllAsRead={props.onMarkAllNotificationsAsRead}
          />
        </div>

        {/* Mobile 3-dot Menu */}
        <div className="md:hidden relative" ref={mobileMenuRef}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="relative p-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Ouvrir le menu mobile"
          >
            <EllipsisVerticalIcon className="h-6 w-6" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
            )}
          </button>

          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-border py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <button
                onClick={() => {
                  props.onOpenScanner();
                  setIsMobileMenuOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <CameraIcon className="h-4 w-4 mr-3" />
                Scanner QR
              </button>
              <button
                onClick={() => {
                  props.onOpenAIAssistant();
                  setIsMobileMenuOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <SparklesIcon className="h-4 w-4 mr-3 text-primary" />
                Assistant IA
              </button>

              <div className="w-full">
                <NotificationBell
                  notifications={props.notifications}
                  isOpen={props.isNotificationsOpen}
                  onToggle={props.onToggleNotifications}
                  onClose={props.onCloseNotifications}
                  onNotificationClick={props.onNotificationClick}
                  onMarkAllAsRead={props.onMarkAllNotificationsAsRead}
                  customTrigger={
                    <div className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition-colors">
                      <div className="relative mr-3">
                        <BellIcon className="h-4 w-4" />
                        {hasUnreadNotifications && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </div>
                      Notifications
                    </div>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
