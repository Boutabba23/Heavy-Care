const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const filePath = 'c:\\filtre-app\\components\\Planning suivi mensuel.xlsx';
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'array' });

console.log('Workbook Sheet Names:', workbook.SheetNames);

// Get the first sheet
const firstSheetName = workbook.SheetNames[0];
console.log('First Sheet Name:', firstSheetName);

const worksheet = workbook.Sheets[firstSheetName];

// Convert sheet to JSON with headers
const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Full sheet data:');
console.log(sheetData);

// For this project, data always starts from the 6th row (index 5)
const headerRowIndex = 4; // 5th row contains headers
const dataStartIndex = 5; // Data starts at 6th row

console.log('Header row index:', headerRowIndex);
console.log('Data start index:', dataStartIndex);

// Get the header row
const headerRow = Array.isArray(sheetData[headerRowIndex])
  ? sheetData[headerRowIndex].map((cell) => String(cell || "").trim())
  : [];

console.log('Header row data:', headerRow);

// Process data rows starting from dataStartIndex
for (let i = dataStartIndex; i < sheetData.length; i++) {
  const row = sheetData[i];
  if (Array.isArray(row)) {
    const record = {};
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

    console.log(`Row ${i}:`, record);
    console.log(`Row ${i} has data:`, hasData);
  }
}