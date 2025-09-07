import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MaintenanceRecord, Machine, FilterType, FilterGroup, UsedFilter, FilterReference } from '../types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';
import Label from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { PlusIcon, TrashIcon } from '../constants';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: MaintenanceRecord | Omit<MaintenanceRecord, 'id'>) => void;
  machines: Machine[];
  filterTypes: FilterType[];
  filterGroups: FilterGroup[];
  // fix: Allow a partial record to be passed for creating a new maintenance log with pre-filled data.
  record: Partial<MaintenanceRecord> | null;
  viewOnly?: boolean;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSave, machines, filterTypes, filterGroups, record, viewOnly = false }) => {
  const [machineId, setMachineId] = useState<string>('');
  const [maintenanceRange, setMaintenanceRange] = useState<'C' | 'D' | 'E' | 'F'>('C');
  const [serviceHours, setServiceHours] = useState('');
  const [date, setDate] = useState('');
  const [filtersUsed, setFiltersUsed] = useState<UsedFilter[]>([]);
  const [error, setError] = useState('');

  const [newFilter, setNewFilter] = useState({ typeId: '', refId: '', quantity: '1' });
  const [addFilterErrors, setAddFilterErrors] = useState<{ refId?: string; quantity?: string }>({});
  
  // fix: Correctly determine if editing an existing record by checking for the presence of an ID.
  const isEditing = !!record?.id;

  const formatMachineLabel = (machine: Machine): string => {
    const label = `${machine.code} - ${machine.designation}`;
    const maxLength = 40;
    if (label.length > maxLength) {
        return label.substring(0, maxLength - 3) + '...';
    }
    return label;
  }

  // fix: Refactor useEffect to safely handle a partial 'record' object by providing default values.
  useEffect(() => {
    if (isOpen) {
      setMachineId(record?.machineId || (machines.length > 0 ? machines[0].id : ''));
      setMaintenanceRange(record?.maintenanceRange || 'C');
      setServiceHours(String(record?.serviceHours || ''));
      setDate(record?.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setFiltersUsed(record?.filtersUsed || []);
      
      setNewFilter({ typeId: '', refId: '', quantity: '1' });
      setError('');
      setAddFilterErrors({});
    }
  }, [isOpen, record, machines]);

  const selectedMachine = useMemo(() => machines.find(m => m.id === machineId), [machineId, machines]);

  const availableFilterTypesForMachine = useMemo(() => {
    return selectedMachine
      ? selectedMachine.assignedFilters
          .filter(af => af.filterGroupId)
          .map(af => filterTypes.find(ft => ft.id === af.filterTypeId))
          .filter((ft): ft is FilterType => !!ft)
          .sort((a,b) => a.name.localeCompare(b.name))
      : [];
  }, [selectedMachine, filterTypes]);

  const availableReferencesForType = useMemo((): FilterReference[] => {
    if (!selectedMachine || !newFilter.typeId) return [];
    const assignedFilter = selectedMachine.assignedFilters.find(af => af.filterTypeId === newFilter.typeId);
    if (!assignedFilter || !assignedFilter.filterGroupId) return [];
    const filterGroup = filterGroups.find(fg => fg.id === assignedFilter.filterGroupId);
    return filterGroup ? filterGroup.references : [];
  }, [selectedMachine, newFilter.typeId, filterGroups]);

  useEffect(() => {
    setNewFilter(prev => ({ ...prev, refId: '' }));
  }, [newFilter.typeId]);
  
  const getUsedFilterDetails = useCallback((usedFilter: UsedFilter) => {
    const type = filterTypes.find(ft => ft.id === usedFilter.filterTypeId)?.name || 'Inconnu';
    let reference = 'Inconnu';
    let manufacturer = 'Inconnu';
    let price = 0;

    const group = filterGroups.find(fg => fg.references.some(r => r.id === usedFilter.referenceId));
    if(group) {
        const ref = group.references.find(r => r.id === usedFilter.referenceId);
        if(ref) {
            reference = ref.reference;
            manufacturer = ref.manufacturer;
            price = ref.price;
        }
    }
    return { type, reference, manufacturer, price };
  }, [filterTypes, filterGroups]);

  const totalCost = useMemo(() => {
    return filtersUsed.reduce((total, currentFilter) => {
        const details = getUsedFilterDetails(currentFilter);
        return total + (details.price * currentFilter.quantity);
    }, 0);
  }, [filtersUsed, getUsedFilterDetails]);

  const handleAddFilter = () => {
    if (!newFilter.typeId) return;

    const errors: { refId?: string; quantity?: string } = {};

    if (!newFilter.refId) {
        errors.refId = 'Veuillez sélectionner une référence.';
    }
    
    const qty = parseInt(newFilter.quantity, 10);
    if (!newFilter.quantity || isNaN(qty) || qty <= 0) {
        errors.quantity = 'La quantité doit être un nombre positif.';
    }

    if (Object.keys(errors).length > 0) {
        setAddFilterErrors(errors);
        return;
    }
    
    setAddFilterErrors({});

    if(filtersUsed.some(f => f.referenceId === newFilter.refId)) {
        // For simplicity, we don't allow adding the same reference twice. Could be changed to update quantity.
        return;
    }

    setFiltersUsed(prev => [...prev, {
        filterTypeId: newFilter.typeId,
        referenceId: newFilter.refId!,
        quantity: qty,
    }]);
    
    setNewFilter({ typeId: newFilter.typeId, refId: '', quantity: '1' });
  };
  
  const handleRemoveFilter = (referenceIdToRemove: string) => {
    setFiltersUsed(prev => prev.filter(f => f.referenceId !== referenceIdToRemove));
  };
  
  const handleSave = () => {
    if (!machineId || !serviceHours || !date) {
        setError('Veuillez remplir tous les champs obligatoires.');
        return;
    }
    const hours = parseInt(serviceHours, 10);
    if (isNaN(hours) || hours < 0) {
        setError('Les heures de service doivent être un nombre positif.');
        return;
    }

    const recordData = {
        machineId,
        maintenanceRange,
        serviceHours: hours,
        date: new Date(date).toISOString(),
        filtersUsed,
    };
    
    if (isEditing) {
      onSave({ id: record!.id!, ...recordData });
    } else {
      onSave(recordData);
    }

    onClose();
  };
  
  const handleRefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewFilter(prev => ({...prev, refId: e.target.value}));
    if (e.target.value) {
        setAddFilterErrors(prev => ({ ...prev, refId: undefined }));
    }
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFilter({...newFilter, quantity: e.target.value});
    const qty = parseInt(e.target.value, 10);
    if (e.target.value && !isNaN(qty) && qty > 0) {
        setAddFilterErrors(prev => ({ ...prev, quantity: undefined }));
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
        <DialogHeader>
            <DialogTitle>{viewOnly ? "Détails de l'Opération" : isEditing ? "Modifier l'Opération de Maintenance" : 'Nouvelle Opération de Maintenance'}</DialogTitle>
            <DialogDescription>
                {viewOnly ? "Consultez les détails de cette opération de maintenance." : "Enregistrez une nouvelle maintenance préventive pour un engin."}
            </DialogDescription>
        </DialogHeader>
        <DialogContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="machine">Engin</Label>
                    <Select id="machine" value={machineId} onChange={e => setMachineId(e.target.value)} disabled={isEditing || viewOnly}>
                        {machines.map(m => <option key={m.id} value={m.id}>{formatMachineLabel(m)}</option>)}
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="range">Gamme de maintenance</Label>
                    <Select id="range" value={maintenanceRange} onChange={e => setMaintenanceRange(e.target.value as 'C'|'D'|'E'|'F')} disabled={viewOnly}>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                        <option value="F">F</option>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="date">Date de la maintenance</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} disabled={viewOnly} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="serviceHours">Heures de service</Label>
                    <Input id="serviceHours" type="number" value={serviceHours} onChange={e => setServiceHours(e.target.value)} placeholder="ex: 12500" disabled={viewOnly} />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label>Filtrations utilisées</Label>
                <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                    {filtersUsed.length > 0 ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Référence</TableHead>
                                        <TableHead>Qté</TableHead>
                                        <TableHead>Prix Total</TableHead>
                                        {!viewOnly && <TableHead className="text-right"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtersUsed.map(f => {
                                        const details = getUsedFilterDetails(f);
                                        const lineTotal = details.price * f.quantity;
                                        return (
                                            <TableRow key={f.referenceId}>
                                                <TableCell className="text-xs max-w-[150px] truncate">{details.type}<br/><span className="text-muted-foreground">{details.manufacturer}</span></TableCell>
                                                <TableCell className="font-medium">{details.reference}</TableCell>
                                                <TableCell>{f.quantity}</TableCell>
                                                <TableCell className="font-medium">{lineTotal.toLocaleString()} DA</TableCell>
                                                {!viewOnly && (
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveFilter(f.referenceId)}>
                                                            <TrashIcon className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <div className="mt-4 pt-4 border-t text-right">
                                <span className="text-muted-foreground">Coût total des filtres: </span>
                                <span className="font-bold text-lg">{totalCost.toLocaleString()} DA</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">Aucun filtre ajouté à cette maintenance.</p>
                    )}

                    {!viewOnly && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-sm mb-2">Ajouter un filtre utilisé</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start sm:items-end">
                                <div className="space-y-1">
                                    <Label htmlFor="new-filter-type" className="text-xs">Type de filtre</Label>
                                    <Select id="new-filter-type" value={newFilter.typeId} onChange={e => setNewFilter({...newFilter, typeId: e.target.value})}>
                                        <option value="">Sélectionnez un type</option>
                                        {availableFilterTypesForMachine.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="new-filter-ref" className="text-xs">Référence</Label>
                                    <Select 
                                        id="new-filter-ref" 
                                        value={newFilter.refId} 
                                        onChange={handleRefChange} 
                                        disabled={!newFilter.typeId}
                                        className={addFilterErrors.refId ? 'border-destructive focus:ring-destructive' : ''}
                                    >
                                        <option value="">Sélectionnez une référence</option>
                                        {availableReferencesForType.map(fr => <option key={fr.id} value={fr.id}>{fr.reference} ({fr.manufacturer})</option>)}
                                    </Select>
                                    {addFilterErrors.refId && <p className="text-xs text-destructive mt-1">{addFilterErrors.refId}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="new-filter-qty" className="text-xs">Quantité</Label>
                                    <Input 
                                        id="new-filter-qty" 
                                        type="number" 
                                        min="1" 
                                        value={newFilter.quantity} 
                                        onChange={handleQuantityChange} 
                                        className={addFilterErrors.quantity ? 'border-destructive focus:ring-destructive' : ''}
                                    />
                                    {addFilterErrors.quantity && <p className="text-xs text-destructive mt-1">{addFilterErrors.quantity}</p>}
                                </div>
                            </div>
                            <div className="mt-4">
                                <Button onClick={handleAddFilter} size="sm" disabled={!newFilter.typeId}>
                                    <PlusIcon className="mr-2 h-4 w-4" />
                                    Ajouter
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
        <DialogFooter>
            {viewOnly ? (
                <Button onClick={onClose}>Fermer</Button>
            ) : (
                <>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSave}>{isEditing ? 'Mettre à jour' : 'Enregistrer'}</Button>
                </>
            )}
        </DialogFooter>
    </Dialog>
  );
};

export default MaintenanceModal;