import React, { useState, useEffect } from 'react';
import { FilterType } from '../types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';
import Autocomplete from './ui/Autocomplete';

interface AddFilterTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (filterTypeId: string) => void;
  availableFilterTypes: FilterType[];
}

const AddFilterTypeModal: React.FC<AddFilterTypeModalProps> = ({ isOpen, onClose, onAdd, availableFilterTypes }) => {
  const [selectedFilterType, setSelectedFilterType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFilterType('');
      setError('');
    }
  }, [isOpen]);

  const handleAdd = () => {
    if (!selectedFilterType) {
      setError('Veuillez sélectionner un type de filtre.');
      return;
    }
    onAdd(selectedFilterType);
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
        {availableFilterTypes.length > 0 ? (
          <Autocomplete
            value={selectedFilterType}
            onChange={setSelectedFilterType}
            options={availableFilterTypes.map(ft => ({ value: ft.id, label: ft.name }))}
            placeholder="Rechercher un type de filtre..."
            className="flex-grow"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Tous les types de filtres disponibles ont déjà été ajoutés.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleAdd} disabled={!selectedFilterType || availableFilterTypes.length === 0}>Ajouter</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default AddFilterTypeModal;