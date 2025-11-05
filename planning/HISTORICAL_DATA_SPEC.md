# Historical Data Implementation Specification

Detailed technical specification for implementing historical price data infrastructure.

---

## Overview

Historical price data enables:
1. **Visual trade annotations** - Entry/exit arrows on price charts
2. **MFE/MAE calculations** - Maximum favorable/adverse excursion
3. **Better insights** - See exact market conditions during trades
4. **Trade replay** - Review what happened during a position

---

## Database Schema

### Table: `historical_prices`

```sql
CREATE TABLE historical_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market identification
  market_ticker TEXT NOT NULL,           -- e.g., "KXNHLGAME-25OCT30NJSJ-NJ"
  market_id UUID,                        -- Kalshi market UUID (nullable for Polymarket)
  market_name TEXT,                      -- Full market name
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),

  -- Price data
  timestamp TIMESTAMPTZ NOT NULL,        -- When this price was recorded
  yes_price NUMERIC(5,2),                -- Price of Yes outcome (0-100 cents)
  no_price NUMERIC(5,2),                 -- Price of No outcome (0-100 cents)

  -- Volume data (optional)
  volume NUMERIC(12,2),                  -- Trading volume at this timestamp
  open_interest INTEGER,                 -- Open contracts

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,                           -- 'api', 'manual', 'scrape', etc.

  CONSTRAINT valid_prices CHECK (
    (yes_price IS NULL OR (yes_price >= 0 AND yes_price <= 100)) AND
    (no_price IS NULL OR (no_price >= 0 AND no_price <= 100))
  )
);

-- Indexes for fast queries
CREATE INDEX idx_historical_prices_market ON historical_prices(market_ticker, platform, timestamp DESC);
CREATE INDEX idx_historical_prices_timestamp ON historical_prices(timestamp DESC);
CREATE INDEX idx_historical_prices_platform ON historical_prices(platform);

-- Composite index for common query pattern
CREATE INDEX idx_historical_prices_lookup ON historical_prices(platform, market_ticker, timestamp);

COMMENT ON TABLE historical_prices IS 'Historical price data for prediction markets';
```

### Notes on Schema:
- **Timestamps**: Store in UTC, convert to user timezone in UI
- **Prices**: Store in cents (0-100) to match trades table
- **Platform**: Denormalized for faster queries
- **market_ticker**: Primary lookup key (more stable than market_id)

---

## API Endpoints

### 1. Bulk Upload (Admin/Data Ingestion)

```typescript
POST /api/prices/bulk

Headers:
  Authorization: Bearer <api_key>
  Content-Type: application/json

Body:
{
  "platform": "kalshi" | "polymarket",
  "data": [
    {
      "market_ticker": "KXNHLGAME-25OCT30NJSJ-NJ",
      "timestamp": "2025-10-30T23:00:00Z",
      "yes_price": 45.5,
      "no_price": 54.5,
      "volume": 1250.00
    },
    // ... more entries
  ]
}

Response:
{
  "success": true,
  "inserted": 1000,
  "duplicates": 50,
  "errors": []
}
```

### 2. Query Historical Prices

```typescript
GET /api/prices/:platform/:market_ticker

Query Params:
  ?start=2025-10-30T00:00:00Z
  &end=2025-10-31T00:00:00Z
  &interval=5m  // Optional: 1m, 5m, 15m, 1h, 1d

Response:
{
  "market_ticker": "KXNHLGAME-25OCT30NJSJ-NJ",
  "platform": "kalshi",
  "data": [
    {
      "timestamp": "2025-10-30T23:00:00Z",
      "yes_price": 45.5,
      "no_price": 54.5,
      "volume": 1250.00
    },
    // ... more entries
  ],
  "count": 288,
  "coverage": 95.5  // % of time period with data
}
```

### 3. Market Price Summary

```typescript
GET /api/prices/:platform/:market_ticker/summary

Response:
{
  "market_ticker": "KXNHLGAME-25OCT30NJSJ-NJ",
  "first_price": {
    "timestamp": "2025-10-20T10:00:00Z",
    "yes_price": 50.0
  },
  "last_price": {
    "timestamp": "2025-10-31T03:00:00Z",
    "yes_price": 4.0
  },
  "data_points": 5000,
  "time_span_hours": 264,
  "has_sufficient_data": true
}
```

---

## Data Sources

### Option 1: Your Personal Database
**Pros**: Full control, no API limits, historical data you've tracked
**Cons**: Limited to markets you've tracked, manual maintenance

**Implementation**:
```typescript
// Query your existing DB
const prices = await yourDB.query(`
  SELECT * FROM your_historical_table
  WHERE market = ? AND timestamp BETWEEN ? AND ?
`)

// Transform to standard format
const normalized = prices.map(normalizeToStandardFormat)

// Insert into historical_prices table
await supabase.from('historical_prices').insert(normalized)
```

### Option 2: Kalshi API
**Research needed**: Check if Kalshi provides historical OHLC data

```typescript
// Pseudo-code
const kalshiHistorical = await fetch(
  `https://api.kalshi.com/v1/markets/${marketId}/history?start=${start}&end=${end}`
)
```

### Option 3: Polymarket Subgraph
**Use The Graph** to query historical data from blockchain

```graphql
query HistoricalPrices($market: String!, $start: Int!, $end: Int!) {
  trades(
    where: { market: $market, timestamp_gte: $start, timestamp_lte: $end }
    orderBy: timestamp
  ) {
    timestamp
    outcomeIndex
    price
    amount
  }
}
```

### Option 4: Scraping (Last Resort)
- Use Puppeteer/Playwright to scrape price charts
- Only if APIs unavailable
- Rate limit aggressively
- Respect ToS

---

## MFE/MAE Calculation Algorithm

```typescript
interface MFEMAEResult {
  mfe: number         // Maximum Favorable Excursion
  mae: number         // Maximum Adverse Excursion
  mfe_time: string    // When MFE occurred
  mae_time: string    // When MAE occurred
  mfe_percent: number // MFE as % of entry price
  mae_percent: number // MAE as % of entry price
}

async function calculateMFEMAE(
  position: Position,
  historicalPrices: HistoricalPrice[]
): Promise<MFEMAEResult> {

  const entryPrice = position.entry_price  // in cents
  const direction = position.direction     // 'Yes' or 'No'

  let mfe = 0
  let mae = 0
  let mfeTime = null
  let maeTime = null

  for (const price of historicalPrices) {
    const currentPrice = direction === 'Yes' ? price.yes_price : price.no_price

    // Calculate unrealized P&L at this point
    const unrealizedPnL = position.size * (currentPrice - entryPrice) / 100

    // Track maximum favorable (profit)
    if (unrealizedPnL > mfe) {
      mfe = unrealizedPnL
      mfeTime = price.timestamp
    }

    // Track maximum adverse (loss)
    if (unrealizedPnL < mae) {
      mae = unrealizedPnL
      maeTime = price.timestamp
    }
  }

  return {
    mfe,
    mae: Math.abs(mae),  // Return as positive number
    mfe_time: mfeTime,
    mae_time: maeTime,
    mfe_percent: (mfe / (position.size * entryPrice / 100)) * 100,
    mae_percent: (Math.abs(mae) / (position.size * entryPrice / 100)) * 100
  }
}
```

---

## Chart Implementation

### Entry/Exit Arrows on Price Chart

```typescript
import { LineChart, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const PriceChartWithTrades = ({ historicalData, userTrades }) => {
  // Prepare entry/exit points
  const entryPoints = userTrades.map(t => ({
    timestamp: t.entry_time,
    price: t.entry_price,
    type: 'entry',
    direction: t.direction
  }))

  const exitPoints = userTrades.map(t => ({
    timestamp: t.exit_time,
    price: t.exit_price,
    type: 'exit',
    pnl: t.pnl
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={historicalData}>
        <XAxis dataKey="timestamp" />
        <YAxis domain={[0, 100]} />
        <Tooltip />

        {/* Price line */}
        <Line type="monotone" dataKey="yes_price" stroke="#8884d8" />

        {/* Entry markers */}
        <Scatter
          data={entryPoints}
          fill="green"
          shape={<ArrowUp />}
        />

        {/* Exit markers */}
        <Scatter
          data={exitPoints}
          fill="red"
          shape={<ArrowDown />}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## Caching Strategy

### Redis Cache Structure
```
Key: `prices:{platform}:{market_ticker}:{start}:{end}`
Value: JSON array of prices
TTL: 24 hours (historical data doesn't change)

Example:
prices:kalshi:KXNHLGAME-25OCT30NJSJ-NJ:2025-10-30:2025-10-31
```

### Cache Invalidation
- Historical data: Cache aggressively (24h+)
- Recent data (<24h old): Cache 5-10 minutes
- Live/current prices: No cache or 30 seconds

---

## Data Backfill Strategy

### Phase 1: Immediate Markets
1. Identify all markets in user trades
2. Check which have historical data
3. Backfill missing data starting with most recent

### Phase 2: Popular Markets
1. Find markets with most trades across all users
2. Prioritize backfill for these markets
3. Benefits entire user base

### Phase 3: Continuous Updates
1. Set up scheduled job to fetch daily prices
2. For active markets, fetch hourly
3. For closed markets, mark as complete

```typescript
// Pseudo-code for backfill job
async function backfillMarket(marketTicker: string, platform: string) {
  const trades = await getTradesForMarket(marketTicker)
  const earliestTrade = Math.min(...trades.map(t => t.entry_time))
  const latestTrade = Math.max(...trades.map(t => t.exit_time))

  const prices = await fetchHistoricalPrices(
    platform,
    marketTicker,
    earliestTrade,
    latestTrade
  )

  await insertHistoricalPrices(prices)

  // Calculate MFE/MAE for all trades in this market
  for (const trade of trades) {
    const mfeMae = await calculateMFEMAE(trade, prices)
    await updatePositionMetrics(trade.id, mfeMae)
  }
}
```

---

## Performance Considerations

### Query Optimization
- **Always use indexes**: Never full table scan
- **Limit results**: Default to 1000 data points max
- **Aggregate on DB**: Use PostgreSQL window functions
- **Time-based partitioning**: If table grows >10M rows

### Example Optimized Query
```sql
-- Get hourly prices for a market (downsample from minute data)
SELECT
  date_trunc('hour', timestamp) as hour,
  platform,
  market_ticker,
  AVG(yes_price) as avg_yes_price,
  MAX(yes_price) as high_yes_price,
  MIN(yes_price) as low_yes_price,
  FIRST_VALUE(yes_price) OVER (
    PARTITION BY date_trunc('hour', timestamp)
    ORDER BY timestamp
  ) as open_yes_price,
  SUM(volume) as total_volume
FROM historical_prices
WHERE market_ticker = 'KXNHLGAME-25OCT30NJSJ-NJ'
  AND platform = 'kalshi'
  AND timestamp BETWEEN '2025-10-30' AND '2025-10-31'
GROUP BY date_trunc('hour', timestamp), platform, market_ticker
ORDER BY hour;
```

---

## Testing Plan

### Unit Tests
- [ ] Test MFE/MAE calculation with known data
- [ ] Test price normalization functions
- [ ] Test date range queries

### Integration Tests
- [ ] Test bulk upload API
- [ ] Test price query API with various parameters
- [ ] Test cache hit/miss scenarios

### Data Quality Tests
- [ ] Verify no duplicate timestamps per market
- [ ] Check price bounds (0-100)
- [ ] Validate Yes + No ≈ 100 (market efficiency)

---

## Success Metrics

- **Coverage**: % of trades with historical data available
- **Performance**: Query response time <500ms
- **Accuracy**: MFE/MAE calculations match manual verification
- **Usage**: % of users viewing annotated charts

---

*Last Updated: November 5, 2025*
