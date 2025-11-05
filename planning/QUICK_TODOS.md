# Quick Action TODOs

Immediate tasks extracted from the main roadmap, organized by effort and priority.

---

## 🟢 Quick Wins (Low Effort, High Impact)

### Platform Filtering
- [ ] Create `PlatformFilter` component (toggle: All/Kalshi/Polymarket)
- [ ] Add platform filter to dashboard header
- [ ] Add platform filter to trades page
- [ ] Update `getDashboardData()` to accept platform parameter
- [ ] Filter positions query by platform
- [ ] Update performance metrics to respect platform filter

**Time Estimate**: 2-3 hours

### Market P&L Pie Chart
- [ ] Create `MarketPieChart` component using Recharts
- [ ] Use existing `calculateMarketPerformance()` function
- [ ] Add to Analytics Grid (replace MFE chart placeholder)
- [ ] Add tooltips with market details
- [ ] Color code profitable (green) vs unprofitable (red)

**Time Estimate**: 2-3 hours

---

## 🟡 Medium Effort (Moderate Complexity)

### Time Period Analytics
- [ ] Create `TimePeriodToggle` component (Daily/Monthly/Yearly)
- [ ] Write aggregation functions:
  - [ ] `aggregateByDay(positions)`
  - [ ] `aggregateByMonth(positions)`
  - [ ] `aggregateByYear(positions)`
- [ ] Update P/L Curve to use aggregated data
- [ ] Add period comparison cards (This Month vs Last Month)

**Time Estimate**: 4-6 hours

### Market Performance Table
- [ ] Create sortable table component
- [ ] Columns: Market Name, Trades, Win Rate, P&L, Avg P&L
- [ ] Add search/filter functionality
- [ ] Link to market detail view (future)
- [ ] Add to dashboard or new markets page

**Time Estimate**: 3-4 hours

---

## 🔴 Large Projects (High Effort)

### Historical Data Infrastructure
- [ ] Design `historical_prices` table schema
- [ ] Create migration for new table
- [ ] Build data ingestion API:
  - [ ] `POST /api/prices/bulk` endpoint
  - [ ] `GET /api/prices/:market_id` endpoint
- [ ] Import your existing historical data
- [ ] Create caching layer

**Time Estimate**: 8-12 hours

### Chart Annotations (Entry/Exit Arrows)
- [ ] Add scatter plot layer to charts
- [ ] Design entry/exit markers
- [ ] Query historical prices for position timeframe
- [ ] Overlay trades on price chart
- [ ] Add hover tooltips with trade details

**Time Estimate**: 6-8 hours

### MFE/MAE Calculation
- [ ] Create calculation service
- [ ] Query historical data during position hold
- [ ] Find max favorable/adverse price movements
- [ ] Store in database (add columns or new table)
- [ ] Update Analytics Grid to show real data

**Time Estimate**: 6-8 hours

---

## 📋 Recommended Order

**Week 1**: Quick Wins
1. Platform Filtering ✅ High user value
2. Market P&L Pie Chart ✅ Visual appeal

**Week 2**: Medium Effort
3. Market Performance Table
4. Time Period Analytics (Daily/Monthly/Yearly)

**Week 3+**: Large Projects
5. Historical Data Infrastructure (foundation)
6. Chart Annotations
7. MFE/MAE Calculation

---

## Dependencies Tree

```
Historical Data Infrastructure (1)
  ├─→ Chart Annotations (2)
  └─→ MFE/MAE Calculation (3)

Platform Filtering (standalone)

Market P&L Pie Chart (standalone)

Time Period Analytics (standalone)

Market Performance Table (standalone)
```

---

## Notes

- **Platform Filtering** and **Market P&L Pie Chart** can be done in parallel
- **Historical Data** must be completed before **MFE/MAE** or **Chart Annotations**
- All "standalone" features can be implemented independently
- Start with quick wins to show immediate progress
- Consider mobile responsiveness for all new components

---

*Updated: November 5, 2025*
