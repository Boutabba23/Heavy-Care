import React, { useState, useEffect } from 'react';
import { StockUpdateInfo } from '../types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import Label from './ui/Label';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (quantity: number) => void;
  stockInfo: StockUpdateInfo | null;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onAdd, stockInfo }) => {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setError('');
    }
  }, [isOpen]);

  const handleAdd = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Veuillez entrer une quantité valide et positive.');
      return;
    }
    onAdd(qty);
  };

  if (!stockInfo) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Ajouter du Stock</DialogTitle>
        <DialogDescription>
          Ajouter une nouvelle entrée de stock pour <span className="font-bold text-primary">{stockInfo.filterReference.reference}</span>.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
            <div>
                <p className="font-semibold">{stockInfo.filterReference.reference}</p>
                <p className="text-sm text-muted-foreground">{stockInfo.filterReference.manufacturer}</p>
            </div>
            <div>
                 <p className="text-sm text-muted-foreground">Stock Actuel</p>
                 <p className="font-bold text-lg text-right">{stockInfo.filterReference.stock}</p>
            </div>
        </div>
        <div className="space-y-2 pt-4">
          <Label htmlFor="quantity">Quantité à ajouter</Label>
          <Input 
            id="quantity" 
            type="number" 
            value={quantity} 
            onChange={(e) => setQuantity(e.target.value)} 
            placeholder="ex: 10" 
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={handleAdd}>Ajouter au Stock</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default AddStockModal;