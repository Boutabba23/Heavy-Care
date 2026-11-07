"use client";

import React, { useEffect, useRef, useState } from "react";
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
 * Neo-brutalist landing page — rounded cards, thin dark outline, hard black
 * offset shadows. Every accent (buttons, highlight, tiles) comes from the
 * theme picked with the theme button: hsl(var(--primary)).
 */
const LandingPage: React.FC<LandingPageProps> = ({ onSetView, stats }) => {
  // Looping card deck on the right — cycles forever, pauses on hover.
  const [deckOrder, setDeckOrder] = useState(0);
  const deckPausedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!deckPausedRef.current) {
        setDeckOrder((o) => (o + 1) % 3);
      }
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const quickLinks = [
    { view: View.MACHINE_LIST, label: "Gestion du matériel", dot: "bg-emerald-400" },
    { view: View.MAINTENANCE, label: "Maintenance préventive", dot: "bg-orange-400" },
    { view: View.SPARE_PARTS, label: "Pièces de rechange", dot: "bg-pink-400" },
    { view: View.OIL_MANAGEMENT, label: "Gestion des huiles", dot: "bg-amber-400" },
  ];

  const sections = [
    {
      view: View.DASHBOARD,
      title: "Tableau de bord",
      subtitle: "Synthèse complète : engins, maintenances et alertes.",
      icon: <Squares2x2Icon className="h-5 w-5 text-white" />,
      tile: "bg-emerald-500",
    },
    {
      view: View.MACHINE_LIST,
      title: "Matériel",
      subtitle: "Votre parc : dossiers, heures de service et filtres.",
      icon: <ExcavatorIcon className="h-5 w-5 text-white" />,
      tile: "bg-sky-500",
    },
    {
      view: View.MAINTENANCE,
      title: "Maintenance",
      subtitle: "Planification préventive et historique des interventions.",
      icon: <WrenchIcon className="h-5 w-5 text-white" />,
      tile: "bg-orange-500",
    },
    {
      view: View.FILTER_MANAGEMENT,
      title: "Inventaire",
      subtitle: "Filtres, pièces de rechange et gestion des huiles.",
      icon: <SparePartsIcon className="h-5 w-5 text-white" />,
      tile: "bg-pink-500",
    },
  ];

  // Data shown by the three looping cards (fed from real app stats)
  const deckCards = [
    {
      key: "maint",
      tag: "Maintenances",
      unit: "interventions",
      title: "Suivi préventif",
      value: stats?.maintenanceRecords ?? "—",
      view: View.MAINTENANCE,
      bg: "bg-rose-200",
      pill: "bg-rose-500",
      icon: <WrenchIcon className="h-3.5 w-3.5 text-white" />,
      tile: "bg-rose-500",
      chips: ["6 derniers mois", "Planifiées"],
    },
    {
      key: "parts",
      tag: "Pièces en stock",
      unit: "pièces",
      title: "Inventaire pièces",
      value: stats?.spareParts ?? "—",
      view: View.SPARE_PARTS,
      bg: "bg-sky-200",
      pill: "bg-sky-500",
      icon: <SparePartsIcon className="h-3.5 w-3.5 text-white" />,
      tile: "bg-sky-500",
      chips: ["Pièces & Huiles", "SQLite local"],
    },
    {
      key: "parc",
      tag: "Parc actif",
      unit: "engins",
      title: "Gestion du matériel",
      value: stats?.machines ?? "—",
      view: View.MACHINE_LIST,
      bg: "bg-amber-200",
      pill: "bg-primary",
      icon: <ExcavatorIcon className="h-3.5 w-3.5 text-primary-foreground" />,
      tile: "bg-primary",
      chips: [`${stats?.filterGroups ?? "—"} filtres`, "Temps réel", "Supabase"],
    },
  ];

  // Three stack slots the cards glide between
  const deckSlots = [
    {
      pos: "top-0 right-6 z-10 w-3/4",
      tilt: "rotate-2",
      dim: "opacity-70 scale-95",
    },
    {
      pos: "top-20 right-0 z-20 w-[88%]",
      tilt: "-rotate-1",
      dim: "opacity-90",
    },
    {
      pos: "top-44 -translate-x-1/2 left-1/2 z-30 w-[92%] sm:w-[88%]",
      tilt: "rotate-0",
      dim: "opacity-100",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 items-center gap-10 pb-6 lg:grid-cols-2">
        {/* ---- Left : headline ---- */}
        <div>
          {/* Headline with theme-coloured highlight */}
          <h1 className="mt-6 text-4xl font-black leading-[1.12] tracking-tight text-foreground sm:text-6xl">
            Toute votre flotte est{" "}
            <span className="relative inline-block -rotate-1 rounded-lg bg-primary px-4 text-primary-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))]">
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

          {/* CTA row — like "Get Started / Download" */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSetView(View.DASHBOARD)}
              className="group flex items-center gap-2.5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] ring-2 ring-foreground transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-1 active:translate-y-1 active:shadow-none"
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
              className="rounded-full bg-card px-6 py-3 text-sm font-bold text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] ring-2 ring-foreground transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Voir les machines
            </button>
          </div>

          {/* AI hint strip */}
          <button
            onClick={() => onSetView(View.DASHBOARD)}
            className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-foreground/15 bg-card px-5 py-3 text-left shadow-[3px_4px_0_0_rgba(0,0,0,0.15)] transition-colors duration-150 hover:bg-muted"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
                className="flex items-center gap-2 rounded-full border-2 border-foreground/90 bg-card px-4 py-2 text-[13px] font-semibold text-foreground transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${link.dot}`} />
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Right : looping 3-card deck (Deco style) ---- */}
        <div
          className="relative mx-auto h-[400px] w-full max-w-md pb-8 pt-4 lg:mx-0 lg:max-w-lg"
          onMouseEnter={() => (deckPausedRef.current = true)}
          onMouseLeave={() => (deckPausedRef.current = false)}
        >
          {deckCards.map((card, i) => {
            const slot = (i + deckOrder) % 3;
            const s = deckSlots[slot];
            const isFront = slot === 2;
            return (
              <div
                key={card.key}
                onClick={() => onSetView(card.view)}
                className={`absolute cursor-pointer rounded-2xl border-2 border-foreground p-5 shadow-[6px_7px_0_0_hsl(var(--foreground))] transition-all duration-700 ease-in-out sm:p-6 ${
                  s.pos
                } ${s.tilt} ${s.dim} ${isFront ? "bg-card" : card.bg}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-2 rounded-full border-2 border-foreground px-3 py-1.5 text-[13px] font-bold text-white ${card.pill}`}
                  >
                    {card.icon}
                    {card.tag}
                  </span>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground text-white shadow-[2px_2px_0_0_hsl(var(--foreground))] ${card.tile}`}
                  >
                    {card.icon}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span
                    className={`text-5xl font-black tracking-tight ${
                      isFront ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {card.value}
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    {card.unit}
                  </span>
                </div>
                <p className="mt-1 text-sm font-black text-foreground">
                  {card.title}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border-2 border-foreground/15 bg-muted/70 px-2.5 py-1 text-[11px] font-bold text-foreground/80"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Deck progress dots (clickable + hover to jump) */}
          <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {deckCards.map((card, i) => {
              const isFront = (i + deckOrder) % 3 === 2;
              return (
                <button
                  key={card.key}
                  onClick={() => setDeckOrder((i - 2 + 3) % 3)}
                  onMouseEnter={() => setDeckOrder((i - 2 + 3) % 3)}
                  title={`Aller à ${card.tag}`}
                  className={`h-2.5 rounded-full border-2 border-foreground transition-all duration-300 ${
                    isFront ? "w-8 bg-primary" : "w-2.5 bg-card hover:bg-muted"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Section cards — Deco style tiles ---- */}
      <section className="mt-4 grid grid-cols-1 gap-6 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <button
            key={section.title}
            onClick={() => onSetView(section.view)}
            className="group flex flex-col items-start gap-4 rounded-2xl border-2 border-foreground bg-card p-5 text-left shadow-[5px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none sm:p-6"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${section.tile} shadow-[3px_3px_0_0_hsl(var(--foreground))] ring-2 ring-foreground`}
            >
              {section.icon}
            </span>
            <div>
              <p className="text-lg font-black tracking-tight text-foreground">
                {section.title}
              </p>
              <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                {section.subtitle}
              </p>
            </div>
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
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" />
  </svg>
);

export default LandingPage;
