import React, { useState, useEffect } from "react";
import { Machine } from "../types";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "./ui/Dialog";
import Button from "./ui/Button";
import Label from "./ui/Label";

// Create a custom Input component with validation
interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | null;
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          ref={ref}
          className={`flex h-10 w-full rounded-lg border ${
            error ? "border-destructive" : "border-input"
          } bg-secondary px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            className || ""
          }`}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
ValidatedInput.displayName = "ValidatedInput";

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (machine: {
    code: string;
    designation: string;
    marque: string;
    type: string;
    serialNumber?: string;
    registrationNumber?: string;
    serviceHours: number;
  }) => void;
  machine: Machine | null;
}

const MachineModal: React.FC<MachineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  machine,
}) => {
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [marque, setMarque] = useState("");
  const [type, setType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [serviceHours, setServiceHours] = useState("");

  // Individual field error states
  const [codeError, setCodeError] = useState<string | null>(null);
  const [designationError, setDesignationError] = useState<string | null>(null);
  const [marqueError, setMarqueError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [serviceHoursError, setServiceHoursError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (machine) {
      setCode(machine.code);
      setDesignation(machine.designation);
      setMarque(machine.marque);
      setType(machine.type);
      setSerialNumber(machine.serialNumber || "");
      setRegistrationNumber(machine.registrationNumber || "");
      setServiceHours(String(machine.serviceHours));
    } else {
      setCode("");
      setDesignation("");
      setMarque("");
      setType("");
      setSerialNumber("");
      setRegistrationNumber("");
      setServiceHours("");
    }

    // Clear all errors when modal opens
    setCodeError(null);
    setDesignationError(null);
    setMarqueError(null);
    setTypeError(null);
    setServiceHoursError(null);
  }, [machine, isOpen]);

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case "code":
        return !value.trim() ? "Le code est requis." : null;
      case "designation":
        return !value.trim() ? "La désignation est requise." : null;
      case "marque":
        return !value.trim() ? "La marque est requise." : null;
      case "type":
        return !value.trim() ? "Le type est requis." : null;
      case "serviceHours":
        if (!value.trim()) return "Les heures de service sont requises.";
        const hours = parseInt(value, 10);
        if (isNaN(hours) || hours < 0) {
          return "Les heures de service doivent être un nombre positif.";
        }
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (
    field: string,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);

    // Clear error when user starts typing
    if (value.trim()) {
      switch (field) {
        case "code":
          setCodeError(null);
          break;
        case "designation":
          setDesignationError(null);
          break;
        case "marque":
          setMarqueError(null);
          break;
        case "type":
          setTypeError(null);
          break;
        case "serviceHours":
          setServiceHoursError(null);
          break;
      }
    }
  };

  const handleSave = () => {
    // Validate all required fields
    const codeErr = validateField("code", code);
    const designationErr = validateField("designation", designation);
    const marqueErr = validateField("marque", marque);
    const typeErr = validateField("type", type);
    const serviceHoursErr = validateField("serviceHours", serviceHours);

    setCodeError(codeErr);
    setDesignationError(designationErr);
    setMarqueError(marqueErr);
    setTypeError(typeErr);
    setServiceHoursError(serviceHoursErr);

    // If any field has an error, don't submit
    if (codeErr || designationErr || marqueErr || typeErr || serviceHoursErr) {
      return;
    }

    const hours = parseInt(serviceHours, 10);
    onSave({
      code,
      designation,
      marque,
      type,
      serialNumber: serialNumber || undefined,
      registrationNumber: registrationNumber || undefined,
      serviceHours: hours,
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          {machine ? "Modifier l'engin" : "Nouvel Engin"}
        </DialogTitle>
        <DialogDescription>
          Remplissez les informations de l'engin ci-dessous.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <ValidatedInput
            id="code"
            value={code}
            onChange={(e) => handleFieldChange("code", e.target.value, setCode)}
            placeholder="ex: CAT320D"
            error={codeError}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Désignation</Label>
          <ValidatedInput
            id="designation"
            value={designation}
            onChange={(e) =>
              handleFieldChange("designation", e.target.value, setDesignation)
            }
            placeholder="ex: Pelle sur chenilles 320D"
            error={designationError}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marque">Marque</Label>
          <ValidatedInput
            id="marque"
            value={marque}
            onChange={(e) =>
              handleFieldChange("marque", e.target.value, setMarque)
            }
            placeholder="ex: Caterpillar"
            error={marqueError}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <ValidatedInput
            id="type"
            value={type}
            onChange={(e) => handleFieldChange("type", e.target.value, setType)}
            placeholder="ex: 320D"
            error={typeError}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Numéro de Série</Label>
          <ValidatedInput
            id="serialNumber"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="ex: CAT0320DLHDN02345"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registrationNumber">Immatriculation</Label>
          <ValidatedInput
            id="registrationNumber"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            placeholder="ex: 12345 XYZ 67"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serviceHours">Heures de service</Label>
          <ValidatedInput
            id="serviceHours"
            type="number"
            value={serviceHours}
            onChange={(e) =>
              handleFieldChange("serviceHours", e.target.value, setServiceHours)
            }
            placeholder="ex: 12500"
            error={serviceHoursError}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={handleSave}>Enregistrer</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default MachineModal;
