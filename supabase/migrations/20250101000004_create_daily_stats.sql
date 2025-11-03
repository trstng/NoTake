-- Migration: Create daily_stats table
-- Description: Daily aggregated statistics for equity curves
-- Created: 2025-01-01

-- Create daily_stats table
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- P&L tracking
  total_pnl NUMERIC(10, 2) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Volume tracking
  total_volume NUMERIC(12, 2) NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,

  -- Equity tracking
  equity NUMERIC(12, 2) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one row per user per day
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_id ON public.daily_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON public.daily_stats(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own stats"
  ON public.daily_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.daily_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.daily_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stats"
  ON public.daily_stats FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.daily_stats IS 'Daily aggregated statistics for equity curves and analytics';
COMMENT ON COLUMN public.daily_stats.date IS 'Date for this stats snapshot';
COMMENT ON COLUMN public.daily_stats.total_pnl IS 'Total P&L for this day (realized + unrealized)';
COMMENT ON COLUMN public.daily_stats.realized_pnl IS 'Realized P&L from closed positions';
COMMENT ON COLUMN public.daily_stats.unrealized_pnl IS 'Unrealized P&L from open positions';
COMMENT ON COLUMN public.daily_stats.total_volume IS 'Total trading volume in dollars';
COMMENT ON COLUMN public.daily_stats.trade_count IS 'Number of trades executed';
COMMENT ON COLUMN public.daily_stats.equity IS 'Total account equity (cumulative P&L + starting capital)';

-- Rollback instructions:
-- DROP TABLE IF EXISTS public.daily_stats CASCADE;
