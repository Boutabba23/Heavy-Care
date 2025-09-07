-- Migration script to fix maintenance_range values in maintenance_records table
-- Run this in Supabase SQL Editor to update existing records

-- First, we need to modify the table to allow NULL machine_id values for unmatched records
-- This requires dropping and recreating the foreign key constraint
ALTER TABLE public.maintenance_records 
DROP CONSTRAINT IF EXISTS maintenance_records_machine_id_fkey;

-- Modify the machine_id column to allow NULL values
ALTER TABLE public.maintenance_records 
ALTER COLUMN machine_id DROP NOT NULL;

-- Add constraint to maintenance_range column to ensure valid values
ALTER TABLE public.maintenance_records 
DROP CONSTRAINT IF EXISTS valid_maintenance_range;

ALTER TABLE public.maintenance_records 
ADD CONSTRAINT valid_maintenance_range 
CHECK (maintenance_range IN ('C', 'D', 'E', 'F'));

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