-- Add layers column to positions table for FIFO state persistence
-- This allows us to restore Position state across batch processing operations

-- Add layers column to store remaining position layers as JSONB
-- Each layer has: qty, price, fee, timestamp, direction
ALTER TABLE positions ADD COLUMN IF NOT EXISTS layers JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN positions.layers IS 'JSONB array of remaining position layers for open positions. Each layer: {qty, price, fee, timestamp, direction}';

-- Note: Only open positions should have layers
-- Closed positions should have NULL layers since all layers were realized
