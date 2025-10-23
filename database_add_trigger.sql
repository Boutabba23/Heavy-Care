-- Add trigger for timestamp management on monthly_daily_adjustments
CREATE TRIGGER handle_updated_at_monthly_daily_adjustments
    BEFORE UPDATE ON public.monthly_daily_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();