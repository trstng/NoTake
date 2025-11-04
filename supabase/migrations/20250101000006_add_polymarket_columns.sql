-- Migration: Add Polymarket support columns to trades table
-- Description: Add transaction_hash and action columns for full Polymarket CSV data support
-- Created: 2025-01-01

-- Add transaction_hash column for Polymarket blockchain transaction hashes
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS transaction_hash TEXT;

-- Add action column to distinguish Buy vs Sell (important for Polymarket)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('Buy', 'Sell'));

-- Create index on transaction_hash for fast lookups and duplicate detection
CREATE INDEX IF NOT EXISTS idx_trades_transaction_hash ON public.trades(transaction_hash);

-- Comments
COMMENT ON COLUMN public.trades.transaction_hash IS 'Blockchain transaction hash (Polymarket only)';
COMMENT ON COLUMN public.trades.action IS 'Trade action: Buy (open/add position) or Sell (close/reduce position) - primarily for Polymarket';

-- Rollback instructions:
-- ALTER TABLE public.trades DROP COLUMN IF EXISTS transaction_hash;
-- ALTER TABLE public.trades DROP COLUMN IF EXISTS action;
-- DROP INDEX IF EXISTS idx_trades_transaction_hash;
