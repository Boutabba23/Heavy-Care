import React, { useState } from "react";
import { MaintenanceRecord, Machine, Toast } from "../types";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "./ui/Dialog";
import Button from "./ui/Button";
import { ArrowUpTrayIcon } from "../constants";
import * as XLSX from "xlsx";

interface ImportMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMaintenanceRecords: (records: any[]) => void;
  machines: Machine[];
  addToast: (toast: Omit<Toast, "id">) => void;
}

const ImportMaintenanceModal: React.FC<ImportMaintenanceModalProps> = ({
  isOpen,
  onClose,
  onImportMaintenanceRecords,
  machines,
  addToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n");

    console.log("Full CSV lines:", lines);

    // For this project, data always starts from the 6th row (index 5)
    const headerRowIndex = 4; // 5th row contains headers
    const dataStartIndex = 5; // Data starts at 6th row

    console.log("CSV Header row index:", headerRowIndex);
    console.log("CSV Data start index:", dataStartIndex);

    const headers = lines[headerRowIndex]
      .split(",")
      .map((header) => header.trim().replace(/"/g, ""));

    console.log("CSV Headers:", headers);

    const records = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      if (lines[i].trim() === "") {
        console.log(`Skipping empty CSV line ${i}`);
        continue;
      }

      const values = lines[i]
        .split(",")
        .map((value) => value.trim().replace(/"/g, ""));

      // Skip rows that don't have enough data
      if (values.length < 3) {
        console.log(`Skipping CSV line ${i} with insufficient data:`, values);
        continue;
      }

      const record: any = {};
      let hasData = false;

      headers.forEach((header, index) => {
        if (
          values[index] !== undefined &&
          values[index] !== null &&
          values[index] !== ""
        ) {
          record[header] = values[index] || "";
          hasData = true;
        }
      });

      // Only add records that have actual data
      if (hasData) {
        console.log(`Adding CSV record from line ${i}:`, record);
        records.push(record);
      } else {
        console.log(`Skipping empty CSV record from line ${i}`);
      }
    }

    console.log("Final parsed CSV records:", records);
    return records;
  };

  const parseExcel = (data: ArrayBuffer): any[] => {
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to JSON with headers
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("Full sheet data:", sheetData);

    // For this project, data always starts from the 6th row (index 5)
    const headerRowIndex = 4; // 5th row contains headers
    const dataStartIndex = 5; // Data starts at 6th row

    console.log("Header row index:", headerRowIndex);
    console.log("Data start index:", dataStartIndex);

    // Get the header row
    const headerRow = Array.isArray(sheetData[headerRowIndex])
      ? sheetData[headerRowIndex].map((cell) => String(cell || "").trim())
      : [];

    console.log("Header row data:", headerRow);

    const records = [];

    // Process data rows starting from dataStartIndex
    for (let i = dataStartIndex; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (Array.isArray(row)) {
        const record: any = {};
        let hasData = false;

        headerRow.forEach((header, index) => {
          if (
            header &&
            row[index] !== undefined &&
            row[index] !== null &&
            row[index] !== ""
          ) {
            record[header] = row[index];
            hasData = true;
          }
        });

        // Only add records that have actual data
        if (hasData) {
          console.log(`Adding record from row ${i}:`, record);
          records.push(record);
        } else {
          console.log(`Skipping empty row ${i}`);
        }
      }
    }

    console.log("Final parsed Excel records:", records);
    return records;
  };

  const handleImportClick = async () => {
    if (!file) {
      addToast({
        type: "error",
        title: "Aucun fichier sélectionné",
        description: "Veuillez sélectionner un fichier à importer.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      let rawRecords: any[] = [];

      if (fileExtension === "csv") {
        const text = await file.text();
        rawRecords = parseCSV(text);
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        rawRecords = parseExcel(arrayBuffer);
      } else {
        throw new Error("Format de fichier non supporté");
      }

      processImportedRecords(rawRecords);
    } catch (error: any) {
      console.error("Error importing file:", error);
      addToast({
        type: "error",
        title: "Erreur d'importation",
        description: `Échec de l'importation: ${error.message}`,
      });
      setIsProcessing(false);
    }
  };

  const processImportedRecords = (rawRecords: any[]) => {
    try {
      console.log("Raw records from file:", rawRecords);

      // Early exit if no records
      if (!rawRecords || rawRecords.length === 0) {
        console.log("No records to process");
        addToast({
          type: "warning",
          title: "Aucun enregistrement",
          description: "Aucun enregistrement trouvé dans le fichier.",
        });
        setIsProcessing(false);
        return;
      }

      // Field mapping for maintenance data - expanded to include more variations
      const fieldMapping: { [key: string]: string } = {
        // Gamme mappings
        "Gamme éxecutée": "maintenanceRange",
        "Gamme executée": "maintenanceRange",
        Gamme: "maintenanceRange",
        "Gamme ": "maintenanceRange",
        Maintenance: "maintenanceRange",
        gamme: "maintenanceRange",
        GAMME: "maintenanceRange",

        // Date mappings
        "Date De Gamme": "date",
        "Date De Gamme ": "date",
        Date: "date",
        date: "date",
        DATE: "date",
        "Date de la maintenance": "date",

        // Service hours mappings
        "Heurs De Gamme": "serviceHours",
        "Heur De Gamme": "serviceHours",
        "Heures De Gamme": "serviceHours",
        "Heures de Service": "serviceHours",
        "Heures Service": "serviceHours",
        "Service Hours": "serviceHours",
        Hours: "serviceHours",
        "Volu compteur": "serviceHours",
        "heurs de gamme": "serviceHours",
        "HEURS DE GAMME": "serviceHours",

        // Machine designation mappings
        DESIGNATION: "machineDesignation",
        Designation: "machineDesignation",
        Désignation: "machineDesignation",
        designation: "machineDesignation",
        Engin: "machineDesignation",
        engin: "machineDesignation",
        ENGİN: "machineDesignation",
        "Code Engin": "machineDesignation",
        Code: "machineDesignation",
      };

      // Process the records to match our expected format
      const processedRecords = rawRecords.map((record, index) => {
        console.log(`Processing row ${index}:`, record);
        // First record explanation:
        // 1. The parseExcel/parseCSV functions read data starting from the 6th row (index 5)
        // 2. The first data row (6th row in Excel) becomes the first element in rawRecords array
        // 3. This first element (index 0) is processed here as the first record

        // Normalize field names using the mapping
        const normalizedRecord: any = {};
        Object.keys(record).forEach((key) => {
          // Trim the key to handle extra spaces
          const trimmedKey = String(key || "").trim();
          const normalizedKey = fieldMapping[trimmedKey] || trimmedKey;
          normalizedRecord[normalizedKey] = record[key];
        });

        console.log("Normalized record:", normalizedRecord);

        // Find the machine by matching the machineDesignation with machine designation or code
        let machineId = null;
        let machineDesignation = "";

        // Try different possible field names for machine designation
        const designationValue =
          normalizedRecord.machineDesignation ||
          normalizedRecord.Engin ||
          normalizedRecord.engin ||
          normalizedRecord.Code ||
          normalizedRecord["Code Engin"] ||
          "";

        console.log("Looking for machine with designation:", designationValue);
        console.log("Available machines:", machines);

        if (designationValue) {
          // Try to match with existing machines by designation or code
          const machine = machines.find(
            (m) =>
              m.designation
                .toLowerCase()
                .includes(String(designationValue).toLowerCase()) ||
              m.designation.toLowerCase() ===
                String(designationValue).toLowerCase() ||
              m.code
                .toLowerCase()
                .includes(String(designationValue).toLowerCase()) ||
              m.code.toLowerCase() === String(designationValue).toLowerCase()
          );

          if (machine) {
            machineId = machine.id;
            machineDesignation = machine.designation;
            console.log("Found matching machine:", machine);
          } else {
            machineDesignation = String(designationValue);
            console.log("No matching machine found");
          }
        }

        // Parse date - try different formats
        let date = "";
        // Try different possible field names for date
        const dateValue =
          normalizedRecord.date || normalizedRecord["Date De Gamme"] || "";

        if (dateValue) {
          // Handle different date formats
          if (typeof dateValue === "string") {
            if (dateValue.includes("/")) {
              const parts = dateValue.split("/");
              if (parts.length === 3) {
                // Assuming DD/MM/YYYY format, convert to YYYY-MM-DD
                date = `${parts[2]}-${parts[1].padStart(
                  2,
                  "0"
                )}-${parts[0].padStart(2, "0")}`;
              }
            } else if (dateValue.includes("-")) {
              const parts = dateValue.split("-");
              if (parts.length === 3) {
                // Assuming YYYY-MM-DD format
                date = dateValue;
              }
            } else {
              // Try to parse as a date
              const parsedDate = new Date(dateValue);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate.toISOString().split("T")[0];
              }
            }
          } else if (typeof dateValue === "number") {
            // Handle Excel date numbers
            const dateObj = new Date((dateValue - 25569) * 86400 * 1000);
            if (!isNaN(dateObj.getTime())) {
              date = dateObj.toISOString().split("T")[0];
            }
          }
        }

        // If date is still empty, use current date
        if (!date) {
          date = new Date().toISOString().split("T")[0];
        }

        // Get service hours
        // Try different possible field names for service hours
        const serviceHoursValue =
          normalizedRecord.serviceHours ||
          normalizedRecord["Heurs De Gamme"] ||
          normalizedRecord["Heur De Gamme"] ||
          normalizedRecord["Heures De Gamme"] ||
          "0";

        let serviceHours = 0;
        if (typeof serviceHoursValue === "string") {
          // Handle French number format (comma as decimal separator)
          const normalizedServiceHours = String(serviceHoursValue).replace(
            ",",
            "."
          );
          serviceHours = parseInt(normalizedServiceHours, 10) || 0;
        } else if (typeof serviceHoursValue === "number") {
          serviceHours = serviceHoursValue;
        } else {
          serviceHours = parseInt(String(serviceHoursValue), 10) || 0;
        }

        // Get maintenance range
        // Try different possible field names for maintenance range
        let maintenanceRange =
          normalizedRecord.maintenanceRange ||
          normalizedRecord.Gamme ||
          normalizedRecord.gamme ||
          "C";

        // Extract range letter from gamme text if it's not already a single letter
        if (maintenanceRange && String(maintenanceRange).length > 1) {
          const rangeMatch = String(maintenanceRange).match(/[CDEF]/i);
          if (rangeMatch) {
            maintenanceRange = rangeMatch[0].toUpperCase();
          } else {
            maintenanceRange = "C"; // Default to C if no valid range found
          }
        } else if (maintenanceRange) {
          maintenanceRange = String(maintenanceRange).toUpperCase();
        } else {
          maintenanceRange = "C";
        }

        const result = {
          machineId: machineId || undefined,
          machineDesignation: machineDesignation,
          date: date,
          serviceHours: serviceHours,
          maintenanceRange: maintenanceRange,
          filtersUsed: [],
        };

        console.log("Processed record:", result);
        return result;
      });

      // Filter out records with invalid data or empty records
      const validRecords = processedRecords.filter((record, index, self) => {
        // Explicitly check if this is a header row and exclude it
        const recordKeys = Object.keys(record);
        const isHeaderRow =
          recordKeys.some(
            (key) =>
              String(key).includes("Date De Gamme") ||
              String(key).includes("Gamme") ||
              String(key).includes("Heur")
          ) &&
          recordKeys.some((key) => {
            const value = record[key as keyof typeof record];
            return (
              typeof value === "string" &&
              (String(value).includes("Date De Gamme") ||
                String(value).includes("Gamme") ||
                String(value).includes("Heur"))
            );
          });

        if (isHeaderRow) {
          console.log("Skipping header row:", record);
          return false;
        }

        // Check if this is a record with "Inconnu" machine designation and exclude it
        if (
          record.machineDesignation &&
          String(record.machineDesignation).toLowerCase().includes("inconnu")
        ) {
          console.log(
            "Skipping record with 'Inconnu' machine designation:",
            record
          );
          return false;
        }

        // Check if the record has meaningful data
        const hasDate = record.date && record.date !== "Invalid Date";
        const hasServiceHours =
          record.serviceHours !== undefined && record.serviceHours >= 0;
        const hasMaintenanceRange =
          record.maintenanceRange && record.maintenanceRange.length === 1;

        // Check if this is a duplicate record
        const isDuplicate =
          self.findIndex(
            (r, i) =>
              i < index &&
              r.date === record.date &&
              r.serviceHours === record.serviceHours &&
              r.maintenanceRange === record.maintenanceRange &&
              r.machineDesignation === record.machineDesignation
          ) !== -1;

        // At minimum, we need a date and either a machine designation or service hours
        const hasRequiredData =
          hasDate && (record.machineDesignation || hasServiceHours);

        // Check if this looks like a valid data row (not a header or empty row)
        const looksLikeValidData = Object.keys(record).length > 3; // Increased threshold

        const isValid = hasRequiredData && !isDuplicate && looksLikeValidData;
        console.log(`Record validation:`, {
          hasDate,
          hasServiceHours,
          hasMaintenanceRange,
          isDuplicate,
          hasRequiredData,
          looksLikeValidData,
          isValid,
        });

        return isValid;
      });

      console.log("Valid records to import:", validRecords);

      if (validRecords.length === 0) {
        addToast({
          type: "warning",
          title: "Aucun enregistrement valide",
          description: "Aucun enregistrement valide trouvé dans le fichier.",
        });
        setIsProcessing(false);
        return;
      }

      // Import the records
      onImportMaintenanceRecords(validRecords);

      addToast({
        type: "success",
        title: "Importation réussie",
        description: `${validRecords.length} enregistrement(s) de maintenance ont été importés avec succès.`,
      });

      // Close the modal
      setIsProcessing(false);
      handleClose();
    } catch (error: any) {
      console.error("Error processing records:", error);
      addToast({
        type: "error",
        title: "Erreur de traitement",
        description: `Échec du traitement des enregistrements: ${error.message}`,
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des enregistrements de maintenance</DialogTitle>
          <DialogDescription>
            Téléchargez un fichier Excel ou CSV pour importer des
            enregistrements de maintenance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 bg-muted/20">
            <ArrowUpTrayIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {file ? file.name : "Glissez-déposez votre fichier ici"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Formats supportés: .xlsx, .xls, .csv
            </p>
            <label className="cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Parcourir les fichiers
              </span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">Format attendu :</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Date De Gamme (format: YYYY-MM-DD, DD/MM/YYYY, ou date Excel)
              </li>
              <li>Heurs De Gamme (nombre entier)</li>
              <li>Gamme (C, D, E, ou F)</li>
              <li>
                Engin (correspondant à un engin existant par désignation ou
                code)
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button onClick={handleImportClick} disabled={isProcessing || !file}>
            {isProcessing ? "Traitement en cours..." : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportMaintenanceModal;
