"use client";

import React from "react";
import { View } from "../types";
import {
  LogoIcon,
  Squares2x2Icon,
  ExcavatorIcon,
  WrenchIcon,
  SparePartsIcon,
} from "../constants";

interface LandingPageProps {
  onSetView: (view: View) => void;
  stats?: {
    machines: number;
    maintenanceRecords: number;
    spareParts: number;
    filterGroups: number;
  };
}

/**
 * Neo-brutalist landing page — the app's home screen.
 * Hero + 4 giant section cards that go straight to each section.
 */
const LandingPage: React.FC<LandingPageProps> = ({ onSetView, stats }) => {
  const sections = [
    {
      view: View.DASHBOARD,
      title: "Dashboard",
      subtitle: "Synthèse complète : engins, maintenances et alertes.",
      icon: <Squares2x2Icon className="h-8 w-8" />,
      bg: "bg-primary text-primary-foreground",
    },
    {
      view: View.MACHINE_LIST,
      title: "Machines",
      subtitle: "Votre parc : dossiers, heures de service et filtres.",
      icon: <ExcavatorIcon className="h-8 w-8" />,
      bg: "bg-card text-foreground",
    },
    {
      view: View.MAINTENANCE,
      title: "Maintenance",
      subtitle: "Planification préventive et historique des interventions.",
      icon: <WrenchIcon className="h-8 w-8" />,
      bg: "bg-card text-foreground",
    },
    {
      view: View.FILTER_MANAGEMENT,
      title: "Inventory",
      subtitle: "Filtres, pièces de rechange et gestion des huiles.",
      icon: <SparePartsIcon className="h-8 w-8" />,
      bg: "bg-card text-foreground",
    },
  ];

  const statItems = [
    { label: "Engins", value: stats?.machines },
    { label: "Maintenances", value: stats?.maintenanceRecords },
    { label: "Pièces", value: stats?.spareParts },
    { label: "Filtres", value: stats?.filterGroups },
  ];

  const SectionCard = ({
    section,
    className = "",
  }: {
    section: (typeof sections)[number];
    className?: string;
  }) => (
    <button
      onClick={() => onSetView(section.view)}
      className={`group flex flex-col items-start justify-between gap-6 border-2 border-foreground p-6 text-left transition-all duration-150 ${section.bg} hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none ${className}`}
    >
      <div className="flex w-full items-start justify-between">
        {section.icon}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="h-6 w-6 transition-transform duration-150 group-hover:translate-x-1 group-hover:-translate-y-1"
          aria-hidden="true"
        >
          <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="square" />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-black uppercase tracking-tight">
          {section.title}
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80">
          {section.subtitle}
        </p>
      </div>
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="border-2 border-foreground bg-card p-6 shadow-[8px_8px_0_0_hsl(var(--foreground))] sm:p-10">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-14 w-14 shrink-0" />
          <span className="border-2 border-foreground bg-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-background">
            HeavyCare
          </span>
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-black uppercase leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          Tout votre parc,{" "}
          <span className="bg-primary px-2 text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            une seule page.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-bold uppercase tracking-wide text-foreground/70 sm:text-base">
          Engins, maintenance préventive, filtres, pièces et huiles —
          centralisés, hors-ligne, synchronisés.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onSetView(View.DASHBOARD)}
            className={`flex items-center gap-2 border-2 border-foreground bg-foreground px-5 py-3 text-xs font-black uppercase tracking-widest text-background transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none`}
          >
            Commencer{" "}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="square" />
            </svg>
          </button>
          <button
            onClick={() => onSetView(View.MACHINE_LIST)}
            className="flex items-center gap-2 border-2 border-foreground bg-card px-5 py-3 text-xs font-black uppercase tracking-widest text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            Voir les machines
          </button>
        </div>
      </section>

      {/* Section cards */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </section>

      {/* Stats strip */}
      <section className="mt-8 grid grid-cols-2 border-2 border-foreground bg-card sm:grid-cols-4">
        {statItems.map((item, idx) => (
          <div
            key={item.label}
            className={`flex flex-col items-center gap-1 border-foreground px-4 py-6 text-center ${
              idx % 2 === 0 ? "border-r-2 sm:border-r-2" : ""
            } ${idx < 2 ? "border-b-2 sm:border-b-0" : ""} ${
              idx === 2 ? "sm:border-r-2" : ""
            } ${idx > 0 ? "sm:border-l-0" : ""} border-l-2 sm:border-l-0 ${
              idx === 1 ? "sm:border-l-2" : ""
            }`}
          >
            <span className="text-3xl font-black tabular-nums text-foreground sm:text-4xl">
              {item.value ?? "—"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
              {item.label}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
