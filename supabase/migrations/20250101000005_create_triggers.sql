-- Migration: Create triggers and functions
-- Description: Database triggers for automation
-- Created: 2025-01-01

-- ============================================================================
-- Function: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger: Create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile when a new user signs up';

-- ============================================================================
-- Function: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Update updated_at on profiles
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update updated_at on positions
DROP TRIGGER IF EXISTS handle_positions_updated_at ON public.positions;
CREATE TRIGGER handle_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update updated_at on daily_stats
DROP TRIGGER IF EXISTS handle_daily_stats_updated_at ON public.daily_stats;
CREATE TRIGGER handle_daily_stats_updated_at
  BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON FUNCTION public.handle_updated_at IS 'Automatically updates the updated_at timestamp on row modification';

-- ============================================================================
-- Enable Realtime for selected tables
-- ============================================================================

-- Enable realtime for trades (live trade notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Enable realtime for positions (live position updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;

-- Enable realtime for daily_stats (live equity updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_stats;

-- Rollback instructions:
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.trades;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.positions;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.daily_stats;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
-- DROP TRIGGER IF EXISTS handle_positions_updated_at ON public.positions;
-- DROP TRIGGER IF EXISTS handle_daily_stats_updated_at ON public.daily_stats;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS public.handle_updated_at();
