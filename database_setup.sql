-- GestiFiltres Database Schema Setup
-- Run this script in your Supabase SQL Editor to create all required tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create machines table
CREATE TABLE IF NOT EXISTS public.machines (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    designation TEXT NOT NULL,
    marque TEXT NOT NULL,
    type TEXT NOT NULL,
    serial_number TEXT,
    registration_number TEXT,
    service_hours INTEGER NOT NULL DEFAULT 0,
    assigned_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create filter_types table
CREATE TABLE IF NOT EXISTS public.filter_types (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create filter_groups table
CREATE TABLE IF NOT EXISTS public.filter_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    filter_type TEXT,
    original_reference_id TEXT,
    "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT REFERENCES public.machines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    service_hours INTEGER NOT NULL,
    maintenance_range TEXT NOT NULL CHECK (maintenance_range IN ('C', 'D', 'E', 'F')),
    filters_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_code ON public.machines(code);
CREATE INDEX IF NOT EXISTS idx_machines_marque ON public.machines(marque);
CREATE INDEX IF NOT EXISTS idx_machines_serial_number ON public.machines(serial_number);
CREATE INDEX IF NOT EXISTS idx_machines_registration_number ON public.machines(registration_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_machine_id ON public.maintenance_records(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON public.maintenance_records(date);
CREATE INDEX IF NOT EXISTS idx_filter_groups_name ON public.filter_groups(name);
CREATE INDEX IF NOT EXISTS idx_filter_groups_filter_type ON public.filter_groups(filter_type);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER handle_updated_at_machines
    BEFORE UPDATE ON public.machines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_filter_types
    BEFORE UPDATE ON public.filter_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_filter_groups
    BEFORE UPDATE ON public.filter_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_maintenance_records
    BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Machines policies
CREATE POLICY "Users can view all machines" ON public.machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert machines" ON public.machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update machines" ON public.machines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete machines" ON public.machines FOR DELETE TO authenticated USING (true);

-- Filter types policies
CREATE POLICY "Users can view all filter_types" ON public.filter_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert filter_types" ON public.filter_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update filter_types" ON public.filter_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete filter_types" ON public.filter_types FOR DELETE TO authenticated USING (true);

-- Filter groups policies
CREATE POLICY "Users can view all filter_groups" ON public.filter_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert filter_groups" ON public.filter_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update filter_groups" ON public.filter_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete filter_groups" ON public.filter_groups FOR DELETE TO authenticated USING (true);

-- Maintenance records policies
CREATE POLICY "Users can view all maintenance_records" ON public.maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert maintenance_records" ON public.maintenance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update maintenance_records" ON public.maintenance_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete maintenance_records" ON public.maintenance_records FOR DELETE TO authenticated USING (true);

-- Insert sample data for testing
-- Sample filter types
INSERT INTO public.filter_types (id, name) VALUES 
    ('ft-oil', 'Filtre à huile'),
    ('ft-air', 'Filtre à air'),
    ('ft-fuel', 'Filtre à carburant'),
    ('ft-hydraulic', 'Filtre hydraulique'),
    ('ft-transmission', 'Filtre de transmission')
ON CONFLICT (name) DO NOTHING;

-- Sample machines
INSERT INTO public.machines (id, code, designation, marque, type, service_hours, assigned_filters) VALUES 
    ('m-001', 'CAT001', 'Excavatrice CAT 320D', 'Caterpillar', 'Excavatrice', 2500, '[]'),
    ('m-002', 'KOM002', 'Bulldozer Komatsu D65', 'Komatsu', 'Bulldozer', 1800, '[]'),
    ('m-003', 'VOL003', 'Chargeuse Volvo L120', 'Volvo', 'Chargeuse', 3200, '[]')
ON CONFLICT (id) DO NOTHING;

-- Sample filter groups
INSERT INTO public.filter_groups (id, name, filter_type, original_reference_id, "references") VALUES 
    ('fg-001', 'Kit Filtres CAT 320D', 'ft-oil', 'CAT-1R-0750', '[
        {"id": "CAT-1R-0750", "reference": "CAT-1R-0750", "manufacturer": "Caterpillar", "stock": 25, "price": 45.50},
        {"id": "CAT-110-6326", "reference": "CAT-110-6326", "manufacturer": "Caterpillar", "stock": 15, "price": 32.00}
    ]'),
    ('fg-002', 'Kit Filtres Komatsu D65', 'ft-oil', 'KOM-600-211-1340', '[
        {"id": "KOM-600-211-1340", "reference": "KOM-600-211-1340", "manufacturer": "Komatsu", "stock": 18, "price": 42.00},
        {"id": "KOM-ALT-001", "reference": "KOM-ALT-001", "manufacturer": "Aftermarket", "stock": 12, "price": 35.50}
    ]'),
    ('fg-003', 'Filtres à Air CAT', 'ft-air', 'CAT-AIR-001', '[
        {"id": "CAT-AIR-001", "reference": "CAT-AIR-001", "manufacturer": "Caterpillar", "stock": 22, "price": 48.25},
        {"id": "ALT-AIR-001", "reference": "ALT-AIR-001", "manufacturer": "Aftermarket", "stock": 16, "price": 38.00}
    ]'),
    ('fg-004', 'Filtres Hydrauliques Volvo', 'ft-hydraulic', 'VOL-HYD-001', '[
        {"id": "VOL-HYD-001", "reference": "VOL-HYD-001", "manufacturer": "Volvo", "stock": 10, "price": 72.50},
        {"id": "ALT-HYD-001", "reference": "ALT-HYD-001", "manufacturer": "Aftermarket", "stock": 8, "price": 65.00}
    ]'),
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

-- Sample maintenance records
INSERT INTO public.maintenance_records (id, machine_id, date, service_hours, maintenance_range, filters_used) VALUES 
    ('mr-001', 'm-001', '2024-01-15', 2000, 'C', '[
        {"filterTypeId": "ft-oil", "reference": "CAT-1R-0750", "quantity": 1},
        {"filterTypeId": "ft-air", "reference": "CAT-110-6326", "quantity": 1}
    ]'),
    ('mr-002', 'm-002', '2024-02-10', 1500, 'D', '[
        {"filterTypeId": "ft-oil", "reference": "KOM-600-211-1340", "quantity": 1},
        {"filterTypeId": "ft-hydraulic", "reference": "KOM-07063-01242", "quantity": 2}
    ]'),
    ('mr-003', 'm-003', '2024-03-05', 3000, 'E', '[
        {"filterTypeId": "ft-oil", "reference": "VOL-11110683", "quantity": 1},
        {"filterTypeId": "ft-transmission", "reference": "VOL-11037556", "quantity": 1}
    ]')
ON CONFLICT (id) DO NOTHING;