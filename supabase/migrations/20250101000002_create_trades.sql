-- Migration: Create trades table
-- Description: Individual trade records matching Kalshi CSV format
-- Created: 2025-01-01

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Trade identifiers
  market_ticker TEXT NOT NULL,
  market_id UUID,
  market_name TEXT,

  -- Trade details (Kalshi format)
  timestamp TIMESTAMPTZ NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Yes', 'No')),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0 AND price_cents <= 100),
  amount_contracts INTEGER NOT NULL CHECK (amount_contracts > 0),
  fee_dollars NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Trade metadata
  order_type TEXT CHECK (order_type IN ('Maker', 'Taker')),
  platform TEXT NOT NULL DEFAULT 'kalshi' CHECK (platform IN ('kalshi', 'polymarket', 'other')),

  -- Optional fields
  tags TEXT[] DEFAULT '{}',
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON public.trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_market_ticker ON public.trades(market_ticker);
CREATE INDEX IF NOT EXISTS idx_trades_market_id ON public.trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_platform ON public.trades(platform);
CREATE INDEX IF NOT EXISTS idx_trades_direction ON public.trades(direction);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_trades_user_market ON public.trades(user_id, market_ticker, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.trades IS 'Individual trade records from prediction markets';
COMMENT ON COLUMN public.trades.market_ticker IS 'Market ticker symbol (e.g., KXNHLGAME-25OCT30NJSJ-NJ)';
COMMENT ON COLUMN public.trades.market_id IS 'Platform-specific market UUID';
COMMENT ON COLUMN public.trades.direction IS 'Trade direction: Yes (long) or No (short)';
COMMENT ON COLUMN public.trades.price_cents IS 'Trade price in cents (0-100)';
COMMENT ON COLUMN public.trades.amount_contracts IS 'Number of contracts traded';
COMMENT ON COLUMN public.trades.fee_dollars IS 'Trading fee in dollars';
COMMENT ON COLUMN public.trades.order_type IS 'Maker (liquidity provider) or Taker (liquidity taker)';

-- Rollback instructions:
-- DROP TABLE IF EXISTS public.trades CASCADE;
