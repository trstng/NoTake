-- Migration: Create positions table
-- Description: Individual position entries for FIFO tracking
-- Created: 2025-01-01

-- Create positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Market identifiers
  market_ticker TEXT NOT NULL,
  market_id UUID,
  market_name TEXT,

  -- Position details
  direction TEXT NOT NULL CHECK (direction IN ('Yes', 'No')),
  entry_price INTEGER NOT NULL CHECK (entry_price >= 0 AND entry_price <= 100),
  size INTEGER NOT NULL CHECK (size > 0),
  entry_time BIGINT NOT NULL,

  -- Exit details (nullable for open positions)
  exit_price INTEGER CHECK (exit_price >= 0 AND exit_price <= 100),
  exit_time BIGINT,

  -- P&L tracking
  pnl NUMERIC(10, 2),
  fees NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),

  -- Metadata
  order_id TEXT,
  platform TEXT NOT NULL DEFAULT 'kalshi' CHECK (platform IN ('kalshi', 'polymarket', 'other'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_ticker ON public.positions(market_ticker);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON public.positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON public.positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_entry_time ON public.positions(entry_time DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_positions_user_status ON public.positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_user_market ON public.positions(user_id, market_ticker, status);

-- Enable Row Level Security
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own positions"
  ON public.positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON public.positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON public.positions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions"
  ON public.positions FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.positions IS 'Individual position entries for FIFO tracking';
COMMENT ON COLUMN public.positions.direction IS 'Position direction: Yes (long) or No (short)';
COMMENT ON COLUMN public.positions.entry_price IS 'Entry price in cents (0-100)';
COMMENT ON COLUMN public.positions.size IS 'Number of contracts in position';
COMMENT ON COLUMN public.positions.entry_time IS 'Entry timestamp in Unix milliseconds';
COMMENT ON COLUMN public.positions.exit_price IS 'Exit price in cents (NULL for open positions)';
COMMENT ON COLUMN public.positions.exit_time IS 'Exit timestamp in Unix milliseconds (NULL for open)';
COMMENT ON COLUMN public.positions.pnl IS 'Realized P&L in dollars (NULL for open positions)';
COMMENT ON COLUMN public.positions.fees IS 'Total fees for this position';
COMMENT ON COLUMN public.positions.status IS 'Position status: open or closed';

-- Rollback instructions:
-- DROP TABLE IF EXISTS public.positions CASCADE;
