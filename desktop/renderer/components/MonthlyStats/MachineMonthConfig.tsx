import React, { useState, useEffect } from 'react';
import { Machine } from '../../types';
import { MachineMonthlyStat } from '../../types/monthly-stats';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import { XIcon, CheckIcon, WrenchIcon } from '../../constants'; // Use existing constants

interface MachineMonthConfigProps {
    machine: Machine;
    month: string;
    currentStat?: MachineMonthlyStat | null;
    onSave: (stat: Omit<MachineMonthlyStat, 'id' | 'breakdownDays'>) => Promise<void>;
    onClose: () => void;
}

export const MachineMonthConfig: React.FC<MachineMonthConfigProps> = ({
    machine,
    month,
    currentStat,
    onSave,
    onClose
}) => {
    const [startHours, setStartHours] = useState<number>(0);
    const [endHours, setEndHours] = useState<number>(0);
    const [worksOnWeekends, setWorksOnWeekends] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentStat) {
            setStartHours(currentStat.startHours);
            setEndHours(currentStat.endHours);
            setWorksOnWeekends(currentStat.worksOnWeekends);
        } else {
            setStartHours(machine.serviceHours || 0);
            setEndHours(machine.serviceHours || 0);
        }
    }, [currentStat, machine]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave({
                machineId: machine.id,
                month,
                startHours,
                endHours,
                worksOnWeekends,
                breakdownHours: currentStat?.breakdownHours || {},
                idleDays: currentStat?.idleDays || [],
                idleHours: currentStat?.idleHours || {}
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const hoursDiff = endHours - startHours;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-md border border-border">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div>
                        <h3 className="text-lg font-bold">Configuration Mensuelle</h3>
                        <p className="text-sm text-muted-foreground">{machine.code} - {month}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Compteur Début</Label>
                            <Input
                                type="number"
                                value={startHours}
                                onChange={(e) => setStartHours(Number(e.target.value))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Compteur Fin</Label>
                            <Input
                                type="number"
                                value={endHours}
                                onChange={(e) => setEndHours(Number(e.target.value))}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <WrenchIcon className="text-primary w-4 h-4" />
                            <span className="font-medium">Total Heures Actives</span>
                        </div>
                        <span className={`text-xl font-bold ${hoursDiff < 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {hoursDiff.toFixed(1)} h
                        </span>
                    </div>

                    <div className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setWorksOnWeekends(!worksOnWeekends)}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${worksOnWeekends ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}>
                            {worksOnWeekends && <CheckIcon className="w-3 h-3" />}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium">Travaille les Weekends ?</div>
                            <div className="text-xs text-muted-foreground">Active la distribution des heures le Vendredi/Samedi</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSave} disabled={loading || hoursDiff < 0} className="gap-2">
                        <CheckIcon className="w-4 h-4" />
                        {loading ? 'Sauvegarde...' : 'Enregistrer'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
