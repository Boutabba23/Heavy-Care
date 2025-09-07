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
} from "../constants";

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isMobileOpen: boolean;
  closeSidebar: () => void;
  onLogout: () => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  closeSidebar,
  onLogout,
  userEmail,
}) => {
  const { signOut, user } = useAuth();

  // Extract user name from email
  const getUserName = (email: string) => {
    if (!email) return "Utilisateur";

    // Extract the part before @ and capitalize it
    const namePart = email.split("@")[0];

    // Handle different email formats
    if (namePart.includes(".")) {
      // If email is like "john.doe@example.com", take the first part
      const firstName = namePart.split(".")[0];
      return (
        firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      );
    } else {
      // If email is like "mohamed@example.com", use the whole part
      return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }
  };

  const userName = getUserName(userEmail || "");

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
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
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
          isActive
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
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform transform ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 bg-card border-r border-border flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-border">
          <LogoIcon className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold ml-3">GestiFiltres</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            view={View.DASHBOARD}
            label="Tableau de bord"
            icon={<Squares2x2Icon className="h-5 w-5" />}
          />
          <NavItem
            view={View.MACHINE_LIST}
            label="Gestion des Engins"
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
            view={View.ANALYTICS}
            label="Analyses"
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <NavItem
            view={View.SETTINGS}
            label="Paramètres"
            icon={<SettingsIcon className="h-5 w-5" />}
          />
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center space-x-3 overflow-hidden cursor-pointer"
              onClick={() => {
                setCurrentView(View.USER_PROFILE);
                closeSidebar();
              }}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center font-bold text-muted-foreground overflow-hidden">
                {/* Google profile photo */}
                <img
                  src={
                    user?.user_metadata?.avatar_url ||
                    user?.user_metadata?.picture ||
                    `https://ui-avatars.io/api/?name=${encodeURIComponent(
                      userName
                    )}&background=random`
                  }
                  alt={userName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div
                  className="w-full h-full flex items-center justify-center text-muted-foreground font-bold"
                  style={{ display: "none" }}
                >
                  {userName?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate" title={userName}>
                  {userName}
                </p>
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={userEmail}
                >
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 text-destructive-foreground bg-destructive text-sm font-medium mt-4 p-2 rounded-md hover:bg-destructive/90"
          >
            <LogoutIcon className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
