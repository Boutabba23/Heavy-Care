// Test script to verify maintenance import functionality
console.log('=== Testing Maintenance Import Functionality ===\n');

// Mock existing maintenance records
const existingMaintenanceRecords = [
  {
    id: 'maint-1',
    machine_id: 'm-1',
    date: '2024-01-15',
    service_hours: 1500,
    maintenance_range: 'C',
    filters_used: []
  },
  {
    id: 'maint-2',
    machine_id: 'm-1',
    date: '2024-02-20',
    service_hours: 1750,
    maintenance_range: 'D',
    filters_used: []
  }
];

// Mock new maintenance records to import (some duplicates, some new)
const newMaintenanceRecords = [
  // Duplicate record
  {
    machineId: 'm-1',
    machineDesignation: 'Excavator Test 1',
    date: '2024-01-15',
    serviceHours: 1500,
    maintenanceRange: 'C'
  },
  // New record
  {
    machineId: 'm-1',
    machineDesignation: 'Excavator Test 1',
    date: '2024-03-10',
    serviceHours: 2000,
    maintenanceRange: 'E'
  },
  // Another duplicate
  {
    machineId: 'm-1',
    machineDesignation: 'Excavator Test 1',
    date: '2024-02-20',
    serviceHours: 1750,
    maintenanceRange: 'D'
  }
];

console.log('Existing maintenance records:');
existingMaintenanceRecords.forEach(record => {
  console.log(`  - Machine: ${record.machine_id}, Date: ${record.date}, Hours: ${record.service_hours}, Range: ${record.maintenance_range}`);
});

console.log('\nNew maintenance records to import:');
newMaintenanceRecords.forEach(record => {
  console.log(`  - Machine: ${record.machineId}, Date: ${record.date}, Hours: ${record.serviceHours}, Range: ${record.maintenanceRange}`);
});

// Function to normalize values for comparison
const normalizeValue = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

// Function to check if two records are duplicates
const isDuplicateRecord = (record1, record2) => {
  // Normalize dates (remove time part if exists)
  const date1 = normalizeValue(record1.date).split('T')[0];
  const date2 = normalizeValue(record2.date).split('T')[0];
  
  // Normalize service hours (handle string vs number)
  const hours1 = typeof record1.serviceHours === 'string' ? 
    parseInt(record1.serviceHours, 10) : record1.serviceHours;
  const hours2 = typeof record2.serviceHours === 'string' ? 
    parseInt(record2.serviceHours, 10) : record2.serviceHours;
  
  // Handle database format vs import format
  const machineId1 = record1.machineId || record1.machine_id;
  const machineId2 = record2.machineId || record2.machine_id;
  
  const serviceHours1 = record1.serviceHours !== undefined ? record1.serviceHours : record1.service_hours;
  const serviceHours2 = record2.serviceHours !== undefined ? record2.serviceHours : record2.service_hours;
  
  const maintenanceRange1 = record1.maintenanceRange || record1.maintenance_range;
  const maintenanceRange2 = record2.maintenanceRange || record2.maintenance_range;
  
  // Normalize maintenance range (case insensitive)
  const range1 = normalizeValue(maintenanceRange1).toUpperCase();
  const range2 = normalizeValue(maintenanceRange2).toUpperCase();
  
  const isDup = (
    normalizeValue(machineId1) === normalizeValue(machineId2) &&
    date1 === date2 &&
    serviceHours1 === serviceHours2 &&
    range1 === range2
  );
  
  return isDup;
};

// Filter out duplicates
const uniqueMaintenanceData = newMaintenanceRecords.filter((record, index) => {
  // Check if this record already exists in the database
  const isExistingRecord = existingMaintenanceRecords.some(
    (existingRecord) => {
      const isDup = isDuplicateRecord(existingRecord, record);
      if (isDup) {
        console.log(`Duplicate found for record ${index}:`, record);
      }
      return isDup;
    }
  );
  
  return !isExistingRecord;
});

console.log('\n=== Results ===');
console.log(`Original records: ${newMaintenanceRecords.length}`);
console.log(`Records after duplicate filtering: ${uniqueMaintenanceData.length}`);

if (uniqueMaintenanceData.length === 1) {
  console.log('✅ SUCCESS: Duplicate records correctly filtered out');
  console.log('✅ Only new records will be imported');
  
  console.log('\nRecords to import:');
  uniqueMaintenanceData.forEach(record => {
    console.log(`  - Machine: ${record.machineId}, Date: ${record.date}, Hours: ${record.serviceHours}, Range: ${record.maintenanceRange}`);
  });
} else {
  console.log('❌ ISSUE: Duplicate detection not working correctly');
}

console.log('\n=== Test Completed ===');