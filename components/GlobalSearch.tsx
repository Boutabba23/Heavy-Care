"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Machine, FilterGroup, SparePart, View } from "../types";
import { SearchIcon, TruckIcon, FilterIcon, WrenchIcon, XIcon } from "../constants";
import { Card } from "./ui/Card";
import Input from "./ui/Input";

interface GlobalSearchProps {
    machines: Machine[];
    filterGroups: FilterGroup[];
    spareParts: SparePart[];
    onSelectMachine: (machineId: string) => void;
    onNavigateToGroup: (groupId: string) => void;
    onSetView: (view: View) => void;
}

type SearchResult = {
    id: string;
    type: "machine" | "filter" | "spare_part";
    title: string;
    subtitle: string;
    data: any;
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({
    machines,
    filterGroups,
    spareParts,
    onSelectMachine,
    onNavigateToGroup,
    onSetView,
}) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Refs
    const dropdownRef = useRef<HTMLDivElement>(null);
    const desktopInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    // Initial mount to support portals
    useEffect(() => {
        setMounted(true);
    }, []);

    // Close dropdown when clicking outside (Desktop)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when mobile search opens
    useEffect(() => {
        if (isMobileSearchOpen && mobileInputRef.current) {
            // Small timeout to ensure render in portal is complete
            setTimeout(() => {
                mobileInputRef.current?.focus();
            }, 50);
        }
    }, [isMobileSearchOpen]);

    const results = useMemo(() => {
        if (!query.trim() || query.length < 2) return [];

        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        // Search Machines
        machines.forEach((m) => {
            if (
                m.code.toLowerCase().includes(lowerQuery) ||
                m.designation.toLowerCase().includes(lowerQuery)
            ) {
                searchResults.push({
                    id: m.id,
                    type: "machine",
                    title: m.designation,
                    subtitle: `Engin: ${m.code}`,
                    data: m,
                });
            }
        });

        // Search Filter Groups
        filterGroups.forEach((fg) => {
            const hasMatchingReference = fg.references.some((ref) =>
                ref.reference.toLowerCase().includes(lowerQuery)
            );

            if (fg.name.toLowerCase().includes(lowerQuery) || hasMatchingReference) {
                searchResults.push({
                    id: fg.id,
                    type: "filter",
                    title: fg.name,
                    subtitle: `Filtre: ${fg.filterType}`,
                    data: fg,
                });
            }
        });

        // Search Spare Parts
        spareParts.forEach((sp) => {
            if (
                sp.reference.toLowerCase().includes(lowerQuery) ||
                sp.designation.toLowerCase().includes(lowerQuery)
            ) {
                searchResults.push({
                    id: sp.id,
                    type: "spare_part",
                    title: sp.designation,
                    subtitle: `Pièce: ${sp.reference}`,
                    data: sp,
                });
            }
        });

        return searchResults.slice(0, 8); // Limit results
    }, [query, machines, filterGroups, spareParts]);

    const handleResultClick = (result: SearchResult) => {
        setQuery("");
        setIsOpen(false);
        setIsMobileSearchOpen(false);

        switch (result.type) {
            case "machine":
                onSelectMachine(result.id);
                break;
            case "filter":
                onNavigateToGroup(result.id);
                break;
            case "spare_part":
                onSetView(View.SPARE_PARTS);
                break;
        }
    };

    const renderResults = () => {
        if (results.length === 0 || query.length < 2) return null;

        return (
            <div className="rounded-2xl border-2 border-foreground bg-card shadow-[5px_6px_0_0_hsl(var(--foreground))] overflow-hidden w-full">
                <div className="max-h-[60vh] md:max-h-[300px] overflow-y-auto">
                    {results.map((result) => (
                        <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full flex items-center gap-3 p-4 md:p-3 hover:bg-muted text-left transition-colors border-b-2 border-foreground/10 last:border-0"
                        >
                            <span
                                className={`flex-shrink-0 flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-xl border-2 border-foreground ${
                                    result.type === "machine"
                                        ? "bg-sky-200 text-sky-700"
                                        : result.type === "filter"
                                        ? "bg-rose-200 text-rose-600"
                                        : "bg-amber-200 text-amber-700"
                                }`}
                            >
                                {result.type === "machine" && <TruckIcon className="h-5 w-5 md:h-4 md:w-4" />}
                                {result.type === "filter" && <FilterIcon className="h-5 w-5 md:h-4 md:w-4" />}
                                {result.type === "spare_part" && <WrenchIcon className="h-5 w-5 md:h-4 md:w-4" />}
                            </span>
                            <div>
                                <p className="font-bold text-foreground text-sm md:text-base">{result.title}</p>
                                <p className="text-xs font-medium text-muted-foreground">{result.subtitle}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderNoResults = () => {
        if (query.length >= 2 && results.length === 0) {
            return (
                <div className="p-4 rounded-2xl border-2 border-foreground bg-card shadow-[5px_6px_0_0_hsl(var(--foreground))] text-center w-full mt-2">
                    <p className="text-sm text-muted-foreground">Aucun résultat pour "{query}"</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="relative flex items-center justify-end md:w-full md:max-w-md mx-2">
            {/* Mobile Search Icon Button */}
            <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden p-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Rechercher"
            >
                <SearchIcon className="h-6 w-6" />
            </button>

            {/* Desktop Search Bar */}
            <div className="hidden md:block w-full relative" ref={dropdownRef}>
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                    ref={desktopInputRef}
                    type="text"
                    placeholder="Rechercher engin, filtre, pièce..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pl-10 h-9 w-full rounded-full bg-card"
                />

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50">
                        {renderResults()}
                        {renderNoResults()}
                    </div>
                )}
            </div>

            {/* Mobile Search Portal */}
            {mounted && isMobileSearchOpen && createPortal(
                <div className="fixed inset-0 z-[9999] bg-background/60 backdrop-blur-md flex flex-col items-center pt-8 px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg relative">
                        <div className="relative flex items-center mb-4">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                            <Input
                                ref={mobileInputRef}
                                type="text"
                                placeholder="Rechercher..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-11 pr-10 h-12 text-lg bg-card w-full rounded-full"
                            />
                            <button
                                onClick={() => setIsMobileSearchOpen(false)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mobile Results */}
                        <div className="w-full space-y-2">
                            {renderResults()}
                            {renderNoResults()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default GlobalSearch;
