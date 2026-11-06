"use client";

import React, { useState, useMemo } from "react";
import {
    SparePart, SparePartInstallation, Machine

} from "../types";
import Button from "./ui/Button";
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    SearchIcon,
    EyeIcon,
} from "../constants";
import { Card } from "./ui/Card";
import Input from "./ui/Input";
import Badge from "./ui/Badge";

interface SparePartsViewProps {
    spareParts: SparePart[];
    installations: SparePartInstallation[];
    machines: Machine[];
    onAddSparePart: () => void;
    onEditSparePart: (part: SparePart) => void;
    onDeleteSparePart: (partId: string) => void;
    onAddInstallation: (sparePartId?: string) => void;
    onOpenConfirmationDialog: (config: {
        title: string;
        description: string;
        onConfirm: () => void;
    }) => void;
}

const getStockBadgeVariant = (
    stock: number,
    minStock: number
): "default" | "destructive" | "warning" | "success" => {
    if (stock <= 0) return "destructive";
    if (stock <= minStock) return "warning";
    return "success";
};

export const SparePartsView: React.FC<SparePartsViewProps> = ({
    spareParts,
    installations,
    machines,
    onAddSparePart,
    onEditSparePart,
    onDeleteSparePart,
    onAddInstallation,
    onOpenConfirmationDialog,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        spareParts.forEach((part) => {
            if (part.category) cats.add(part.category);
        });
        return Array.from(cats).sort();
    }, [spareParts]);

    // Filter spare parts
    const filteredParts = useMemo(() => {
        return spareParts.filter((part) => {
            const matchesSearch =
                part.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (part.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                (part.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            const matchesCategory =
                categoryFilter === "all" || part.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [spareParts, searchTerm, categoryFilter]);

    // Get installations for a specific part
    const getPartInstallations = (partId: string) => {
        return installations
            .filter((inst) => inst.sparePartId === partId)
            .sort((a, b) => new Date(b.installationDate).getTime() - new Date(a.installationDate).getTime());
    };

    // Get machine name by ID
    const getMachineName = (machineId: string) => {
        const machine = machines.find((m) => m.id === machineId);
        return machine ? `${machine.code} - ${machine.designation}` : "Machine inconnue";
    };

    const handleDeleteClick = (part: SparePart) => {
        onOpenConfirmationDialog({
            title: "Supprimer la pièce de rechange",
            description: `Êtes-vous sûr de vouloir supprimer "${part.designation}" ? Cette action est irréversible.`,
            onConfirm: () => onDeleteSparePart(part.id),
        });
    };

    // Calculate total stock value
    const totalStockValue = useMemo(() => {
        return spareParts.reduce((sum, part) => sum + part.unitPrice * part.stockQuantity, 0);
    }, [spareParts]);

    // Count low stock items
    const lowStockCount = useMemo(() => {
        return spareParts.filter((part) => part.stockQuantity <= part.minStock).length;
    }, [spareParts]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Pièces de Rechange</h1>
                    <p className="font-medium text-muted-foreground mt-1">
                        Gérez votre stock de pièces et suivez les installations
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => onAddInstallation()} variant="outline">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Nouveau Montage
                    </Button>
                    <Button onClick={onAddSparePart}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Ajouter Pièce
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Pièces</p>
                    <p className="text-3xl font-black tracking-tight text-foreground">{spareParts.length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Valeur Stock</p>
                    <p className="text-3xl font-black tracking-tight text-foreground">
                        {totalStockValue.toLocaleString("fr-FR")} DA
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Stock Bas</p>
                    <p className={`text-3xl font-black tracking-tight ${lowStockCount > 0 ? "text-destructive" : "text-success"}`}>
                        {lowStockCount}
                    </p>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Rechercher par réf, désignation, N° série ou fabricant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border-2 border-foreground/90 bg-card font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    <option value="all">Toutes les catégories</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Spare Parts List */}
            {filteredParts.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                        {spareParts.length === 0
                            ? "Aucune pièce de rechange. Cliquez sur 'Ajouter Pièce' pour commencer."
                            : "Aucune pièce ne correspond à votre recherche."}
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredParts.map((part) => {
                        const partInstallations = getPartInstallations(part.id);
                        const isExpanded = selectedPartId === part.id;

                        return (
                            <Card key={part.id} className="overflow-hidden">
                                <div className="p-4">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                        {/* Part Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-black text-foreground">{part.designation}</h3>
                                                <Badge variant={getStockBadgeVariant(part.stockQuantity, part.minStock)}>
                                                    Stock: {part.stockQuantity}
                                                </Badge>
                                                {part.category && (
                                                    <Badge variant="default">{part.category}</Badge>
                                                )}
                                            </div>
                                            <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                                <p><span className="font-medium">Réf:</span> {part.reference}</p>
                                                {part.serialNumber && (
                                                    <p><span className="font-medium">S/N:</span> {part.serialNumber}</p>
                                                )}
                                                {part.manufacturer && (
                                                    <p><span className="font-medium">Fabricant:</span> {part.manufacturer}</p>
                                                )}
                                                <p>
                                                    <span className="font-medium">Prix unitaire:</span>{" "}
                                                    {part.unitPrice.toLocaleString("fr-FR")} DA
                                                </p>
                                                {part.location && (
                                                    <p><span className="font-medium">Emplacement:</span> {part.location}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-start gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedPartId(isExpanded ? null : part.id)}
                                                title="Voir historique"
                                            >
                                                <EyeIcon className="h-4 w-4" />
                                                <span className="ml-1">{partInstallations.length}</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onAddInstallation(part.id)}
                                                title="Ajouter un montage"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEditSparePart(part)}
                                                title="Modifier"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(part)}
                                                title="Supprimer"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Installation History */}
                                {isExpanded && (
                                    <div className="border-t-2 border-foreground/10 bg-muted/40 p-4">
                                        <h4 className="font-black uppercase tracking-wide text-xs text-muted-foreground mb-3">
                                            Historique des montages ({partInstallations.length})
                                        </h4>
                                        {partInstallations.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                Aucun montage enregistré pour cette pièce.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {partInstallations.slice(0, 5).map((inst) => (
                                                    <div
                                                        key={inst.id}
                                                        className="flex flex-col sm:flex-row justify-between gap-2 p-3 bg-card rounded-xl border-2 border-foreground/20"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-foreground">
                                                                {getMachineName(inst.machineId)}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {new Date(inst.installationDate).toLocaleDateString("fr-FR")}
                                                                {inst.serviceHoursAtInstall && ` • ${inst.serviceHoursAtInstall}h`}
                                                                {inst.installedBy && ` • Par: ${inst.installedBy}`}
                                                            </p>
                                                            {inst.notes && (
                                                                <p className="text-sm text-muted-foreground mt-1">{inst.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <Badge variant="default">Qté: {inst.quantity}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                                {partInstallations.length > 5 && (
                                                    <p className="text-sm text-muted-foreground text-center">
                                                        Et {partInstallations.length - 5} autres montages...
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SparePartsView;
