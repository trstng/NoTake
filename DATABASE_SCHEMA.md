# NoTake Database Schema

This document describes the PostgreSQL database schema for NoTake.

**⚠️ This schema has been redesigned to match Kalshi CSV format and FIFO position tracking.**

## Quick Start

### Using Migrations (Recommended)

All schema SQL is now in versioned migration files located in `supabase/migrations/`.

**To set up your database:**

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor**
3. Run each migration file in order:
   - `20250101000001_create_profiles.sql`
   - `20250101000002_create_trades.sql`
   - `20250101000003_create_positions.sql`
   - `20250101000004_create_daily_stats.sql`
   - `20250101000005_create_triggers.sql`

Alternatively, if using Supabase CLI:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

See `supabase/migrations/README.md` for detailed instructions.

---

## Schema Overview

### Tables

#### 1. `profiles`
User profile information linked to Supabase Auth.

**Key Fields:**
- `id` (UUID): Links to auth.users
- `email` (TEXT): User email
- `full_name` (TEXT): Optional full name
- `timezone` (TEXT): User timezone preference

**Migration:** `20250101000001_create_profiles.sql`

---

#### 2. `trades`
Individual trade records matching **Kalshi CSV format**.

**Key Changes from Generic Schema:**
- ✅ `direction`: 'Yes' or 'No' (not 'buy'/'sell')
- ✅ `price_cents`: INTEGER (0-100 cents, not 0-1 decimal)
- ✅ `amount_contracts`: INTEGER (number of contracts)
- ✅ `fee_dollars`: NUMERIC (trading fees)
- ✅ `market_id`: UUID (Kalshi's market identifier)
- ✅ `order_type`: 'Maker' or 'Taker'

**Fields:**
```typescript
{
  id: UUID
  user_id: UUID
  timestamp: TIMESTAMPTZ
  market_ticker: TEXT
  market_id: UUID?
  market_name: TEXT?
  direction: 'Yes' | 'No'
  price_cents: INTEGER (0-100)
  amount_contracts: INTEGER
  fee_dollars: NUMERIC
  order_type: 'Maker' | 'Taker'?
  platform: 'kalshi' | 'polymarket' | 'other'
  tags: TEXT[]?
  notes: TEXT?
}
```

**Indexes:**
- `user_id`, `timestamp DESC`
- `market_ticker`, `market_id`
- Composite: `(user_id, market_ticker, timestamp DESC)`

**Migration:** `20250101000002_create_trades.sql`

---

#### 3. `positions`
Individual position entries for **FIFO tracking** (not aggregated).

**Key Changes:**
- ✅ Each row = ONE position (entry + optional exit)
- ✅ Prices as INTEGER (cents, 0-100)
- ✅ Timestamps as BIGINT (Unix milliseconds)
- ✅ Status: 'open' or 'closed'
- ❌ Removed aggregated fields (avg_entry_price, current_size)

**Fields:**
```typescript
{
  id: UUID
  user_id: UUID
  market_ticker: TEXT
  market_id: UUID?
  direction: 'Yes' | 'No'
  entry_price: INTEGER (cents)
  size: INTEGER
  entry_time: BIGINT (Unix ms)
  exit_price: INTEGER? (cents)
  exit_time: BIGINT? (Unix ms)
  pnl: NUMERIC(10,2)?
  fees: NUMERIC(10,2)
  status: 'open' | 'closed'
  order_id: TEXT?
}
```

**FIFO Logic:**
- Positions are opened when buying/selling
- Opposite direction closes oldest position first (FIFO)
- P&L calculated on close:
  - Long (Yes): `pnl = size * (exit_price - entry_price) - fees`
  - Short (No): `pnl = size * (entry_price - exit_price) - fees`

**Indexes:**
- `user_id`, `status`
- `market_ticker`, `entry_time DESC`
- Composite: `(user_id, market_ticker, status)`

**Migration:** `20250101000003_create_positions.sql`

---

#### 4. `daily_stats`
Daily aggregated statistics for equity curves (unchanged).

**Fields:**
```typescript
{
  id: UUID
  user_id: UUID
  date: DATE
  total_pnl: NUMERIC
  realized_pnl: NUMERIC
  unrealized_pnl: NUMERIC
  total_volume: NUMERIC
  trade_count: INTEGER
  equity: NUMERIC
}
```

**Migration:** `20250101000004_create_daily_stats.sql`

---

### Functions & Triggers

**Auto-create profile on signup:**
```sql
CREATE FUNCTION handle_new_user()
-- Creates profile when user signs up
```

**Auto-update timestamps:**
```sql
CREATE FUNCTION handle_updated_at()
-- Updates updated_at on row changes
```

**Realtime subscriptions enabled for:**
- `trades` - Live trade notifications
- `positions` - Live position updates
- `daily_stats` - Live equity updates

**Migration:** `20250101000005_create_triggers.sql`

---

## Kalshi CSV Format

Your Kalshi CSV exports have these columns:

```csv
type,Market_Ticker,Market_Id,Original_Date,Price_In_Cents,Amount_In_Dollars,Fee_In_Dollars,Traded_Time,Direction,Order_Type
```

**Mapping to `trades` table:**

| CSV Column | DB Column | Transform |
|------------|-----------|-----------|
| `Market_Ticker` | `market_ticker` | Direct |
| `Market_Id` | `market_id` | UUID |
| `Original_Date` | `timestamp` | ISO8601 → TIMESTAMPTZ |
| `Price_In_Cents` | `price_cents` | INTEGER (0-100) |
| `Amount_In_Dollars` | `amount_contracts` | Remove commas, convert to INT |
| `Fee_In_Dollars` | `fee_dollars` | Remove commas, NUMERIC |
| `Direction` | `direction` | 'Yes' or 'No' |
| `Order_Type` | `order_type` | 'Maker' or 'Taker' |

---

## FIFO Position Tracking

The `positions` table implements First-In-First-Out tracking:

### Example Flow

**Trade 1:** Buy 100 Yes @ 50¢
```sql
INSERT INTO positions (
  direction = 'Yes',
  entry_price = 50,
  size = 100,
  status = 'open'
)
```

**Trade 2:** Buy 50 Yes @ 60¢
```sql
INSERT INTO positions (
  direction = 'Yes',
  entry_price = 60,
  size = 50,
  status = 'open'
)
```

**Trade 3:** Sell 75 No @ 70¢ (closes oldest 75 of Yes position)
```sql
-- Close first 75 from Trade 1
UPDATE positions SET
  exit_price = 70,
  exit_time = now_ms,
  pnl = 75 * (70 - 50) / 100 - fees,  -- $15 - fees
  status = 'closed'
WHERE id = position_from_trade_1;

-- Remaining 25 from Trade 1 stays open
INSERT INTO positions (
  direction = 'Yes',
  entry_price = 50,
  size = 25,
  status = 'open'
)
```

See `trades_parse_upsert.py` for Python implementation reference.

---

## Setup Instructions

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Wait for initialization (~2 minutes)

### 2. Run Migrations
- Navigate to **SQL Editor** in dashboard
- Run each file in `supabase/migrations/` in order
- Or use Supabase CLI: `supabase db push`

### 3. Configure Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Enable Email Auth
- Go to **Authentication > Providers**
- Enable **Email** provider
- Save

### 5. Verify Setup
```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## TypeScript Types

All types are defined in `lib/database.types.ts` and match the schema exactly.

```typescript
import type { Trade, Position, DailyStat } from '@/lib/database.types'

// Use these types for type-safe database operations
const trade: Trade = { ... }
```

---

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 20250101000001 | 2025-01-01 | Create profiles table |
| 20250101000002 | 2025-01-01 | Create trades table (Kalshi format) |
| 20250101000003 | 2025-01-01 | Create positions table (FIFO) |
| 20250101000004 | 2025-01-01 | Create daily_stats table |
| 20250101000005 | 2025-01-01 | Create triggers and functions |

---

## Additional Resources

- **Migration Files:** `supabase/migrations/`
- **TypeScript Types:** `lib/database.types.ts`
- **FIFO Logic Reference:** `trades_parse_upsert.py`
- **CSV Example:** `Kalshi-Recent-Activity-Trade (11).csv`

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Check `supabase/migrations/README.md` for detailed setup
