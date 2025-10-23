-- Create monthly_daily_adjustments table to persist manual per-day adjustments
CREATE TABLE IF NOT EXISTS public.monthly_daily_adjustments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT REFERENCES public.machines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    downtime_hours INTEGER NOT NULL DEFAULT 0,
    panne_hours INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for monthly/daily adjustments
CREATE INDEX IF NOT EXISTS idx_monthly_daily_adjustments_machine_id ON public.monthly_daily_adjustments(machine_id);
CREATE INDEX IF NOT EXISTS idx_monthly_daily_adjustments_date ON public.monthly_daily_adjustments(date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.monthly_daily_adjustments ENABLE ROW LEVEL SECURITY;

-- Monthly / Daily adjustments policies
CREATE POLICY "Users can view all monthly_daily_adjustments" ON public.monthly_daily_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert monthly_daily_adjustments" ON public.monthly_daily_adjustments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update monthly_daily_adjustments" ON public.monthly_daily_adjustments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete monthly_daily_adjustments" ON public.monthly_daily_adjustments FOR DELETE TO authenticated USING (true);