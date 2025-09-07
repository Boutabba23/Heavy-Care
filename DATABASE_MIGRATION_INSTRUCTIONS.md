# Database Migration Instructions

This document provides instructions on how to apply the necessary database migrations to fix the issues with the GestiFiltres application.

## Issues Fixed

1. **Missing serial_number and registration_number columns** in the machines table
2. **Maintenance records with invalid maintenance_range values**
3. **NULL machine_id handling** for unmatched maintenance records

## Migration Files

There are two migration scripts available:

1. `database_add_serial_number.sql` - Adds the missing serial_number and registration_number columns to the machines table
2. `database_complete_migration.sql` - Complete migration that includes both the column additions and maintenance_range fixes

## How to Apply Migrations

### Method 1: Using Supabase SQL Editor (Recommended)

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to the SQL Editor section
4. Copy and paste the contents of `database_complete_migration.sql` into the editor
5. Click "Run" to execute the migration

### Method 2: Running Individual Scripts

If you prefer to run the migrations separately:

1. First, run `database_add_serial_number.sql` to add the missing columns
2. Then, run `database_maintenance_range_fix.sql` to fix the maintenance range values

## Verification

After applying the migrations, you can verify that the changes were successful by:

1. Checking that the machines table now has `serial_number` and `registration_number` columns
2. Confirming that maintenance records have valid maintenance_range values (C, D, E, or F)
3. Testing machine imports to ensure they work correctly with the new columns

## Troubleshooting

If you encounter any issues:

1. Make sure you're using the correct Supabase project URL and credentials
2. Check that you have the necessary permissions to modify the database schema
3. Verify that the migration scripts are compatible with your current database version

If problems persist, you may need to:

1. Manually add the columns using the Supabase Table Editor
2. Contact Supabase support for assistance with database modifications
