"use client";

import React from "react";
import { Machine, Notification, View } from "../types";
import { MenuIcon, SparklesIcon, CameraIcon } from "../constants";
import NotificationBell from "./NotificationBell";

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
}

const BreadcrumbSeparator = () => (
  <span className="mx-2 text-muted-foreground">/</span>
);

const Header: React.FC<HeaderProps> = (props) => {
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
      <div className="flex items-center sm:text-lg max-sm:text-sm">
       
        <span className="font-bold text-foreground">{getTitle()}</span>
      </div>
      <div className="flex-1" /> {/* Spacer */}
      <div className="flex items-center space-x-2">
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
    </header>
  );
};

export default Header;
