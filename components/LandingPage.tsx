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

/** Friendly-brutalist landing page (soft pills, pastels, lime highlight). */
const LandingPage: React.FC<LandingPageProps> = ({ onSetView, stats }) => {
  const quickLinks = [
    { view: View.MACHINE_LIST, label: "Gestion du matériel", dot: "bg-emerald-400" },
    { view: View.MAINTENANCE, label: "Maintenance préventive", dot: "bg-orange-400" },
    { view: View.SPARE_PARTS, label: "Pièces de rechange", dot: "bg-purple-400" },
    { view: View.OIL_MANAGEMENT, label: "Gestion des huiles", dot: "bg-amber-400" },
  ];

  const sections = [
    {
      view: View.DASHBOARD,
      title: "Dashboard",
      subtitle: "Synthèse complète : engins, maintenances et alertes.",
      icon: <Squares2x2Icon className="h-6 w-6 text-emerald-700" />,
      iconBg: "bg-lime-200",
    },
    {
      view: View.MACHINE_LIST,
      title: "Machines",
      subtitle: "Votre parc : dossiers, heures de service et filtres.",
      icon: <ExcavatorIcon className="h-6 w-6 text-sky-700" />,
      iconBg: "bg-sky-100",
    },
    {
      view: View.MAINTENANCE,
      title: "Maintenance",
      subtitle: "Planification préventive et historique des interventions.",
      icon: <WrenchIcon className="h-6 w-6 text-orange-600" />,
      iconBg: "bg-orange-100",
    },
    {
      view: View.FILTER_MANAGEMENT,
      title: "Inventory",
      subtitle: "Filtres, pièces de rechange et gestion des huiles.",
      icon: <SparePartsIcon className="h-6 w-6 text-purple-700" />,
      iconBg: "bg-purple-100",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        {/* ---- Left : headline ---- */}
        <div>
          {/* Announcement chip */}
          <span className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-1.5 text-[13px] font-bold text-foreground">
            <span className="h-2 w-2 rounded-full bg-foreground" />
            Nouveau • Synchronisation Supabase en temps réel
          </span>

          {/* Headline */}
          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[64px]">
            Toute votre flotte est{" "}
            <span className="rounded-full bg-lime-300 px-4 pb-1 pt-0.5 inline-block -rotate-1">
              une page
            </span>{" "}
            de distance.
          </h1>

          {/* Sub copy with live counts */}
          <p className="mt-5 max-w-xl text-base font-medium text-foreground/70 sm:text-lg">
            Gérez{" "}
            <span className="font-bold text-foreground/80">
              {stats?.machines ?? "—"} engins
            </span>
            ,{" "}
            <span className="font-bold text-foreground/80">
              {stats?.maintenanceRecords ?? "—"} maintenances
            </span>{" "}
            et{" "}
            <span className="font-bold text-foreground/80">
              {stats?.spareParts ?? "—"} pièces
            </span>{" "}
            — hors-ligne, synchronisés, sans effort.
          </p>

          {/* CTA row */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSetView(View.DASHBOARD)}
              className="group flex items-center gap-2.5 rounded-full bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform duration-150 hover:scale-[1.03]"
            >
              Commencer
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() => onSetView(View.MACHINE_LIST)}
              className="rounded-full border-2 border-foreground/90 bg-card px-6 py-3.5 text-sm font-bold text-foreground transition-colors duration-150 hover:bg-muted"
            >
              Voir les machines
            </button>
          </div>

          {/* AI hint strip */}
          <button
            onClick={() => onSetView(View.DASHBOARD)}
            className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-full border border-foreground/10 bg-muted/60 px-5 py-3 text-left transition-colors duration-150 hover:bg-muted"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-300">
              <Sparkle />
            </span>
            <span className="truncate text-[13px] font-medium text-foreground/60">
              Astuce : votre assistant IA HeavyCare peut résumer votre parc…
            </span>
            <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              ↑
            </span>
          </button>

          {/* Quick link pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => onSetView(link.view)}
                className="flex items-center gap-2 rounded-full border-2 border-foreground/90 bg-card px-4 py-2 text-[13px] font-semibold text-foreground transition-colors duration-150 hover:bg-muted"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${link.dot}`} />
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Right : stacked decorative cards ---- */}
        <div className="relative mx-auto w-full max-w-md pb-8 pt-4 lg:mx-0 lg:max-w-lg">
          {/* Back card */}
          <div className="absolute right-0 top-0 hidden w-4/5 rounded-3xl border-2 border-foreground/90 bg-rose-200 p-5 sm:block">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-card px-3 py-1 text-[13px] font-bold text-foreground">
                ⚠ Maintenances
              </span>
              <span className="text-2xl font-black text-foreground/70">
                {stats?.maintenanceRecords ?? "—"}
              </span>
            </div>
          </div>
          {/* Middle card */}
          <div className="absolute right-2 top-16 hidden w-[86%] rounded-3xl border-2 border-foreground/90 bg-sky-200 p-5 sm:block">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-card px-3 py-1 text-[13px] font-bold text-foreground">
                ◈ Pièces en stock
              </span>
              <span className="text-2xl font-black text-foreground/70">
                {stats?.spareParts ?? "—"}
              </span>
            </div>
          </div>
          {/* Front card */}
          <div className="relative mt-40 rounded-3xl border-2 border-foreground/90 bg-card p-6 shadow-[0_18px_44px_rgba(0,0,0,0.14)] sm:mt-24">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-3.5 py-1.5 text-[13px] font-bold text-foreground">
                ♥ Parc actif
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-200 text-lg font-black text-sky-800">
                HC
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tight text-blue-600">
                {stats?.machines ?? "—"}
              </span>
              <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                engins
              </span>
            </div>
            <p className="mt-2 text-lg font-black text-foreground">
              Gestion du matériel
            </p>
            <p className="text-[13px] font-medium text-muted-foreground">
              Hors-ligne · Synchronisé Supabase
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-foreground/15 bg-muted px-3 py-1 text-xs font-semibold text-foreground/80">
                {stats?.filterGroups ?? "—"} filtres
              </span>
              <span className="rounded-full border border-foreground/15 bg-muted px-3 py-1 text-xs font-semibold text-foreground/80">
                Temps réel
              </span>
              <span className="rounded-full border border-foreground/15 bg-muted px-3 py-1 text-xs font-semibold text-foreground/80">
                SQLite local
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-3/4 rounded-full bg-blue-600" />
            </div>
            {/* Action row */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => onSetView(View.MACHINE_LIST)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 text-sm font-bold text-white transition-transform duration-150 hover:scale-[1.02]"
              >
                Parcourir
              </button>
              <button
                onClick={() => onSetView(View.MAINTENANCE)}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-foreground/90 bg-card text-foreground transition-colors duration-150 hover:bg-muted"
                title="Maintenance"
              >
                <WrenchIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onSetView(View.OIL_MANAGEMENT)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-lime-400 text-foreground transition-transform duration-150 hover:scale-105"
                title="Huiles"
              >
                ★
              </button>
            </div>
          </div>

          {/* Floating lime badge */}
          <div className="absolute -right-2 top-44 hidden h-24 w-24 items-center justify-center rounded-full bg-lime-300 text-center sm:flex lg:right-0">
            <div>
              <p className="text-xl font-black text-foreground">
                {stats?.machines ?? "—"}
              </p>
              <p className="text-[11px] font-bold text-foreground/60">
                engins suivis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Section cards ---- */}
      <section className="mt-10 grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2">
        {sections.map((section) => (
          <button
            key={section.title}
            onClick={() => onSetView(section.view)}
            className="group flex items-center justify-between gap-4 rounded-3xl border-2 border-foreground/90 bg-card p-5 text-left transition-all duration-150 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)] sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${section.iconBg}`}
              >
                {section.icon}
              </span>
              <div>
                <p className="text-xl font-black tracking-tight text-foreground">
                  {section.title}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                  {section.subtitle}
                </p>
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-5 w-5 shrink-0 text-foreground/40 transition-all duration-150 group-hover:translate-x-1 group-hover:text-foreground"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" />
            </svg>
          </button>
        ))}
      </section>
    </div>
  );
};

const Sparkle = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-4 w-4 text-foreground"
    aria-hidden="true"
  >
    <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" />
  </svg>
);

export default LandingPage;
