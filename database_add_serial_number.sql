-- Migration script to add serial_number and registration_number columns to machines table
-- Run this in Supabase SQL Editor after the initial setup

-- Add serial_number and registration_number columns to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Create index for better performance when searching by serial_number
CREATE INDEX IF NOT EXISTS idx_machines_serial_number ON public.machines(serial_number);

-- Create index for better performance when searching by registration_number
CREATE INDEX IF NOT EXISTS idx_machines_registration_number ON public.machines(registration_number);