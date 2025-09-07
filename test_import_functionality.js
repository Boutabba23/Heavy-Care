// Simple test script to verify import functionality
// This script tests the validation functions from ImportModal.tsx

// Mock data that represents what would come from a CSV/Excel file
const mockMachineData = [
  {
    "N° : ER.630.86.R0": "M001",
    "Planning de suivi mensuel gamme d'entretien préventif / Partie moteur":
      "Excavatrice Test",
    TYPE: "Test Model",
    "Volu compteur": "1500",
    serial_number: "SN123456",
    registration_number: "REG789012",
  },
  {
    code: "M002",
    designation: "Bulldozer Test",
    marque: "TestBrand",
    type: "Test Model 2",
    serviceHours: "2000",
    serialNumber: "SN789012",
    registrationNumber: "REG345678",
  },
];

const mockMaintenanceData = [
  {
    "Gamme éxecutée": "C",
    "Date De Gamme": "2024-01-15",
    "Volu compteur": "1500",
    DESIGNATION: "Excavatrice Test",
  },
  {
    gamme: "D",
    date: "2024-02-20",
    serviceHours: "2000",
    designation: "Bulldozer Test",
  },
];

// Mock validation functions (simplified versions)
function validateMachineRow(row) {
  // Enhanced mapping for your specific Excel format
  const fieldMapping = {
    // Code mappings
    code: "code",
    Code: "code",
    CODE: "code",
    "N°": "code",
    "N° engin": "code",
    "N° : ER.630.86.R0": "code",

    // Designation mappings
    designation: "designation",
    Designation: "designation",
    DESIGNATION: "designation",
    Désignation: "designation",
    Description: "designation",

    // Marque mappings
    marque: "marque",
    Marque: "marque",
    MARQUE: "marque",
    Brand: "marque",

    // Type mappings
    type: "type",
    Type: "type",
    TYPE: "type",

    // Service hours mappings
    serviceHours: "serviceHours",
    ServiceHours: "serviceHours",
    Heures: "serviceHours",
    "Heures de service": "serviceHours",
    "Heures Service": "serviceHours",
    "Service Hours": "serviceHours",
    Hours: "serviceHours",
    "Volu compteur": "serviceHours",

    // Serial number mappings
    serialNumber: "serialNumber",
    serial_number: "serialNumber",
    "Serial Number": "serialNumber",

    // Registration number mappings
    registrationNumber: "registrationNumber",
    registration_number: "registrationNumber",
    "Registration Number": "registrationNumber",
  };

  // Create a normalized row with proper field names
  const normalizedRow = {};

  // Map the fields based on the fieldMapping
  Object.keys(row).forEach((key) => {
    const normalizedKey = fieldMapping[key] || key;
    normalizedRow[normalizedKey] = row[key];
  });

  // Ensure required fields
  const requiredFields = [
    "code",
    "designation",
    "marque",
    "type",
    "serviceHours",
  ];

  for (const field of requiredFields) {
    if (!normalizedRow[field]) {
      // Try to generate missing fields
      if (field === "code" && normalizedRow.type) {
        normalizedRow.code =
          normalizedRow.type.toString().replace(/\s+/g, "").substring(0, 10) +
          Math.floor(Math.random() * 1000);
      } else if (field === "marque") {
        normalizedRow.marque = "Non spécifiée";
      } else if (field === "designation") {
        normalizedRow.designation = "Machine";
      } else if (field === "type") {
        normalizedRow.type = "Non spécifié";
      } else {
        return { ...normalizedRow, _error: `Champ requis manquant : ${field}` };
      }
    }
  }

  // Ensure serviceHours is a number
  let serviceHours = 0;
  if (typeof normalizedRow.serviceHours === "string") {
    serviceHours = Number(normalizedRow.serviceHours);
  } else if (typeof normalizedRow.serviceHours === "number") {
    serviceHours = normalizedRow.serviceHours;
  }

  if (isNaN(serviceHours) || serviceHours < 0) {
    serviceHours = 0;
  }

  // Ensure code is a string
  let code = "";
  if (typeof normalizedRow.code === "string") {
    code = normalizedRow.code.trim();
  } else {
    code = normalizedRow.code ? normalizedRow.code.toString().trim() : "";
  }

  // Ensure designation is a string
  let designation = "Machine";
  if (typeof normalizedRow.designation === "string") {
    designation = normalizedRow.designation.trim();
  } else if (normalizedRow.designation) {
    designation = normalizedRow.designation.toString().trim();
  }

  // Ensure marque is a string
  let marque = "Non spécifiée";
  if (typeof normalizedRow.marque === "string") {
    marque = normalizedRow.marque.trim();
  } else if (normalizedRow.marque) {
    marque = normalizedRow.marque.toString().trim();
  }

  // Ensure type is a string
  let type = "Non spécifié";
  if (typeof normalizedRow.type === "string") {
    type = normalizedRow.type.trim();
  } else if (normalizedRow.type) {
    type = normalizedRow.type.toString().trim();
  }

  // Handle serialNumber
  let serialNumber = "";
  if (normalizedRow.serialNumber !== undefined) {
    if (typeof normalizedRow.serialNumber === "string") {
      serialNumber = normalizedRow.serialNumber.trim();
    } else if (normalizedRow.serialNumber) {
      serialNumber = normalizedRow.serialNumber.toString().trim();
    }
  }

  // Handle registrationNumber
  let registrationNumber = "";
  if (normalizedRow.registrationNumber !== undefined) {
    if (typeof normalizedRow.registrationNumber === "string") {
      registrationNumber = normalizedRow.registrationNumber.trim();
    } else if (normalizedRow.registrationNumber) {
      registrationNumber = normalizedRow.registrationNumber.toString().trim();
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
}

function validateMaintenanceRow(row) {
  // Enhanced mapping for your specific Excel format
  const fieldMapping = {
    // Gamme mappings
    "Gamme éxecutée": "gamme",
    "Gamme executée": "gamme",
    Gamme: "gamme",
    Maintenance: "gamme",

    // Date mappings
    "Date De Gamme": "date",
    Date: "date",
    "Date de la maintenance": "date",

    // Service hours mappings
    Heures: "serviceHours",
    "Heurs De Gamme": "serviceHours",
    "Heures de Service": "serviceHours",
    "Heures Service": "serviceHours",
    "Service Hours": "serviceHours",
    Hours: "serviceHours",
    "Volu compteur": "serviceHours",

    // Machine designation mappings
    DESIGNATION: "machineDesignation",
    designation: "machineDesignation",
    Designation: "machineDesignation",
    Désignation: "machineDesignation",
  };

  // Create a normalized row with proper field names
  const normalizedRow = {};

  // Map the fields based on the fieldMapping
  Object.keys(row).forEach((key) => {
    const normalizedKey = fieldMapping[key] || key;
    normalizedRow[normalizedKey] = row[key];
  });

  // Validate required fields
  if (!normalizedRow.gamme) {
    return {
      ...normalizedRow,
      _error: "Champ requis manquant : Gamme éxecutée",
    };
  }

  if (!normalizedRow.date) {
    // Use today's date as fallback
    normalizedRow.date = new Date().toISOString().split("T")[0];
  }

  // Validate date format
  let date = new Date(normalizedRow.date);
  if (isNaN(date.getTime())) {
    return {
      ...normalizedRow,
      _error: "Format de date invalide",
    };
  }

  // Validate service hours
  let serviceHours = 0;
  if (typeof normalizedRow.serviceHours === "string") {
    // Handle French number format (comma as decimal separator)
    const normalizedServiceHours = normalizedRow.serviceHours.replace(",", ".");
    serviceHours = Number(normalizedServiceHours);
  } else if (typeof normalizedRow.serviceHours === "number") {
    serviceHours = normalizedRow.serviceHours;
  } else if (normalizedRow.serviceHours) {
    serviceHours = Number(normalizedRow.serviceHours);
  }

  if (isNaN(serviceHours) || serviceHours < 0) {
    serviceHours = 0;
  }

  // Validate maintenance range
  const validRanges = ["C", "D", "E", "F"];
  let maintenanceRange = "C";

  // Ensure gamme is a string for processing
  let gamme = "";
  if (typeof normalizedRow.gamme === "string") {
    gamme = normalizedRow.gamme.trim();
  } else if (normalizedRow.gamme) {
    gamme = normalizedRow.gamme.toString().trim();
  }

  // Extract range letter from gamme text
  const rangeMatch = gamme.match(/[CDEF]/i);
  if (rangeMatch) {
    maintenanceRange = rangeMatch[0].toUpperCase();
  }

  // Extract machine designation if available
  let machineDesignation = undefined;
  if (normalizedRow.machineDesignation) {
    if (typeof normalizedRow.machineDesignation === "string") {
      machineDesignation = normalizedRow.machineDesignation.trim();
    } else if (normalizedRow.machineDesignation) {
      machineDesignation = normalizedRow.machineDesignation.toString().trim();
    }
  }

  // Ensure we have a valid date string
  const dateString = date.toISOString().split("T")[0];

  return {
    gamme,
    maintenanceRange,
    serviceHours,
    date: dateString,
    machineDesignation,
    _error: undefined,
  };
}

// Test the validation functions
console.log("Testing machine data validation...");
mockMachineData.forEach((row, index) => {
  console.log(`\nMachine Row ${index + 1}:`, row);
  const result = validateMachineRow(row);
  console.log("Validation Result:", result);
  if (result._error) {
    console.log("❌ Error:", result._error);
  } else {
    console.log("✅ Valid");
  }
});

console.log("\n\nTesting maintenance data validation...");
mockMaintenanceData.forEach((row, index) => {
  console.log(`\nMaintenance Row ${index + 1}:`, row);
  const result = validateMaintenanceRow(row);
  console.log("Validation Result:", result);
  if (result._error) {
    console.log("❌ Error:", result._error);
  } else {
    console.log("✅ Valid");
  }
});

console.log("\n\nImport functionality test completed.");
