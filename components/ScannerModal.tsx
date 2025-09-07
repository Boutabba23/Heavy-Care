
import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from './ui/Dialog';
import Button from './ui/Button';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (filterGroupId: string) => void;
}

const qrcodeRegionId = "html5qr-code-full-region";

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      const scanner = new Html5Qrcode(qrcodeRegionId);
      scannerRef.current = scanner;

      const qrCodeSuccessCallback = (decodedText: string) => {
        // Check if the scanner is still active before processing
        if (scannerRef.current) {
          try {
            const url = new URL(decodedText);
            const filterGroupId = url.searchParams.get('filterGroupId');
            if (filterGroupId) {
              onScan(filterGroupId);
            } else {
              setError("QR code non valide : filterGroupId manquant.");
            }
          } catch (err) {
            setError("QR code invalide. Le format n'est pas une URL valide.");
          }
        }
      };

      const qrCodeErrorCallback = (errorMessage: string) => {
        // This callback is called frequently, ignore "QR code not found" which is expected.
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      const startScanner = async () => {
        try {
          // First, explicitly get cameras to trigger permissions and check availability.
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras || cameras.length === 0) {
            setError("Aucune caméra trouvée sur cet appareil. Veuillez vérifier les permissions de votre navigateur.");
            return;
          }
          
          // Try to start with the rear camera.
          await scanner.start(
            { facingMode: 'environment' },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } catch (err) {
          console.warn("Démarrage avec la caméra arrière échoué, essai avec la caméra avant.", err);
          // If environment camera fails, try the user (front) camera.
          try {
             if (scannerRef.current) {
                await scannerRef.current.start(
                    { facingMode: 'user' },
                    config,
                    qrCodeSuccessCallback,
                    qrCodeErrorCallback
                );
             }
          } catch (err2) {
            console.error("Échec du démarrage de toutes les caméras.", err2);
            setError("Impossible de démarrer la caméra. Assurez-vous d'avoir accordé les autorisations nécessaires.");
          }
        }
      };

      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Échec de l'arrêt du scanner lors du nettoyage.", err));
      }
      scannerRef.current = null;
    };
  }, [isOpen, onScan]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Scanner un QR Code</DialogTitle>
        <DialogDescription>
          Pointez la caméra vers le QR code du groupe de filtres pour y accéder directement.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <div id={qrcodeRegionId} className="w-full h-80 border rounded-md bg-muted overflow-hidden" />
        {error && <p className="text-sm text-destructive mt-4 text-center">{error}</p>}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fermer</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default ScannerModal;
