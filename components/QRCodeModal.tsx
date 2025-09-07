
import React, { useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 256, margin: 2 }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [isOpen, url]);
  
  const handlePrint = () => {
      if (printRef.current) {
          const dialogContent = printRef.current.parentElement;
          if (dialogContent) {
              dialogContent.classList.add('print-area');
              window.print();
              dialogContent.classList.remove('print-area');
          }
      }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
        <div ref={printRef}>
            <DialogHeader className="text-center">
                <DialogTitle>QR Code pour {title}</DialogTitle>
            </DialogHeader>
            <DialogContent className="flex flex-col items-center justify-center">
                <canvas ref={canvasRef} className="rounded-lg border"></canvas>
                <p className="mt-4 text-xs text-muted-foreground break-all">{url}</p>
                <p className="mt-4 text-sm text-center">Scannez ce code avec votre téléphone pour accéder directement à la page de cet élément.</p>
            </DialogContent>
        </div>
        <DialogFooter className="no-print">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button onClick={handlePrint}>Imprimer</Button>
        </DialogFooter>
    </Dialog>
  );
};

export default QRCodeModal;
