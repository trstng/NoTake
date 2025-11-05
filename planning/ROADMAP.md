# NoTake Product Roadmap

This document outlines planned features and improvements for the NoTake prediction market analytics platform.

---

## 1. Historical Data Integration & Chart Enhancements

**Goal**: Add historical price data to enable entry/exit visualization on charts and accurate MFE/MAE calculations.

### 1.1 Database & Data Storage

- [ ] Create `historical_prices` table in Supabase
  - [ ] Design schema: `market_id`, `platform`, `timestamp`, `yes_price`, `no_price`, `volume`
  - [ ] Add indexes on `market_id`, `platform`, `timestamp` for fast queries
  - [ ] Create migration file
- [ ] Create API endpoints for price data ingestion
  - [ ] `POST /api/prices/bulk` - Bulk upload historical data
  - [ ] `GET /api/prices/:market_id` - Query historical prices for a market
  - [ ] Add authentication/authorization (API keys for uploads)
- [ ] Build data ingestion pipeline
  - [ ] Script to import your existing historical data
  - [ ] Validation logic for data quality
  - [ ] Handle duplicate prevention

**Complexity**: High | **Dependencies**: None

### 1.2 Historical Data API Integration

- [ ] Research Kalshi historical data availability
  - [ ] Check if Kalshi provides historical price API
  - [ ] Document API endpoints and rate limits
  - [ ] Test data availability for closed markets
- [ ] Research Polymarket historical data availability
  - [ ] Check blockchain/subgraph for historical data
  - [ ] Document query patterns
  - [ ] Test data retrieval
- [ ] Build shared historical data service
  - [ ] Create `/api/historical/:platform/:market_id` endpoint
  - [ ] Implement caching layer (Redis or in-memory)
  - [ ] Add fallback to your personal DB when platform APIs unavailable

**Complexity**: Medium | **Dependencies**: 1.1

### 1.3 Chart Annotations (Entry/Exit Arrows)

- [ ] Update P/L Curve chart component
  - [ ] Add scatter plot layer for entry/exit points
  - [ ] Design arrow markers (entry = green up, exit = red down)
  - [ ] Add tooltips showing trade details on hover
- [ ] Create market-specific price chart component
  - [ ] Line chart showing price over time
  - [ ] Overlay user's trades as annotations
  - [ ] Show entry price as horizontal line during hold period
  - [ ] Display P&L in real-time as price moves
- [ ] Add to Positions detail view
  - [ ] When clicking a position, show chart with annotations
  - [ ] Highlight MFE and MAE points on chart

**Complexity**: Medium | **Dependencies**: 1.2

### 1.4 MFE/MAE Calculation

- [ ] Create MFE/MAE calculation service
  - [ ] Function to calculate MFE: Find highest favorable price during hold
  - [ ] Function to calculate MAE: Find lowest favorable price during hold
  - [ ] Store in `positions` table or separate `position_metrics` table
- [ ] Update position calculation logic
  - [ ] Query historical prices during position entry/exit window
  - [ ] Calculate and store MFE/MAE when closing position
  - [ ] Handle cases where historical data is unavailable
- [ ] Update Analytics Grid component
  - [ ] Replace mock MFE/MAE data with real calculations
  - [ ] Show "N/A" or hide chart when data unavailable
  - [ ] Add tooltip explaining MFE/MAE metrics

**Complexity**: High | **Dependencies**: 1.2, 1.3

### 1.5 Data Availability Indicators

- [ ] Add UI indicators for data availability
  - [ ] Badge showing "X% of trades have historical data"
  - [ ] Gray out MFE/MAE charts when insufficient data
  - [ ] Show progress bar as you backfill data
- [ ] Create admin panel for data management
  - [ ] View which markets have historical data
  - [ ] Manually trigger data fetch/backfill
  - [ ] See data coverage statistics

**Complexity**: Low | **Dependencies**: 1.2, 1.4

---

## 2. Platform Filtering (Kalshi/Polymarket)

**Goal**: Allow users to filter views by trading platform to analyze performance separately.

### 2.1 Database Queries

- [ ] Update dashboard data queries
  - [ ] Add optional `platform` filter parameter
  - [ ] Modify `getDashboardData()` to accept platform filter
  - [ ] Update performance metrics calculation to filter by platform
- [ ] Update trades page queries
  - [ ] Add platform filter to positions query
  - [ ] Update count and aggregations
- [ ] Update analytics queries
  - [ ] Filter daily stats by platform
  - [ ] Calculate platform-specific metrics

**Complexity**: Low | **Dependencies**: None

### 2.2 UI Components - Platform Toggle

- [ ] Create reusable PlatformFilter component
  - [ ] Toggle buttons: "All", "Kalshi", "Polymarket"
  - [ ] State management (URL params or context)
  - [ ] Styled to match existing UI
- [ ] Add to Dashboard page
  - [ ] Place in header near page title
  - [ ] Update all data fetching to respect filter
  - [ ] Persist selection in URL params
- [ ] Add to Trades page
  - [ ] Filter positions table by platform
  - [ ] Update stats cards
- [ ] Add to Analytics page (when created)
  - [ ] Filter all charts and metrics

**Complexity**: Low | **Dependencies**: 2.1

### 2.3 Performance Comparison View

- [ ] Create side-by-side comparison component
  - [ ] Show Kalshi vs Polymarket metrics
  - [ ] Win rate, P&L, avg win/loss for each
  - [ ] Visual comparison (bar charts)
- [ ] Add to dashboard as optional view
  - [ ] Toggle between "Combined" and "Comparison" view

**Complexity**: Medium | **Dependencies**: 2.1, 2.2

---

## 3. Time Period Analytics (Daily/Monthly/Yearly)

**Goal**: Provide time-based performance analysis with daily, monthly, and yearly views.

### 3.1 Data Aggregation Functions

- [ ] Create daily aggregation function
  - [ ] Group positions by day
  - [ ] Calculate daily P&L, volume, win rate
  - [ ] Return time series data
- [ ] Create monthly aggregation function
  - [ ] Group positions by month
  - [ ] Calculate monthly metrics
  - [ ] Include month-over-month growth
- [ ] Create yearly aggregation function
  - [ ] Group positions by year
  - [ ] Calculate annual metrics
  - [ ] Year-over-year comparison

**Complexity**: Medium | **Dependencies**: None

### 3.2 Time Period UI Components

- [ ] Create TimePeriodToggle component
  - [ ] Buttons: "Daily", "Monthly", "Yearly"
  - [ ] State management
  - [ ] Responsive design
- [ ] Update P/L Curve chart
  - [ ] Dynamically aggregate data based on selected period
  - [ ] Adjust x-axis labels (days vs months vs years)
  - [ ] Add period-specific tooltips
- [ ] Create period comparison cards
  - [ ] "This Week vs Last Week"
  - [ ] "This Month vs Last Month"
  - [ ] "This Year vs Last Year"

**Complexity**: Medium | **Dependencies**: 3.1

### 3.3 Date Range Picker

- [ ] Add date range selector
  - [ ] Calendar component for custom ranges
  - [ ] Quick select buttons: "Last 7 Days", "Last 30 Days", "Last Year", "All Time"
  - [ ] Integrate with all analytics views
- [ ] Update all queries to respect date range
  - [ ] Add `start_date` and `end_date` parameters
  - [ ] Filter positions, stats, and charts

**Complexity**: Medium | **Dependencies**: 3.2

### 3.4 Analytics Dashboard Page

- [ ] Create dedicated `/dashboard/analytics` page
  - [ ] Separate from main dashboard
  - [ ] Focus on detailed time-based analysis
- [ ] Add time period toggle at top
- [ ] Show period-specific metrics
  - [ ] Total P&L for period
  - [ ] Number of trades
  - [ ] Best/worst days
- [ ] Add trend analysis
  - [ ] Moving averages
  - [ ] Performance trends (improving/declining)
  - [ ] Consistency score

**Complexity**: High | **Dependencies**: 3.1, 3.2, 3.3

---

## 4. Market Analytics & Distribution Charts

**Goal**: Provide detailed analytics per market to identify most/least profitable markets.

### 4.1 Market Performance Calculation

- [ ] Create `calculateMarketPerformance()` function
  - [ ] Already exists in `lib/analytics/performance.ts`
  - [ ] Ensure it calculates P&L per market
  - [ ] Add additional metrics: ROI, Sharpe ratio per market
- [ ] Create market ranking system
  - [ ] Sort markets by total P&L
  - [ ] Sort by win rate
  - [ ] Sort by number of trades

**Complexity**: Low | **Dependencies**: None

### 4.2 Market P&L Pie Chart

- [ ] Create MarketPieChart component
  - [ ] Use Recharts PieChart
  - [ ] Show P&L distribution across markets
  - [ ] Color code: green for profitable, red for unprofitable
  - [ ] Interactive: click to filter view to that market
- [ ] Add to Analytics Grid
  - [ ] Replace one of the placeholder charts
  - [ ] Or add as additional chart below current grid
- [ ] Add legend with market names
  - [ ] Truncate long market names
  - [ ] Show percentage of total P&L

**Complexity**: Medium | **Dependencies**: 4.1

### 4.3 Market Performance Table

- [ ] Create detailed market table
  - [ ] Columns: Market, Total Trades, Win Rate, Total P&L, Avg P&L, Best Trade, Worst Trade
  - [ ] Sortable by any column
  - [ ] Color coding for positive/negative P&L
- [ ] Add filtering and search
  - [ ] Search markets by name
  - [ ] Filter by profitable/unprofitable
  - [ ] Filter by platform
- [ ] Add to dashboard or dedicated markets page

**Complexity**: Medium | **Dependencies**: 4.1

### 4.4 Market Category Analysis

- [ ] Parse market categories from names
  - [ ] Kalshi: Extract from ticker (e.g., NHL, NFL, CAAF)
  - [ ] Polymarket: Parse from market name
  - [ ] Create category mapping
- [ ] Create category performance analysis
  - [ ] P&L by category
  - [ ] Win rate by category
  - [ ] Chart showing best/worst categories
- [ ] Add category filter to platform filter
  - [ ] "All Categories", "Sports", "Politics", "Economics", etc.

**Complexity**: High | **Dependencies**: 4.1, 4.2

### 4.5 Market Deep Dive View

- [ ] Create market detail page
  - [ ] `/dashboard/markets/:market_id`
  - [ ] Show all trades for that market
  - [ ] Price chart with annotations
  - [ ] Performance metrics specific to market
- [ ] Add navigation from pie chart and tables
  - [ ] Click market to view details
- [ ] Show market insights
  - [ ] Optimal entry/exit times
  - [ ] Win rate on Yes vs No
  - [ ] Average hold time for this market

**Complexity**: High | **Dependencies**: 1.3, 4.1, 4.2

---

## 5. Additional Enhancements (Future)

### 5.1 Mobile Optimization
- [ ] Responsive design for all new components
- [ ] Mobile-friendly charts
- [ ] Touch gestures for chart interaction

### 5.2 Export & Reporting
- [ ] Export analytics to CSV/Excel
- [ ] Generate PDF reports
- [ ] Email digest of weekly performance

### 5.3 Social Features
- [ ] Share market insights
- [ ] Compare performance with other users (anonymized)
- [ ] Leaderboards

### 5.4 AI Insights
- [ ] Pattern detection in trading behavior
- [ ] Suggestions for improvement
- [ ] Market recommendations based on historical success

---

## Implementation Priority

### Phase 1 (High Priority)
1. Platform Filtering (2.1, 2.2) - Quick win, high value
2. Market P&L Pie Chart (4.2) - Visual impact, relatively simple
3. Time Period Analytics - Daily/Monthly/Yearly (3.1, 3.2)

### Phase 2 (Medium Priority)
4. Market Performance Table (4.3)
5. Historical Data Database (1.1) - Foundation for future features
6. Platform Comparison View (2.3)

### Phase 3 (Long Term)
7. Historical Data API Integration (1.2)
8. Chart Annotations (1.3)
9. MFE/MAE Calculation (1.4)
10. Analytics Dashboard Page (3.4)
11. Market Deep Dive (4.5)

---

## Technical Considerations

### Database
- Monitor query performance as data grows
- Consider partitioning historical_prices by platform and date
- Add database indexes strategically

### Caching
- Implement caching for expensive calculations
- Cache aggregated metrics (daily/monthly/yearly)
- Use Redis or similar for API rate limiting

### API Rate Limits
- Respect Kalshi/Polymarket API limits
- Implement exponential backoff
- Queue historical data requests

### Performance
- Lazy load charts and heavy components
- Paginate large tables
- Consider Web Workers for heavy calculations

---

## Success Metrics

- [ ] 90%+ of active users use platform filtering
- [ ] Average session time increases by 30%
- [ ] MFE/MAE data available for 70%+ of trades
- [ ] Users report market insights help trading decisions
- [ ] Mobile engagement increases

---

*Last Updated: November 5, 2025*
