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
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

        switch (result.type) {
            case "machine":
                onSelectMachine(result.id);
                break;
            case "filter":
                onNavigateToGroup(result.id);
                break;
            case "spare_part":
                onSetView(View.SPARE_PARTS);
                // We could potentially highlight the part here if we had a selection state for it
                break;
        }
    };

    return (
        <div className="relative w-full max-w-md mx-4" ref={dropdownRef}>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Rechercher engin, filtre, pièce..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pl-10 h-9 bg-background/50 border-border/50 focus:bg-background"
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50">
                    <div className="max-h-[300px] overflow-y-auto">
                        {results.map((result) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left transition-colors border-b border-border/50 last:border-0"
                            >
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    {result.type === "machine" && <TruckIcon className="h-4 w-4" />}
                                    {result.type === "filter" && <FilterIcon className="h-4 w-4" />}
                                    {result.type === "spare_part" && <WrenchIcon className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm">{result.title}</p>
                                    <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isOpen && query.length >= 2 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border border-border rounded-lg shadow-xl text-center z-50">
                    <p className="text-sm text-muted-foreground">Aucun résultat trouvé pour "{query}"</p>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
