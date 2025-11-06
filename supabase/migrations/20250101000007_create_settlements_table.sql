-- Create settlements table to store Kalshi settlement data
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  settlement_date TIMESTAMPTZ NOT NULL,
  market_ticker TEXT NOT NULL,
  result TEXT CHECK (result IN ('yes', 'no')),
  profit_dollars DECIMAL(10,2),
  yes_contracts_owned INTEGER DEFAULT 0,
  yes_avg_price_cents DECIMAL(10,2),
  no_contracts_owned INTEGER DEFAULT 0,
  no_avg_price_cents DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_settlements_user_id ON public.settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_user_ticker ON public.settlements(user_id, market_ticker);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.settlements(settlement_date);

-- Create unique constraint to prevent duplicate settlements
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_unique ON public.settlements(user_id, market_ticker, settlement_date);

-- Enable Row Level Security
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own settlements"
  ON public.settlements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settlements"
  ON public.settlements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settlements"
  ON public.settlements
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settlements"
  ON public.settlements
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add settlement tracking columns to positions table
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS settled_by_id UUID REFERENCES public.settlements(id) ON DELETE SET NULL;

ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS settlement_result TEXT CHECK (settlement_result IN ('yes', 'no'));

-- Create index for settlement lookup
CREATE INDEX IF NOT EXISTS idx_positions_settled_by ON public.positions(settled_by_id);

-- Add comment for documentation
COMMENT ON TABLE public.settlements IS 'Stores Kalshi settlement data from CSV imports. Used to close positions and calculate final P&L.';
COMMENT ON COLUMN public.positions.settled_by_id IS 'Links to the settlement that closed this position (if applicable)';
COMMENT ON COLUMN public.positions.settlement_result IS 'Which side won at settlement: yes or no';
