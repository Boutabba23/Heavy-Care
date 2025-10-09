

import React, { useState, useEffect } from 'react';
import { FilterType, FilterGroup } from '../types';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from './ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import Label from './ui/Label';
import Select from './ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/Table';

interface AddFilterTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (filterTypes: { filterTypeId: string; customLabel?: string; filterGroupId: string | null }[]) => void;
  availableFilterTypes: FilterType[];
  filterGroups: FilterGroup[];
}

const AddFilterTypeModal: React.FC<AddFilterTypeModalProps> = ({ isOpen, onClose, onAdd, availableFilterTypes, filterGroups }) => {
  const [selectedFilterType, setSelectedFilterType] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [selectedFilterGroup, setSelectedFilterGroup] = useState('');
  const [filterTypeError, setFilterTypeError] = useState<string | null>(null);
  const [filterGroupError, setFilterGroupError] = useState<string | null>(null);
  const [pendingFilters, setPendingFilters] = useState<{ filterTypeId: string; customLabel?: string; filterGroupId: string | null }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedFilterType('');
      setCustomLabel('');
      setSelectedFilterGroup('');
      setFilterTypeError(null);
      setFilterGroupError(null);
      setPendingFilters([]);
    }
  }, [isOpen]);

  const handleAddToTable = () => {
    let hasError = false;
    if (!selectedFilterType) {
      setFilterTypeError('Le type de filtre est requis.');
      hasError = true;
    } else {
      setFilterTypeError(null);
    }
    if (!selectedFilterGroup) {
      setFilterGroupError('Le groupe de filtres est requis.');
      hasError = true;
    } else {
      setFilterGroupError(null);
    }
    if (hasError) return;
    setPendingFilters(prev => [
      ...prev,
      {
        filterTypeId: selectedFilterType,
        customLabel: customLabel.trim() ? customLabel.trim() : undefined,
        filterGroupId: selectedFilterGroup
      }
    ]);
    setSelectedFilterType('');
    setCustomLabel('');
    setSelectedFilterGroup('');
  };

  const handleRemove = (idx: number) => {
    setPendingFilters(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = () => {
    if (pendingFilters.length === 0) return;
    onAdd(pendingFilters);
    onClose();
  };

  // Only show filter groups matching the selected filter type
  const filterGroupOptions = selectedFilterType
    ? filterGroups.filter(g => g.filterType === selectedFilterType)
    : [];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <DialogTitle>Ajouter des types de filtre</DialogTitle>
        <DialogDescription>
          Ajoutez plusieurs types de filtre et assignez un groupe à chacun avant de confirmer.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="filterType">Type de filtre</Label>
            <Select
              id="filterType"
              value={selectedFilterType}
              onChange={e => setSelectedFilterType(e.target.value)}
              className={filterTypeError ? 'border-destructive focus:ring-destructive' : ''}
            >
              <option value="">Sélectionnez un type de filtre</option>
              {availableFilterTypes.map(ft => (
                <option key={ft.id} value={ft.id}>{ft.name}</option>
              ))}
            </Select>
            {filterTypeError && (
              <p className="text-xs text-destructive mt-1">{filterTypeError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customLabel">Libellé personnalisé (optionnel)</Label>
            <Input
              id="customLabel"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="ex: Filtre hydraulique principal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterGroup">Groupe de filtres</Label>
            <Select
              id="filterGroup"
              value={selectedFilterGroup}
              onChange={e => setSelectedFilterGroup(e.target.value)}
              className={filterGroupError ? 'border-destructive focus:ring-destructive' : ''}
              disabled={!selectedFilterType}
            >
              <option value="">Sélectionnez un groupe</option>
              {filterGroupOptions.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            {filterGroupError && (
              <p className="text-xs text-destructive mt-1">{filterGroupError}</p>
            )}
          </div>
        </div>
        <div>
          <Button onClick={handleAddToTable} disabled={!selectedFilterType || !selectedFilterGroup}>
            Ajouter à la liste
          </Button>
        </div>
        {pendingFilters.length > 0 && (
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type de filtre</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Groupe assigné</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingFilters.map((item, idx) => {
                  const type = availableFilterTypes.find(ft => ft.id === item.filterTypeId);
                  const group = filterGroups.find(g => g.id === item.filterGroupId);
                  return (
                    <TableRow key={idx}>
                      <TableCell>{type?.name || ''}</TableCell>
                      <TableCell>{item.customLabel || '-'}</TableCell>
                      <TableCell>{group?.name || ''}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)}>
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleConfirm} disabled={pendingFilters.length === 0}>Ajouter</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default AddFilterTypeModal;