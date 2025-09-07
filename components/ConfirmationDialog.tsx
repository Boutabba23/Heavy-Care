
import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button variant="destructive" onClick={onConfirm}>Confirmer</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default ConfirmationDialog;