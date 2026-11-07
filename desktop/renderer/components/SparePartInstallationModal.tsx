"use client";

import React, { useState, useEffect } from "react";
import { SparePartInstallation, SparePart, Machine } from "../types";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Label from "./ui/Label";

interface SparePartInstallationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SparePartInstallation, "id">) => void;
    spareParts: SparePart[];
    machines: Machine[];
    preselectedSparePartId?: string;
}

const SparePartInstallationModal: React.FC<SparePartInstallationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    spareParts,
    machines,
    preselectedSparePartId,
}) => {
    const [sparePartId, setSparePartId] = useState("");
    const [machineId, setMachineId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [installationDate, setInstallationDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [serviceHoursAtInstall, setServiceHoursAtInstall] = useState<number | undefined>();
    const [installedBy, setInstalledBy] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (isOpen) {
            setSparePartId(preselectedSparePartId || "");
            setMachineId("");
            setQuantity(1);
            setInstallationDate(new Date().toISOString().split("T")[0]);
            setServiceHoursAtInstall(undefined);
            setInstalledBy("");
            setNotes("");
        }
    }, [isOpen, preselectedSparePartId]);

    // Auto-fill service hours when machine is selected
    useEffect(() => {
        if (machineId) {
            const machine = machines.find((m) => m.id === machineId);
            if (machine) {
                setServiceHoursAtInstall(machine.serviceHours);
            }
        }
    }, [machineId, machines]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            sparePartId,
            machineId,
            quantity,
            installationDate,
            serviceHoursAtInstall,
            installedBy: installedBy || undefined,
            notes: notes || undefined,
        });
        onClose();
    };

    const selectedPart = spareParts.find((p) => p.id === sparePartId);

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
                        Enregistrer un montage
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="sparePartId">Pièce de rechange *</Label>
                            <select
                                id="sparePartId"
                                value={sparePartId}
                                onChange={(e) => setSparePartId(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                            >
                                <option value="">Sélectionner une pièce</option>
                                {spareParts.map((part) => (
                                    <option key={part.id} value={part.id}>
                                        {part.reference} - {part.designation} (Stock: {part.stockQuantity})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="machineId">Engin *</Label>
                            <select
                                id="machineId"
                                value={machineId}
                                onChange={(e) => setMachineId(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                            >
                                <option value="">Sélectionner un engin</option>
                                {machines.map((machine) => (
                                    <option key={machine.id} value={machine.id}>
                                        {machine.code} - {machine.designation} ({machine.serviceHours}h)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="quantity">Quantité *</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    max={selectedPart?.stockQuantity || 999}
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    required
                                />
                                {selectedPart && quantity > selectedPart.stockQuantity && (
                                    <p className="text-xs text-destructive mt-1">
                                        Stock insuffisant ({selectedPart.stockQuantity} disponibles)
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="installationDate">Date de montage *</Label>
                                <Input
                                    id="installationDate"
                                    type="date"
                                    value={installationDate}
                                    onChange={(e) => setInstallationDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="serviceHoursAtInstall">Heures compteur</Label>
                                <Input
                                    id="serviceHoursAtInstall"
                                    type="number"
                                    min="0"
                                    value={serviceHoursAtInstall ?? ""}
                                    onChange={(e) =>
                                        setServiceHoursAtInstall(
                                            e.target.value ? parseInt(e.target.value) : undefined
                                        )
                                    }
                                    placeholder="Auto (heures actuelles)"
                                />
                            </div>
                            <div>
                                <Label htmlFor="installedBy">Technicien</Label>
                                <Input
                                    id="installedBy"
                                    value={installedBy}
                                    onChange={(e) => setInstalledBy(e.target.value)}
                                    placeholder="Nom du technicien"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground min-h-[80px]"
                                placeholder="Remarques, observations..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !sparePartId ||
                                    !machineId ||
                                    (selectedPart && quantity > selectedPart.stockQuantity)
                                }
                            >
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SparePartInstallationModal;
