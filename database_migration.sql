-- Migration script to add filter_type column to filter_groups table
-- Run this in Supabase SQL Editor after the initial setup

-- Add filter_type column to filter_groups table
ALTER TABLE public.filter_groups 
ADD COLUMN IF NOT EXISTS filter_type TEXT;

-- Create index for better performance when filtering by filter_type
CREATE INDEX IF NOT EXISTS idx_filter_groups_filter_type ON public.filter_groups(filter_type);

-- Update existing filter groups with appropriate filter types based on sample data
-- You can modify these based on your actual data
UPDATE public.filter_groups 
SET filter_type = 'ft-oil' 
WHERE name LIKE '%huile%' OR name LIKE '%oil%';

UPDATE public.filter_groups 
SET filter_type = 'ft-air' 
WHERE name LIKE '%air%';

UPDATE public.filter_groups 
SET filter_type = 'ft-fuel' 
WHERE name LIKE '%carburant%' OR name LIKE '%fuel%';

UPDATE public.filter_groups 
SET filter_type = 'ft-hydraulic' 
WHERE name LIKE '%hydraulique%' OR name LIKE '%hydraulic%';

UPDATE public.filter_groups 
SET filter_type = 'ft-transmission' 
WHERE name LIKE '%transmission%';

-- For the sample data, let's set specific filter types
UPDATE public.filter_groups SET filter_type = 'ft-oil' WHERE id = 'fg-001';
UPDATE public.filter_groups SET filter_type = 'ft-oil' WHERE id = 'fg-002'; 
UPDATE public.filter_groups SET filter_type = 'ft-air' WHERE id = 'fg-003';
UPDATE public.filter_groups SET filter_type = 'ft-hydraulic' WHERE id = 'fg-004';

-- Add sample filter groups for missing filter types if they don't exist
INSERT INTO public.filter_groups (id, name, filter_type, original_reference_id, "references") VALUES 
    ('fg-005', 'Filtres à Carburant CAT', 'ft-fuel', 'CAT-FUEL-001', '[
        {"id": "CAT-FUEL-001", "reference": "CAT-326-1641", "manufacturer": "Caterpillar", "stock": 30, "price": 28.75},
        {"id": "ALT-FUEL-001", "reference": "ALT-FUEL-001", "manufacturer": "Aftermarket", "stock": 20, "price": 22.50}
    ]'),
    ('fg-006', 'Filtres à Carburant Komatsu', 'ft-fuel', 'KOM-FUEL-001', '[
        {"id": "KOM-FUEL-001", "reference": "KOM-600-319-3610", "manufacturer": "Komatsu", "stock": 15, "price": 32.00},
        {"id": "KOM-FUEL-ALT", "reference": "KOM-FUEL-ALT", "manufacturer": "Aftermarket", "stock": 25, "price": 24.75}
    ]'),
    ('fg-007', 'Filtres de Transmission CAT', 'ft-transmission', 'CAT-TRANS-001', '[
        {"id": "CAT-TRANS-001", "reference": "CAT-126-2081", "manufacturer": "Caterpillar", "stock": 12, "price": 85.50},
        {"id": "ALT-TRANS-001", "reference": "ALT-TRANS-001", "manufacturer": "Aftermarket", "stock": 8, "price": 68.25}
    ]')
ON CONFLICT (id) DO NOTHING;