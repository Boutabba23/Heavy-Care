"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Machine, FilterGroup, SparePart, View } from "../types";
import { SearchIcon, TruckIcon, FilterIcon, WrenchIcon } from "../constants";
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (!query) setIsMobileSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [query]);

    // Focus input when mobile search opens
    useEffect(() => {
        if (isMobileSearchOpen && inputRef.current) {
            inputRef.current.focus();
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

    return (
        <div className="relative flex items-center justify-end md:w-full md:max-w-md mx-4" ref={dropdownRef}>
            {/* Mobile Search Icon Button */}
            <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden p-2 rounded-full text-foreground/80 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Rechercher"
            >
                <SearchIcon className="h-6 w-6" />
            </button>

            {/* Desktop Search Bar / Mobile Overlay */}
            <div className={`
                ${isMobileSearchOpen
                    ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 flex flex-col items-center pt-16 md:relative md:inset-auto md:p-0 md:bg-transparent md:backdrop-blur-none"
                    : "hidden md:block w-full"
                }
            `}>
                <div className="relative w-full max-w-2xl md:max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Rechercher engin, filtre, pièce..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="pl-10 h-10 md:h-9 bg-card md:bg-background/50 border-border/50 focus:bg-card shadow-lg md:shadow-none"
                    />
                    {isMobileSearchOpen && (
                        <button
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80"
                        >
                            Annuler
                        </button>
                    )}
                </div>

                {(isOpen || isMobileSearchOpen) && results.length > 0 && query.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 md:mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 w-full max-w-2xl md:max-w-md mx-auto mt-4">
                        <div className="max-h-[60vh] md:max-h-[300px] overflow-y-auto">
                            {results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full flex items-center gap-3 p-4 md:p-3 hover:bg-muted text-left transition-colors border-b border-border/50 last:border-0"
                                >
                                    <div className="flex-shrink-0 h-10 w-10 md:h-8 md:w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        {result.type === "machine" && <TruckIcon className="h-5 w-5 md:h-4 md:w-4" />}
                                        {result.type === "filter" && <FilterIcon className="h-5 w-5 md:h-4 md:w-4" />}
                                        {result.type === "spare_part" && <WrenchIcon className="h-5 w-5 md:h-4 md:w-4" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm md:text-base">{result.title}</p>
                                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {isMobileSearchOpen && query.length >= 2 && results.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-4 p-8 bg-card border border-border rounded-lg shadow-xl text-center z-50 w-full max-w-2xl mx-auto">
                        <p className="text-sm text-muted-foreground">Aucun résultat trouvé pour "{query}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalSearch;
