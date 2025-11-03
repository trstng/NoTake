# Supabase Migrations

This folder contains SQL migrations for the NoTake database schema.

## Running Migrations

### Option 1: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 2: Manual Execution
1. Go to your Supabase Dashboard → SQL Editor
2. Run each migration file in order (by timestamp)
3. Check the results and verify tables are created

## Migration Files

Migrations are numbered by timestamp for proper ordering:

1. `20250101000001_create_profiles.sql` - User profiles table
2. `20250101000002_create_trades.sql` - Individual trade records
3. `20250101000003_create_positions.sql` - FIFO position tracking
4. `20250101000004_create_daily_stats.sql` - Daily aggregated stats
5. `20250101000005_create_triggers.sql` - Database triggers and functions

## Schema Overview

### `profiles`
User profile information linked to Supabase Auth.

### `trades`
Individual trade records matching Kalshi CSV format:
- Prices stored as INTEGER (cents)
- Direction: 'Yes' or 'No'
- Includes market_id, order_type
- Timestamps in ISO8601

### `positions`
Individual position entries for FIFO tracking:
- Each row = one position (entry + optional exit)
- Prices as INTEGER (cents)
- Timestamps as BIGINT (Unix milliseconds)
- Status: 'open' or 'closed'

### `daily_stats`
Daily aggregated statistics for equity curves and analytics.

## Important Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Timestamps use UTC timezone
- Prices for Kalshi stored in cents (INTEGER)
- Migration files are idempotent (safe to run multiple times)
