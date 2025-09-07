import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
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
import { ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon } from "../constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/Table";

type ParsedMachine = Omit<Machine, "id" | "assignedFilters">;
type ValidatedMachineRow = ParsedMachine & { _error?: string };

// Define type for maintenance records
type ParsedMaintenanceRecord = {
  gamme: string;
  maintenanceRange: "C" | "D" | "E" | "F";
  serviceHours: number;
  date: string;
  machineDesignation?: string; // Add machine designation to link maintenance to machine
  _error?: string;
};

type ValidatedRow = ValidatedMachineRow | ParsedMaintenanceRecord;

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMachines: (machines: ParsedMachine[]) => void;
  onImportMaintenanceRecords?: (records: ParsedMaintenanceRecord[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportMachines,
  onImportMaintenanceRecords,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [importType, setImportType] = useState<
    "machines" | "maintenance" | "mixed" | null
  >(null);

  const resetState = () => {
    setFile(null);
    setValidatedRows([]);
    setIsProcessing(false);
    setImportType(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const detectImportType = (
    headers: string[]
  ): "machines" | "maintenance" | "mixed" | null => {
    // Check if it's a machine import (looks for machine-related fields)
    const machineFields = [
      "code",
      "designation",
      "marque",
      "type",
      "servicehours",
    ];
    const hasMachineFields = headers.some((header) =>
      machineFields.some(
        (field) =>
          header &&
          typeof header === "string" &&
          header.toLowerCase().includes(field)
      )
    );

    // Check if it's a maintenance import (looks for maintenance-related fields)
    const maintenanceFields = [
      "gamme",
      "date",
      "heures",
      "maintenance",
      "de gamme",
    ];
    const hasMaintenanceFields = headers.some((header) =>
      maintenanceFields.some(
        (field) =>
          header &&
          typeof header === "string" &&
          header.toLowerCase().includes(field)
      )
    );

    // Check for your specific Excel format indicators
    const hasYourSpecificHeaders = headers.some(
      (header) =>
        header &&
        typeof header === "string" &&
        (header.toLowerCase().includes("planning") ||
          header.toLowerCase().includes("suivi") ||
          header.toLowerCase().includes("entretien") ||
          header.toLowerCase().includes("moteur") ||
          header.toLowerCase().includes("gamme") ||
          header.toLowerCase().includes("heures") ||
          header.toLowerCase().includes("de gamme"))
    );

    // If we have your specific headers, it's likely mixed content
    if (hasYourSpecificHeaders) {
      return "mixed"; // Your complex Excel file with mixed content
    }

    if (hasMaintenanceFields && !hasMachineFields) return "maintenance";
    if (hasMachineFields && !hasMaintenanceFields) return "machines";
    if (hasMachineFields && hasMaintenanceFields) return "mixed";
    return "machines"; // Default to machines if uncertain
  };

  const validateMachineRow = (row: any): ValidatedMachineRow => {
    // Enhanced mapping for your specific Excel format
    const fieldMapping: Record<string, string> = {
      // Code mappings
      code: "code",
      Code: "code",
      CODE: "code",
      "N°": "code",
      "N° engin": "code",
      Numéro: "code",
      Numero: "code",
      "N° : ER.630.86.R0": "code", // Your specific column name

      // Designation mappings
      designation: "designation",
      Designation: "designation",
      DESIGNATION: "designation",
      Désignation: "designation",
      Description: "designation",
      "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur":
        "designation", // Your specific column name

      // Marque mappings
      marque: "marque",
      Marque: "marque",
      MARQUE: "marque",
      Brand: "marque",
      "Marque / Modèle": "marque",

      // Type mappings
      type: "type",
      Type: "type",
      TYPE: "type", // Your specific column value
      Modèle: "type",
      Model: "type",

      // Service hours mappings
      serviceHours: "serviceHours",
      ServiceHours: "serviceHours",
      Heures: "serviceHours",
      "Heures de service": "serviceHours",
      "Heures Service": "serviceHours",
      "Service Hours": "serviceHours",
      Hours: "serviceHours",
      "Dernier Relevé": "serviceHours",
      "Volu compteur": "serviceHours", // Your specific column value
      "250 H": "serviceHours", // Your specific column value
      "500 H": "serviceHours", // Your specific column value
      "1000 H": "serviceHours", // Your specific column value
      "2000 H": "serviceHours", // Your specific column value
      "4000 H": "serviceHours", // Your specific column value
    };

    // Create a normalized row with proper field names
    const normalizedRow: any = {};

    // Map the fields based on the fieldMapping
    Object.keys(row).forEach((key) => {
      const normalizedKey = fieldMapping[key] || key;
      normalizedRow[normalizedKey] = row[key];
    });

    // Skip rows that are clearly not machine data
    // Check for pagination rows or other non-data rows
    if (
      normalizedRow.code &&
      (normalizedRow.code.toString().toLowerCase().includes("page") ||
        normalizedRow.code.toString().toLowerCase().includes("sur"))
    ) {
      return { ...normalizedRow, _error: "Ligne de pagination ignorée" };
    }

    // Special handling for your Excel format
    // If we have a designation that looks like a machine type, use it as the type
    if (normalizedRow.designation && !normalizedRow.type) {
      const typeIndicators = [
        "D8R",
        "HL 770",
        "422 F",
        "160K",
        "3625HT",
        "AD 410T42",
        "KERAX",
        "HD9",
        "NEW RANGER",
        "W460",
        "K66",
        "200 KVA",
        "140 KVA",
        "M70",
        "Volvo",
        "Caterpillar",
        "Komatsu",
      ];
      if (
        typeof normalizedRow.designation === "string" &&
        typeIndicators.some((indicator) =>
          normalizedRow.designation.includes(indicator)
        )
      ) {
        normalizedRow.type = normalizedRow.designation;
        normalizedRow.designation = "Machine"; // Default designation
      }
    }

    // Try to extract code from the designation or other fields if missing
    if (
      !normalizedRow.code ||
      (typeof normalizedRow.code === "string" &&
        normalizedRow.code.toString().trim() === "")
    ) {
      // Try to find a code-like value in other fields
      const possibleCodeFields = ["designation", "type"];
      for (const field of possibleCodeFields) {
        if (normalizedRow[field] && typeof normalizedRow[field] === "string") {
          // Look for patterns like "CAT001", "KOM002", etc.
          const codeMatch = normalizedRow[field].match(/[A-Z]{2,}[0-9]{2,}/);
          if (codeMatch) {
            normalizedRow.code = codeMatch[0];
            break;
          }
        }
      }

      // If still no code, and we have a numeric value in code field, use it
      if (
        !normalizedRow.code &&
        normalizedRow.code !== undefined &&
        typeof normalizedRow.code === "number"
      ) {
        normalizedRow.code = normalizedRow.code.toString();
      }

      // Special handling for your format - try to extract code from the "N° : ER.630.86.R0" field
      if (!normalizedRow.code && row["N° : ER.630.86.R0"]) {
        normalizedRow.code = row["N° : ER.630.86.R0"].toString().trim();
      }
    }

    // Try to extract service hours from the designation or other fields if missing
    if (
      (!normalizedRow.serviceHours ||
        (typeof normalizedRow.serviceHours === "string" &&
          normalizedRow.serviceHours.toString().trim() === "")) &&
      normalizedRow.designation
    ) {
      // Look for numeric values in the designation
      if (typeof normalizedRow.designation === "string") {
        const hoursMatch = normalizedRow.designation.toString().match(/\d+/);
        if (hoursMatch) {
          normalizedRow.serviceHours = parseInt(hoursMatch[0], 10);
        }
      }
    }

    // Skip rows that are maintenance interval headers
    const maintenanceHeaders = [
      "250 H",
      "500 H",
      "1000 H",
      "2000 H",
      "4000 H",
      "Volu compteur",
    ];
    if (
      normalizedRow.designation &&
      maintenanceHeaders.includes(normalizedRow.designation.toString().trim())
    ) {
      return {
        ...normalizedRow,
        _error: "Ligne d'intervalle de maintenance ignorée",
      };
    }

    // Skip empty rows
    const rowValues = Object.values(normalizedRow).filter(
      (val) => val !== null && val !== undefined && val !== ""
    );
    if (rowValues.length === 0) {
      return { ...normalizedRow, _error: "Ligne vide ignorée" };
    }

    // Skip header rows
    const headerIndicators = [
      "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur",
      "TYPE",
      "N° : ER.630.86.R0",
    ];
    if (
      headerIndicators.some(
        (indicator) =>
          normalizedRow.designation &&
          normalizedRow.designation.toString().includes(indicator)
      )
    ) {
      return { ...normalizedRow, _error: "Ligne d'en-tête ignorée" };
    }

    const requiredFields = [
      "code",
      "designation",
      "marque",
      "type",
      "serviceHours",
    ];

    // Enhanced validation with better error messages
    for (const field of requiredFields) {
      if (!normalizedRow[field]) {
        // Special handling for code field - try to generate one
        if (field === "code") {
          // Try to create a code from type and a number
          if (normalizedRow.type) {
            normalizedRow.code =
              normalizedRow.type
                .toString()
                .replace(/\s+/g, "")
                .substring(0, 10) + Math.floor(Math.random() * 1000);
            continue;
          } else {
            return {
              ...normalizedRow,
              _error: `Champ requis manquant : ${field}`,
            };
          }
        }

        // Special handling for marque field - use default if missing
        if (field === "marque") {
          normalizedRow.marque = "Non spécifiée";
          continue;
        }

        // Special handling for designation field - use default if missing
        if (field === "designation") {
          normalizedRow.designation = "Machine";
          continue;
        }

        // Special handling for type field - use default if missing
        if (field === "type") {
          normalizedRow.type = "Non spécifié";
          continue;
        }

        return { ...normalizedRow, _error: `Champ requis manquant : ${field}` };
      }

      // Additional validation for service hours
      if (field === "serviceHours") {
        let serviceHours: number;
        if (typeof normalizedRow.serviceHours === "string") {
          serviceHours = Number(normalizedRow.serviceHours);
        } else if (typeof normalizedRow.serviceHours === "number") {
          serviceHours = normalizedRow.serviceHours;
        } else {
          serviceHours = 0;
        }

        if (isNaN(serviceHours) || serviceHours < 0) {
          return {
            ...normalizedRow,
            _error: `Heures de service invalides : ${normalizedRow.serviceHours}`,
          };
        }
        normalizedRow.serviceHours = serviceHours;
      }
    }

    // Ensure serviceHours is a number
    let serviceHours: number;
    if (typeof normalizedRow.serviceHours === "string") {
      serviceHours = Number(normalizedRow.serviceHours);
    } else if (typeof normalizedRow.serviceHours === "number") {
      serviceHours = normalizedRow.serviceHours;
    } else {
      serviceHours = 0; // Default value
    }

    if (isNaN(serviceHours) || serviceHours < 0) {
      return {
        ...normalizedRow,
        _error: `Heures de service invalides : ${normalizedRow.serviceHours}`,
      };
    }

    // Ensure code is a string before calling trim()
    let code: string;
    if (typeof normalizedRow.code === "string") {
      code = normalizedRow.code.trim();
    } else {
      code = normalizedRow.code ? normalizedRow.code.toString().trim() : "";
    }

    // Ensure designation is a string
    let designation: string;
    if (typeof normalizedRow.designation === "string") {
      designation = normalizedRow.designation.trim();
    } else {
      designation = normalizedRow.designation
        ? normalizedRow.designation.toString().trim()
        : "Machine";
    }

    // Ensure marque is a string
    let marque: string;
    if (typeof normalizedRow.marque === "string") {
      marque = normalizedRow.marque.trim();
    } else {
      marque = normalizedRow.marque
        ? normalizedRow.marque.toString().trim()
        : "Non spécifiée";
    }

    // Ensure type is a string
    let type: string;
    if (typeof normalizedRow.type === "string") {
      type = normalizedRow.type.trim();
    } else {
      type = normalizedRow.type
        ? normalizedRow.type.toString().trim()
        : "Non spécifié";
    }

    // Ensure serialNumber is a string
    let serialNumber: string = "";
    if (normalizedRow.serialNumber !== undefined) {
      if (typeof normalizedRow.serialNumber === "string") {
        serialNumber = normalizedRow.serialNumber.trim();
      } else {
        serialNumber = normalizedRow.serialNumber
          ? normalizedRow.serialNumber.toString().trim()
          : "";
      }
    } else if (normalizedRow.serial_number !== undefined) {
      if (typeof normalizedRow.serial_number === "string") {
        serialNumber = normalizedRow.serial_number.trim();
      } else {
        serialNumber = normalizedRow.serial_number
          ? normalizedRow.serial_number.toString().trim()
          : "";
      }
    }

    // Ensure registrationNumber is a string
    let registrationNumber: string = "";
    if (normalizedRow.registrationNumber !== undefined) {
      if (typeof normalizedRow.registrationNumber === "string") {
        registrationNumber = normalizedRow.registrationNumber.trim();
      } else {
        registrationNumber = normalizedRow.registrationNumber
          ? normalizedRow.registrationNumber.toString().trim()
          : "";
      }
    } else if (normalizedRow.registration_number !== undefined) {
      if (typeof normalizedRow.registration_number === "string") {
        registrationNumber = normalizedRow.registration_number.trim();
      } else {
        registrationNumber = normalizedRow.registration_number
          ? normalizedRow.registration_number.toString().trim()
          : "";
      }
    }

    return {
      code,
      designation,
      marque,
      type,
      serialNumber,
      registrationNumber,
      serviceHours,
      _error: undefined,
    };
  };

  const validateMaintenanceRow = (row: any): ParsedMaintenanceRecord => {
    // Enhanced mapping for your specific Excel format
    const fieldMapping: Record<string, string> = {
      // Gamme mappings
      "Gamme éxecutée": "gamme",
      "Gamme executée": "gamme",
      Gamme: "gamme",
      "Gamme ": "gamme", // Handle trailing space
      Maintenance: "gamme",
      "Gamme d'entretien": "gamme",

      // Date mappings
      "Date De Gamme": "date",
      Date: "date",
      "Date De Gamme ": "date", // Handle trailing space
      "Date de la maintenance": "date",
      "Date De Maintenance": "date",

      // Service hours mappings
      Heures: "serviceHours",
      "Heurs De Gamme": "serviceHours",
      "Heurs De Gamme ": "serviceHours", // Handle trailing space
      "Heures de Service": "serviceHours",
      "Heures Service": "serviceHours",
      "Service Hours": "serviceHours",
      Hours: "serviceHours",
      "Volu compteur": "serviceHours",

      // Machine designation mappings for user's specific format
      DESIGNATION: "machineDesignation",
      "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur":
        "machineDesignation",
      designation: "machineDesignation",
      Designation: "machineDesignation",
      Désignation: "machineDesignation",
    };

    // Create a normalized row with proper field names
    const normalizedRow: any = {};

    // Map the fields based on the fieldMapping
    Object.keys(row).forEach((key) => {
      const normalizedKey = fieldMapping[key] || key;
      normalizedRow[normalizedKey] = row[key];
    });

    // Skip empty rows
    const rowValues = Object.values(normalizedRow).filter(
      (val) => val !== null && val !== undefined && val !== ""
    );
    if (rowValues.length === 0) {
      return {
        ...normalizedRow,
        _error: "Ligne vide ignorée",
      } as ParsedMaintenanceRecord;
    }

    // Enhanced detection of maintenance rows
    // If we don't have explicit gamme field, try to detect maintenance range from any field
    if (
      !normalizedRow.gamme ||
      (typeof normalizedRow.gamme === "string" &&
        normalizedRow.gamme.toString().trim() === "")
    ) {
      // Look for maintenance range in all fields
      let foundGamme = false;

      Object.keys(normalizedRow).forEach((key) => {
        if (!foundGamme && normalizedRow[key]) {
          const valueStr = normalizedRow[key].toString().toUpperCase();
          if (
            valueStr.includes("C") ||
            valueStr.includes("D") ||
            valueStr.includes("E") ||
            valueStr.includes("F")
          ) {
            // Extract the range letter
            const rangeMatch = valueStr.match(/[CDEF]/);
            if (rangeMatch) {
              normalizedRow.gamme = rangeMatch[0];
              foundGamme = true;
            }
          }
        }
      });

      // If still no gamme found, try to create one from the first valid range letter found
      if (!foundGamme) {
        Object.values(normalizedRow).forEach((value) => {
          if (!foundGamme && value) {
            const valueStr = value.toString().toUpperCase();
            const rangeMatch = valueStr.match(/[CDEF]/);
            if (rangeMatch) {
              normalizedRow.gamme = rangeMatch[0];
              foundGamme = true;
            }
          }
        });
      }
    }

    // Validate required fields with better error handling
    if (
      !normalizedRow.gamme ||
      (typeof normalizedRow.gamme === "string" &&
        normalizedRow.gamme.toString().trim() === "")
    ) {
      return {
        ...normalizedRow,
        _error: "Champ requis manquant : Gamme éxecutée",
      } as ParsedMaintenanceRecord;
    }

    if (
      !normalizedRow.date ||
      (typeof normalizedRow.date === "string" &&
        normalizedRow.date.toString().trim() === "")
    ) {
      // Try to use today's date as fallback
      normalizedRow.date = new Date().toISOString().split("T")[0];
    }

    // Validate date format
    let date: Date;
    if (typeof normalizedRow.date === "string") {
      date = new Date(normalizedRow.date);
    } else {
      date = new Date(normalizedRow.date ? normalizedRow.date.toString() : "");
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Try to parse the date with different formats
      let parsedDate: Date | null = null;

      // Convert to string for processing
      let dateString: string;
      if (typeof normalizedRow.date === "string") {
        dateString = normalizedRow.date;
      } else {
        dateString = normalizedRow.date ? normalizedRow.date.toString() : "";
      }

      // Try different date formats
      const formats = [
        dateString, // Default format
        dateString.replace(/-/g, "/"), // Replace - with /
        dateString.split("-").reverse().join("-"), // Reverse DD-MM-YYYY to YYYY-MM-DD
        dateString.replace(/\//g, "-"), // Replace / with -
        // Handle French date format DD/MM/YYYY
        dateString.includes("/") && dateString.split("/").length === 3
          ? `${dateString.split("/")[2]}-${dateString.split("/")[1]}-${
              dateString.split("/")[0]
            }`
          : dateString,
      ];

      for (const format of formats) {
        const testDate = new Date(format);
        if (!isNaN(testDate.getTime())) {
          parsedDate = testDate;
          break;
        }
      }

      if (!parsedDate) {
        return {
          ...normalizedRow,
          _error: "Format de date invalide",
        } as ParsedMaintenanceRecord;
      } else {
        date.setTime(parsedDate.getTime());
      }
    }

    // Validate service hours
    let serviceHours: number;
    if (typeof normalizedRow.serviceHours === "string") {
      // Handle French number format (comma as decimal separator)
      const normalizedServiceHours = normalizedRow.serviceHours.replace(
        ",",
        "."
      );
      serviceHours = Number(normalizedServiceHours);
    } else if (typeof normalizedRow.serviceHours === "number") {
      serviceHours = normalizedRow.serviceHours;
    } else {
      serviceHours = normalizedRow.serviceHours
        ? Number(normalizedRow.serviceHours)
        : 0;
    }

    if (isNaN(serviceHours) || serviceHours < 0) {
      // Use 0 as default
      serviceHours = 0;
    }

    // Validate maintenance range
    const validRanges = ["C", "D", "E", "F"];
    let maintenanceRange: "C" | "D" | "E" | "F" = "C";

    // Ensure gamme is a string for processing
    let gamme: string;
    if (typeof normalizedRow.gamme === "string") {
      gamme = normalizedRow.gamme.trim();
    } else {
      gamme = normalizedRow.gamme ? normalizedRow.gamme.toString().trim() : "";
    }

    // Extract range letter from gamme text
    const rangeMatch = gamme.match(/[CDEF]/i);
    if (rangeMatch) {
      maintenanceRange = rangeMatch[0].toUpperCase() as "C" | "D" | "E" | "F";
      // If gamme doesn't contain just the range letter, keep the full text
      if (gamme.length > 1) {
        // Keep the full gamme text
      } else {
        // If it's just the letter, we can use the standard range
        gamme = maintenanceRange;
      }
    } else {
      // Default to C if no range found
      maintenanceRange = "C";
      if (!gamme) {
        gamme = "C";
      }
    }

    // Extract machine designation if available
    let machineDesignation: string | undefined;
    if (normalizedRow.machineDesignation) {
      if (typeof normalizedRow.machineDesignation === "string") {
        machineDesignation = normalizedRow.machineDesignation.trim();
      } else {
        machineDesignation = normalizedRow.machineDesignation.toString().trim();
      }
    }

    // Ensure we have a valid date string
    const dateString = date.toISOString().split("T")[0];
    if (!dateString || dateString === "Invalid Date") {
      return {
        ...normalizedRow,
        _error: "Format de date invalide",
      } as ParsedMaintenanceRecord;
    }

    return {
      gamme,
      maintenanceRange,
      serviceHours,
      date: dateString, // Format as YYYY-MM-DD
      machineDesignation, // Include machine designation for matching with machines
      _error: undefined,
    } as ParsedMaintenanceRecord;
  };

  const validateRow = (row: any): ValidatedRow => {
    try {
      // For mixed content files, we need to determine what type of data each row contains
      if (importType === "mixed") {
        // Check if this row contains machine data
        const hasMachineData =
          (row["N° : ER.630.86.R0"] !== undefined &&
            row["N° : ER.630.86.R0"] !== null &&
            row["N° : ER.630.86.R0"].toString().trim() !== "") ||
          (row["CODE"] !== undefined &&
            row["CODE"] !== null &&
            row["CODE"].toString().trim() !== "") ||
          (row["code"] !== undefined &&
            row["code"] !== null &&
            row["code"].toString().trim() !== "") ||
          (row["N°"] !== undefined &&
            row["N°"] !== null &&
            row["N°"].toString().trim() !== "");

        // Check if this row contains maintenance data
        const hasMaintenanceData =
          (row["Gamme éxecutée"] !== undefined &&
            row["Gamme éxecutée"] !== null &&
            row["Gamme éxecutée"].toString().trim() !== "") ||
          (row["Gamme executée"] !== undefined &&
            row["Gamme executée"] !== null &&
            row["Gamme executée"].toString().trim() !== "") ||
          (row["Gamme"] !== undefined &&
            row["Gamme"] !== null &&
            row["Gamme"].toString().trim() !== "") ||
          (row["Date"] !== undefined &&
            row["Date"] !== null &&
            row["Date"].toString().trim() !== "") ||
          (row["Date de maintenance"] !== undefined &&
            row["Date de maintenance"] !== null &&
            row["Date de maintenance"].toString().trim() !== "") ||
          (row["Heures de Service"] !== undefined &&
            row["Heures de Service"] !== null &&
            row["Heures de Service"].toString().trim() !== "") ||
          (row["Heurs De Gamme"] !== undefined &&
            row["Heurs De Gamme"] !== null &&
            row["Heurs De Gamme"].toString().trim() !== "");

        // Enhanced detection based on row content
        const rowValues = Object.values(row).filter(
          (val) => val !== null && val !== undefined && val !== ""
        );

        // Check if row looks like machine data
        const looksLikeMachineRow =
          (row["N°"] !== undefined && row["N°"] !== null) ||
          (row["code"] !== undefined && row["code"] !== null) ||
          (row["Code"] !== undefined && row["Code"] !== null) ||
          (row["CODE"] !== undefined && row["CODE"] !== null) ||
          (row["N° engin"] !== undefined && row["N° engin"] !== null) ||
          (row["N° : ER.630.86.R0"] !== undefined &&
            row["N° : ER.630.86.R0"] !== null);

        // Check if row looks like maintenance data
        const looksLikeMaintenanceRow =
          (row["Gamme éxecutée"] !== undefined &&
            row["Gamme éxecutée"] !== null) ||
          (row["Gamme executée"] !== undefined &&
            row["Gamme executée"] !== null) ||
          (row["Gamme"] !== undefined && row["Gamme"] !== null) ||
          (row["Date"] !== undefined && row["Date"] !== null) ||
          (row["Date de maintenance"] !== undefined &&
            row["Date de maintenance"] !== null) ||
          (row["Heures de Service"] !== undefined &&
            row["Heures de Service"] !== null) ||
          (row["Heurs De Gamme"] !== undefined &&
            row["Heurs De Gamme"] !== null) ||
          Object.values(row).some(
            (val) =>
              val &&
              typeof val === "string" &&
              (val.includes("C") ||
                val.includes("D") ||
                val.includes("E") ||
                val.includes("F")) &&
              val.match(/[CDEF]/i)
          );

        // Special handling for your Excel format
        // Check if this is a maintenance row based on your specific column names
        const isYourMaintenanceRow =
          (typeof row[
            "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur"
          ] === "string" &&
            row[
              "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur"
            ].length > 0 &&
            (row[
              "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur"
            ].includes("C") ||
              row[
                "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur"
              ].includes("D") ||
              row[
                "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur"
              ].includes("E") ||
              row[
                "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur"
              ].includes("F"))) ||
          row["Gamme éxecutée"] !== undefined ||
          row["Gamme executée"] !== undefined ||
          row["Gamme"] !== undefined ||
          row["Heurs De Gamme"] !== undefined;

        if (hasMachineData && !hasMaintenanceData && !isYourMaintenanceRow) {
          return validateMachineRow(row);
        } else if (hasMaintenanceData || isYourMaintenanceRow) {
          return validateMaintenanceRow(row);
        } else if (
          looksLikeMachineRow &&
          !looksLikeMaintenanceRow &&
          !isYourMaintenanceRow
        ) {
          return validateMachineRow(row);
        } else if (
          (looksLikeMaintenanceRow || isYourMaintenanceRow) &&
          !looksLikeMachineRow
        ) {
          return validateMaintenanceRow(row);
        } else if (rowValues.length > 0) {
          // If the row has substantial content, try machine validation first
          const machineResult = validateMachineRow(row);
          if (!machineResult._error) {
            return machineResult;
          }

          // If machine validation fails, try maintenance validation
          const maintenanceResult = validateMaintenanceRow(row);
          if (!maintenanceResult._error) {
            return maintenanceResult;
          }

          // If both fail, return the machine result with error
          return machineResult;
        }

        // Empty row, return with error
        return { ...row, _error: "Ligne vide ou incomplète" } as ValidatedRow;
      } else if (importType === "maintenance") {
        return validateMaintenanceRow(row);
      } else {
        return validateMachineRow(row);
      }
    } catch (error) {
      console.error("Error validating row:", error, row);
      // Create a safe copy of the row object
      const safeRowCopy: any = {};
      if (row && typeof row === "object") {
        try {
          Object.keys(row).forEach((key) => {
            // Safely copy each property
            const value = (row as Record<string, any>)[key];
            if (value === null || value === undefined) {
              safeRowCopy[key] = value;
            } else if (typeof value === "object") {
              safeRowCopy[key] = JSON.stringify(value);
            } else {
              safeRowCopy[key] = value;
            }
          });
        } catch (copyError) {
          console.error("Error copying row object:", copyError);
          // If we can't copy the object, create a simple representation
          safeRowCopy["error"] = "Unable to process row data";
        }
      }
      return {
        ...safeRowCopy,
        _error: `Erreur de validation: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      } as ValidatedRow;
    }
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) {
            reject(
              new Error(
                "Le fichier Excel doit contenir au moins une ligne d'en-tête et une ligne de données"
              )
            );
            return;
          }

          // Find the header row (5th row in your specific Excel format)
          let headerRowIndex = 4; // 5th row (0-indexed)

          // Check if the 5th row actually contains headers
          if (headerRowIndex < jsonData.length) {
            const row = jsonData[headerRowIndex] as any[];
            // Verify this row contains typical column headers
            const hasHeaders = row.some(
              (cell) =>
                cell &&
                typeof cell === "string" &&
                (cell.toLowerCase().includes("code") ||
                  cell.toLowerCase().includes("type") ||
                  cell.toLowerCase().includes("marque") ||
                  cell.toLowerCase().includes("designation") ||
                  cell.toLowerCase().includes("gamme") ||
                  cell.toLowerCase().includes("date") ||
                  cell.toLowerCase().includes("heures") ||
                  cell.toLowerCase().includes("planning") ||
                  cell.toLowerCase().includes("suivi") ||
                  cell.toLowerCase().includes("entretien") ||
                  cell.toLowerCase().includes("moteur") ||
                  cell.toLowerCase().includes("n°") ||
                  cell.toLowerCase().includes("volu compteur"))
            );

            if (!hasHeaders && jsonData.length > 5) {
              // If 5th row doesn't have headers, look for headers in the first 10 rows
              for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const searchRow = jsonData[i] as any[];
                if (
                  searchRow.some(
                    (cell) =>
                      cell &&
                      typeof cell === "string" &&
                      (cell.toLowerCase().includes("code") ||
                        cell.toLowerCase().includes("type") ||
                        cell.toLowerCase().includes("marque") ||
                        cell.toLowerCase().includes("designation") ||
                        cell.toLowerCase().includes("gamme") ||
                        cell.toLowerCase().includes("date") ||
                        cell.toLowerCase().includes("heures") ||
                        cell.toLowerCase().includes("planning") ||
                        cell.toLowerCase().includes("suivi") ||
                        cell.toLowerCase().includes("entretien") ||
                        cell.toLowerCase().includes("moteur") ||
                        cell.toLowerCase().includes("n°") ||
                        cell.toLowerCase().includes("volu compteur"))
                  )
                ) {
                  headerRowIndex = i;
                  break;
                }
              }
            }
          } else {
            // Fallback to searching first 10 rows if 5th row doesn't exist
            headerRowIndex = 0;
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
              const searchRow = jsonData[i] as any[];
              if (
                searchRow.some(
                  (cell) =>
                    cell &&
                    typeof cell === "string" &&
                    (cell.toLowerCase().includes("code") ||
                      cell.toLowerCase().includes("type") ||
                      cell.toLowerCase().includes("marque") ||
                      cell.toLowerCase().includes("designation") ||
                      cell.toLowerCase().includes("gamme") ||
                      cell.toLowerCase().includes("date") ||
                      cell.toLowerCase().includes("heures") ||
                      cell.toLowerCase().includes("planning") ||
                      cell.toLowerCase().includes("suivi") ||
                      cell.toLowerCase().includes("entretien") ||
                      cell.toLowerCase().includes("moteur") ||
                      cell.toLowerCase().includes("n°") ||
                      cell.toLowerCase().includes("volu compteur"))
                )
              ) {
                headerRowIndex = i;
                break;
              }
            }
          }

          // Convert to object format using the identified header row
          const headers = ((jsonData[headerRowIndex] as any[]) || []).map((h) =>
            h !== null && h !== undefined ? h.toString() : ""
          );

          const rows = (jsonData.slice(headerRowIndex + 1) as any[][]).map(
            (row: any[]) => {
              const obj: any = {};
              headers.forEach((header, index) => {
                // Handle cases where row might be shorter than headers
                const value = index < row.length ? row[index] : "";
                // Ensure the value is properly converted to a string or kept as is
                obj[header] =
                  value !== undefined && value !== null ? value : "";
              });
              return obj;
            }
          );

          resolve(rows);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          reject(
            new Error(
              `Erreur de lecture du fichier Excel: ${
                error instanceof Error ? error.message : "Erreur inconnue"
              }`
            )
          );
        }
      };
      reader.onerror = () =>
        reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  };

  const isExcelFile = (file: File): boolean => {
    const excelExtensions = [".xlsx", ".xls", ".xlsm"];
    return excelExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setValidatedRows([]);
    setDetectedHeaders([]);

    try {
      let parsedData: any[] = [];

      if (isExcelFile(selectedFile)) {
        // Handle Excel files
        parsedData = await parseExcelFile(selectedFile);
        if (parsedData.length > 0) {
          const headers = Object.keys(parsedData[0] as object);
          setDetectedHeaders(headers);
          setImportType(detectImportType(headers));
        }
        const validated = parsedData.map((row) => {
          try {
            // Ensure row is a valid object before processing
            if (!row || typeof row !== "object") {
              return {
                _error: "Format de ligne invalide",
              } as ValidatedRow;
            }
            return validateRow(row);
          } catch (error) {
            console.error("Error validating row:", error, row);
            // Create a safe copy of the row object
            const safeRowCopy: Record<string, any> = {};
            if (row && typeof row === "object") {
              try {
                Object.keys(row).forEach((key) => {
                  // Safely copy each property
                  const value = (row as Record<string, any>)[key];
                  if (value === null || value === undefined) {
                    safeRowCopy[key] = value;
                  } else if (typeof value === "object") {
                    safeRowCopy[key] = JSON.stringify(value);
                  } else {
                    safeRowCopy[key] = value;
                  }
                });
              } catch (copyError) {
                console.error("Error copying row object:", copyError);
                // If we can't copy the object, create a simple representation
                safeRowCopy["error"] = "Unable to process row data";
              }
            }
            return {
              ...safeRowCopy,
              _error: `Erreur de validation: ${
                error instanceof Error ? error.message : "Erreur inconnue"
              }`,
            } as ValidatedRow;
          }
        });
        setValidatedRows(validated);
        setIsProcessing(false);
      } else {
        // Handle CSV files
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              if (
                results.data.length > 0 &&
                typeof results.data[0] === "object" &&
                results.data[0] !== null
              ) {
                const firstRow = results.data[0];
                if (firstRow && typeof firstRow === "object") {
                  const headers = Object.keys(firstRow);
                  setDetectedHeaders(headers);
                  setImportType(detectImportType(headers));
                }
              }
              const validated = results.data.map((row) => {
                try {
                  // Ensure row is a valid object before processing
                  if (!row || typeof row !== "object") {
                    return {
                      _error: "Format de ligne invalide",
                    } as ValidatedRow;
                  }
                  return validateRow(row);
                } catch (error) {
                  console.error("Error validating row:", error, row);
                  // Create a safe copy of the row object
                  const safeRowCopy: Record<string, any> = {};
                  if (row && typeof row === "object") {
                    try {
                      Object.keys(row).forEach((key) => {
                        // Safely copy each property
                        const value = (row as Record<string, any>)[key];
                        if (value === null || value === undefined) {
                          safeRowCopy[key] = value;
                        } else if (typeof value === "object") {
                          safeRowCopy[key] = JSON.stringify(value);
                        } else {
                          safeRowCopy[key] = value;
                        }
                      });
                    } catch (copyError) {
                      console.error("Error copying row object:", copyError);
                      // If we can't copy the object, create a simple representation
                      safeRowCopy["error"] = "Unable to process row data";
                    }
                  }
                  return {
                    ...safeRowCopy,
                    _error: `Erreur de validation: ${
                      error instanceof Error ? error.message : "Erreur inconnue"
                    }`,
                  } as ValidatedRow;
                }
              });
              setValidatedRows(validated);
              setIsProcessing(false);
            } catch (error) {
              console.error("Error processing CSV:", error);
              setValidatedRows([
                {
                  _error: `Erreur de traitement CSV: ${
                    error instanceof Error ? error.message : "Erreur inconnue"
                  }`,
                } as ValidatedRow,
              ]);
              setIsProcessing(false);
            }
          },
          error: (error) => {
            console.error("Erreur d'analyse CSV:", error);
            setValidatedRows([
              {
                _error: `Erreur d'analyse CSV: ${error.message}`,
              } as ValidatedRow,
            ]);
            setIsProcessing(false);
          },
        });
      }
    } catch (error) {
      console.error("Erreur d'analyse de fichier:", error);
      setValidatedRows([
        {
          _error: `Erreur de lecture du fichier: ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`,
        } as ValidatedRow,
      ]);
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleContainerClick = () => {
    const fileInput = document.getElementById(
      "dropzone-file"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleContainerClick();
    }
  };

  const handleImportClick = () => {
    const validRows = validatedRows.filter((row) => !row._error);

    if (importType === "maintenance" && onImportMaintenanceRecords) {
      onImportMaintenanceRecords(validRows as ParsedMaintenanceRecord[]);
    } else if (importType === "mixed") {
      // For mixed content, separate machine and maintenance data
      // Improved filtering logic for maintenance rows
      const maintenanceRows = validRows.filter((row) => {
        // Check if it's a maintenance row by looking for maintenance-specific fields
        return (
          (row as ParsedMaintenanceRecord).gamme !== undefined ||
          (row as ParsedMaintenanceRecord).maintenanceRange !== undefined ||
          (row as any).Gamme !== undefined ||
          (row as any)["Gamme éxecutée"] !== undefined ||
          (row as any)["Gamme executée"] !== undefined ||
          (row as any).Date !== undefined ||
          (row as any)["Date de maintenance"] !== undefined ||
          (row as any)["Heures de Service"] !== undefined ||
          (row as any)["Heurs De Gamme"] !== undefined ||
          // Check if any field contains maintenance range indicators
          Object.keys(row).some((key) => {
            const value = (row as any)[key];
            return (
              value &&
              typeof value === "string" &&
              (value.toUpperCase().includes("C") ||
                value.toUpperCase().includes("D") ||
                value.toUpperCase().includes("E") ||
                value.toUpperCase().includes("F")) &&
              value.match(/[CDEF]/i)
            );
          })
        );
      }) as ParsedMaintenanceRecord[];

      // Improved filtering logic for machine rows
      const machineRows = validRows.filter((row) => {
        // Check if it's a machine row by looking for machine-specific fields
        const isMaintenanceRow =
          (row as ParsedMaintenanceRecord).gamme !== undefined ||
          (row as any)["Gamme éxecutée"] !== undefined ||
          (row as any)["Gamme executée"] !== undefined;

        const isMachineRow =
          (row as ValidatedMachineRow).code !== undefined ||
          (row as any).CODE !== undefined ||
          (row as any).code !== undefined ||
          (row as any)["N° : ER.630.86.R0"] !== undefined ||
          (row as any).designation !== undefined;

        // Prioritize maintenance rows that have gamme data, otherwise treat as machine row
        return !isMaintenanceRow && isMachineRow;
      }) as ValidatedMachineRow[];

      // Import machines if we have any
      if (machineRows.length > 0) {
        onImportMachines(machineRows);
      }

      // Import maintenance records if we have any
      if (maintenanceRows.length > 0 && onImportMaintenanceRecords) {
        onImportMaintenanceRecords(maintenanceRows);
      }

      // Show feedback when no data was detected
      if (machineRows.length === 0 && maintenanceRows.length === 0) {
        // Try to determine what type of data we have based on content
        const hasMaintenanceIndicators = validRows.some((row) =>
          Object.keys(row).some((key) => {
            const value = (row as any)[key];
            return (
              value &&
              typeof value === "string" &&
              (value.toUpperCase().includes("C") ||
                value.toUpperCase().includes("D") ||
                value.toUpperCase().includes("E") ||
                value.toUpperCase().includes("F")) &&
              value.match(/[CDEF]/i)
            );
          })
        );

        if (hasMaintenanceIndicators && onImportMaintenanceRecords) {
          onImportMaintenanceRecords(validRows as ParsedMaintenanceRecord[]);
        } else {
          onImportMachines(validRows as ParsedMachine[]);
        }
      }
    } else if (importType === "machines") {
      onImportMachines(validRows as ParsedMachine[]);
    }
  };

  const validRows = validatedRows.filter((row) => !row._error);
  const invalidRows = validatedRows.filter((row) => row._error);

  // Function to show header mapping suggestions
  const renderHeaderMappingHelp = () => {
    if (detectedHeaders.length === 0) return null;

    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Correspondance des en-têtes détectée
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          En-têtes détectés dans votre fichier :
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {detectedHeaders.map((header, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200"
            >
              {header}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Le système a détecté un import de type:{" "}
          <strong>
            {importType === "maintenance"
              ? "Maintenance"
              : importType === "mixed"
              ? "Contenu Mixte (Engins & Maintenance)"
              : importType === "machines"
              ? "Engins"
              : "Inconnu"}
          </strong>
          . Si l'importation échoue, assurez-vous que votre fichier contient les
          colonnes requises.
        </p>
      </div>
    );
  };

  const downloadMachineTemplate = () => {
    const templateData = [
      {
        code: "ENG001",
        designation: "Excavatrice Hydraulique",
        marque: "Caterpillar",
        type: "320D",
        serviceHours: 1250,
        serialNumber: "CAT320D12345",
        registrationNumber: "REG001",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Generate buffer and create blob
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_engins.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadMaintenanceTemplate = () => {
    const templateData = [
      {
        "Gamme éxecutée": "C",
        Date: "2024-01-15",
        "Heures de Service": 1250,
      },
      {
        "Gamme éxecutée": "D",
        Date: "2024-02-20",
        "Heures de Service": 1500,
      },
      {
        "Gamme éxecutée": "E",
        Date: "2024-03-25",
        "Heures de Service": 2000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Generate buffer and create blob
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_maintenance.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderValidRows = () => {
    if (importType === "maintenance") {
      return (
        <Table>
          <TableHeader className="sticky top-0 bg-background/95">
            <TableRow>
              <TableHead>Gamme</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Heures</TableHead>
              {detectedHeaders.includes("DESIGNATION") ||
              detectedHeaders.includes("designation") ||
              detectedHeaders.includes("Designation") ? (
                <TableHead>Engin</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.map((row, i) => (
              <TableRow key={`valid-${i}`}>
                <TableCell>{(row as ParsedMaintenanceRecord).gamme}</TableCell>
                <TableCell>
                  {new Date(
                    (row as ParsedMaintenanceRecord).date
                  ).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {(row as ParsedMaintenanceRecord).serviceHours}
                </TableCell>
                {(row as ParsedMaintenanceRecord).machineDesignation ? (
                  <TableCell>
                    {(row as ParsedMaintenanceRecord).machineDesignation}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    } else if (importType === "mixed") {
      // For mixed content, show both machine and maintenance data
      const machineRows = validRows.filter(
        (row) => (row as ValidatedMachineRow).code !== undefined
      );

      const maintenanceRows = validRows.filter(
        (row) => (row as ParsedMaintenanceRecord).gamme !== undefined
      );

      return (
        <div className="space-y-4">
          {machineRows.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Engins ({machineRows.length})
              </h4>
              <Table>
                <TableHeader className="sticky top-0 bg-background/95">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Heures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineRows.map((row, i) => (
                    <TableRow key={`machine-${i}`}>
                      <TableCell>{(row as ValidatedMachineRow).code}</TableCell>
                      <TableCell>
                        {(row as ValidatedMachineRow).designation}
                      </TableCell>
                      <TableCell>
                        {(row as ValidatedMachineRow).marque}
                      </TableCell>
                      <TableCell>{(row as ValidatedMachineRow).type}</TableCell>
                      <TableCell>
                        {(row as ValidatedMachineRow).serviceHours}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {maintenanceRows.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Maintenance ({maintenanceRows.length})
              </h4>
              <Table>
                <TableHeader className="sticky top-0 bg-background/95">
                  <TableRow>
                    <TableHead>Gamme</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heures</TableHead>
                    {detectedHeaders.includes("DESIGNATION") ||
                    detectedHeaders.includes("designation") ||
                    detectedHeaders.includes("Designation") ? (
                      <TableHead>Engin</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRows.map((row, i) => (
                    <TableRow key={`maintenance-${i}`}>
                      <TableCell>
                        {(row as ParsedMaintenanceRecord).gamme}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          (row as ParsedMaintenanceRecord).date
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {(row as ParsedMaintenanceRecord).serviceHours}
                      </TableCell>
                      {(row as ParsedMaintenanceRecord).machineDesignation ? (
                        <TableCell>
                          {(row as ParsedMaintenanceRecord).machineDesignation}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <Table>
          <TableHeader className="sticky top-0 bg-background/95">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Heures</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.map((row, i) => (
              <TableRow key={`valid-${i}`}>
                <TableCell>{(row as ValidatedMachineRow).code}</TableCell>
                <TableCell>
                  {(row as ValidatedMachineRow).designation}
                </TableCell>
                <TableCell>{(row as ValidatedMachineRow).marque}</TableCell>
                <TableCell>{(row as ValidatedMachineRow).type}</TableCell>
                <TableCell>
                  {(row as ValidatedMachineRow).serviceHours}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="lg">
      <DialogHeader>
        <DialogTitle>Importer des Données</DialogTitle>
        <DialogDescription>
          {importType === "maintenance"
            ? "Importez des opérations de maintenance depuis un fichier CSV ou Excel."
            : importType === "mixed"
            ? "Importez des engins et des opérations de maintenance depuis un fichier CSV ou Excel."
            : "Importez une liste d'engins depuis un fichier CSV ou Excel."}
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        {!file ? (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer bg-muted/50 hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleContainerClick}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="button"
              aria-label="Click to upload CSV or Excel file or drag and drop"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ArrowUpTrayIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Cliquez pour téléverser</span>{" "}
                  ou glissez-déposez
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV, Excel (xlsx, xls, xlsm) - max 5MB
                </p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.xlsm"
                onChange={(e) =>
                  e.target.files && handleFileChange(e.target.files[0])
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadMachineTemplate}
                >
                  Télécharger le modèle Engins
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour importer des engins
                </p>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadMaintenanceTemplate}
                >
                  Télécharger le modèle Maintenance
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour importer des opérations de maintenance
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderHeaderMappingHelp()}

            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                {importType === "mixed"
                  ? `${validRows.length} Ligne(s) Valide(s) pour l'Importation`
                  : `${validRows.length} Ligne(s) Valide(s) pour l'Importation`}
              </h3>
              {validRows.length > 0 && (
                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                  {renderValidRows()}
                </div>
              )}
            </div>
            {invalidRows.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <XCircleIcon className="w-5 h-5 text-destructive" />
                  {invalidRows.length} Ligne(s) Ignorée(s)
                </h3>
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/95">
                      <TableRow>
                        <TableHead>Données</TableHead>
                        <TableHead>Erreur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invalidRows.map((row, i) => (
                        <TableRow key={`invalid-${i}`}>
                          <TableCell className="text-xs max-w-xs truncate">
                            {JSON.stringify(row).substring(0, 100)}...
                          </TableCell>
                          <TableCell className="text-destructive text-xs">
                            {row._error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Annuler
        </Button>
        {file && (
          <Button
            onClick={handleImportClick}
            disabled={validRows.length === 0 || isProcessing}
          >
            {isProcessing
              ? "Analyse en cours..."
              : importType === "maintenance"
              ? `Importer ${validRows.length} opération(s)`
              : importType === "mixed"
              ? `Importer ${validRows.length} élément(s)`
              : `Importer ${validRows.length} engin(s)`}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
};

export default ImportModal;
