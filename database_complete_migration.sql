-- Complete Migration Script for GestiFiltres Database
-- Run this script in your Supabase SQL Editor to update the database schema

-- Add serial_number and registration_number columns to machines table if they don't exist
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Create indexes for better performance when searching by serial_number and registration_number
CREATE INDEX IF NOT EXISTS idx_machines_serial_number ON public.machines(serial_number);
CREATE INDEX IF NOT EXISTS idx_machines_registration_number ON public.machines(registration_number);

-- First, we need to modify the table to allow NULL machine_id values for unmatched records
-- This requires dropping and recreating the foreign key constraint
ALTER TABLE public.maintenance_records 
DROP CONSTRAINT IF EXISTS maintenance_records_machine_id_fkey;

-- Modify the machine_id column to allow NULL values
ALTER TABLE public.maintenance_records 
ALTER COLUMN machine_id DROP NOT NULL;

-- Update existing records to use valid maintenance range values
-- This is a simplified mapping - you may need to adjust based on your actual data
UPDATE public.maintenance_records 
SET maintenance_range = 'C' 
WHERE maintenance_range LIKE '%2000%' OR maintenance_range LIKE '%2000h%';

UPDATE public.maintenance_records 
SET maintenance_range = 'D' 
WHERE maintenance_range LIKE '%1500%' OR maintenance_range LIKE '%1500h%';

UPDATE public.maintenance_records 
SET maintenance_range = 'E' 
WHERE maintenance_range LIKE '%3000%' OR maintenance_range LIKE '%3000h%';

UPDATE public.maintenance_records 
SET maintenance_range = 'F' 
WHERE maintenance_range LIKE '%4000%' OR maintenance_range LIKE '%4000h%';

-- For any remaining records that don't match, default to 'C'
UPDATE public.maintenance_records 
SET maintenance_range = 'C' 
WHERE maintenance_range NOT IN ('C', 'D', 'E', 'F');

-- Add a comment to indicate that NULL machine_id means unmatched record
COMMENT ON COLUMN public.maintenance_records.machine_id IS 'References machines.id. NULL means the record could not be matched to a machine during import.';