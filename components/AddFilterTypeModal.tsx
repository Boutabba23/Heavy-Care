
import React, { useState, useEffect } from 'react';
import { FilterType } from '../types';
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

interface AddFilterTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (filterTypeId: string, customLabel?: string) => void;
  availableFilterTypes: FilterType[];
}

const AddFilterTypeModal: React.FC<AddFilterTypeModalProps> = ({ isOpen, onClose, onAdd, availableFilterTypes }) => {
  const [selectedFilterType, setSelectedFilterType] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [filterTypeError, setFilterTypeError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFilterType('');
      setCustomLabel('');
      setFilterTypeError(null);
    }
  }, [isOpen]);

  const handleAdd = () => {
    let hasError = false;
    if (!selectedFilterType) {
      setFilterTypeError('Le type de filtre est requis.');
      hasError = true;
    } else {
      setFilterTypeError(null);
    }
    if (hasError) return;
    onAdd(selectedFilterType, customLabel.trim() ? customLabel.trim() : undefined);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Ajouter un type de filtre</DialogTitle>
        <DialogDescription>
          Sélectionnez un type de filtre à ajouter à cet engin.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
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
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleAdd} disabled={!selectedFilterType || availableFilterTypes.length === 0}>Ajouter</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default AddFilterTypeModal;