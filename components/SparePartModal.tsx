"use client";

import React, { useState, useEffect } from "react";
import { SparePart } from "../types";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Label from "./ui/Label";

interface SparePartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SparePart, "id">) => void;
    part: SparePart | null;
}

const SparePartModal: React.FC<SparePartModalProps> = ({
    isOpen,
    onClose,
    onSave,
    part,
}) => {
    const [reference, setReference] = useState("");
    const [designation, setDesignation] = useState("");
    const [category, setCategory] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [unitPrice, setUnitPrice] = useState(0);
    const [stockQuantity, setStockQuantity] = useState(0);
    const [minStock, setMinStock] = useState(5);
    const [location, setLocation] = useState("");

    useEffect(() => {
        if (part) {
            setReference(part.reference);
            setDesignation(part.designation);
            setCategory(part.category || "");
            setManufacturer(part.manufacturer || "");
            setUnitPrice(part.unitPrice);
            setStockQuantity(part.stockQuantity);
            setMinStock(part.minStock);
            setLocation(part.location || "");
        } else {
            setReference("");
            setDesignation("");
            setCategory("");
            setManufacturer("");
            setUnitPrice(0);
            setStockQuantity(0);
            setMinStock(5);
            setLocation("");
        }
    }, [part, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            reference,
            designation,
            category: category || undefined,
            manufacturer: manufacturer || undefined,
            unitPrice,
            stockQuantity,
            minStock,
            location: location || undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative bg-card rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">
                        {part ? "Modifier la pièce" : "Ajouter une pièce de rechange"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="reference">Référence *</Label>
                                <Input
                                    id="reference"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    required
                                    placeholder="REF-001"
                                />
                            </div>
                            <div>
                                <Label htmlFor="designation">Désignation *</Label>
                                <Input
                                    id="designation"
                                    value={designation}
                                    onChange={(e) => setDesignation(e.target.value)}
                                    required
                                    placeholder="Courroie de distribution"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">Catégorie</Label>
                                <Input
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Moteur, Hydraulique..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="manufacturer">Fabricant</Label>
                                <Input
                                    id="manufacturer"
                                    value={manufacturer}
                                    onChange={(e) => setManufacturer(e.target.value)}
                                    placeholder="Caterpillar, Komatsu..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="unitPrice">Prix unitaire (DA)</Label>
                                <Input
                                    id="unitPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="stockQuantity">Quantité en stock</Label>
                                <Input
                                    id="stockQuantity"
                                    type="number"
                                    min="0"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="minStock">Stock minimum</Label>
                                <Input
                                    id="minStock"
                                    type="number"
                                    min="0"
                                    value={minStock}
                                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="location">Emplacement</Label>
                            <Input
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Étagère A3, Bac 12..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Annuler
                            </Button>
                            <Button type="submit">
                                {part ? "Enregistrer" : "Ajouter"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SparePartModal;
