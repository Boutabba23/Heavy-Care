# Maintenance Import Troubleshooting Guide

This guide helps you resolve common issues when importing maintenance records into the GestiFiltres application.

## Common Issues and Solutions

### 1. "Aucun enregistrement de maintenance à importer" (No maintenance records to import)

This error typically occurs when:

1. **Invalid Date Formats**: The import process filters out records with invalid dates.

   - **Solution**: Ensure all dates are in one of these formats:
     - `AAAA-MM-JJ` (e.g., `2024-01-15`)
     - `JJ/MM/AAAA` (e.g., `15/01/2024`)

2. **Missing Required Fields**: Maintenance records require at least:

   - Gamme (maintenance range: C, D, E, or F)
   - Date (in valid format)
   - Service hours (numeric value)

3. **File Format Issues**: The system might not correctly detect your file type.
   - **Solution**: Ensure your file is a proper Excel (.xlsx) or CSV file

### 2. Records Not Matching to Machines

Maintenance records are linked to machines using the "designation" field. If records aren't linking to machines:

1. **Check Designation Names**: Ensure the designation in your maintenance records exactly matches (case-insensitive) the designation in your machine records.

2. **Partial Matching**: The system tries partial matching, but exact matches work best.

### 3. Invalid Maintenance Range Values

Only these values are accepted for maintenance ranges:

- C, D, E, F (case-insensitive)

If your file contains values like "Gamme C" or "Maintenance D", the system will extract the letter, but it's better to use just the letter.

## Best Practices for Maintenance Import Files

### Excel File Structure

1. **Header Row**: Place your column headers in the first row
2. **Column Names**: Use clear column names like:
   - `Gamme éxecutée` or `Gamme` for maintenance range
   - `Date` or `Date De Gamme` for date
   - `Heures de Service` or `Heures` for service hours
   - `DESIGNATION` or `designation` for machine designation

### Date Formatting

Always use one of these formats:

- `2024-01-15` (ISO format - preferred)
- `15/01/2024` (French format)

Avoid formats like:

- `01-15-2024` (US format)
- `January 15, 2024` (Text format)
- `15.01.2024` (Period separator)

### Sample Maintenance Import File

| Gamme éxecutée | Date       | Heures de Service | DESIGNATION      |
| -------------- | ---------- | ----------------- | ---------------- |
| C              | 2024-01-15 | 1250              | Excavatrice 320D |
| D              | 2024-02-20 | 1500              | Bulldozer D8R    |
| E              | 2024-03-25 | 2000              | Chargeur 980H    |

## Troubleshooting Steps

1. **Check the Import Preview**: Before importing, review the preview in the import modal to ensure data is correctly parsed.

2. **Look for Error Messages**: The import modal shows specific error messages for rows that fail validation.

3. **Verify File Format**: Ensure your file is a proper Excel (.xlsx) or CSV file, not a different format saved with these extensions.

4. **Test with Sample Data**: Try importing just a few rows first to verify the process works.

5. **Check Console Logs**: Open browser developer tools (F12) and check the console for detailed error messages.

## Contact Support

If you continue to experience issues:

1. Take a screenshot of the import modal showing any error messages
2. Export a small sample of your data (remove any sensitive information)
3. Contact support with these files and a description of the issue

## Recent Improvements

The import system has been enhanced to:

- Better handle French date formats
- Provide more specific error messages for date format issues
- Improve machine matching logic
- Handle mixed content Excel files more effectively
