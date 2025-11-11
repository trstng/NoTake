# Dashboard Analytics Not Updating - Critical Issue

## Status: IDENTIFIED - NOT YET FIXED ⚠️

## Problem Summary

P/L curve, performance calendar, and total P/L metrics in the dashboard only update when settlement CSV is uploaded. They do NOT update when trade CSVs are imported, even though positions are being created.

## User Impact

**High Priority:** Users import trades and see positions created, but:
- Dashboard shows stale/outdated analytics
- P/L curve doesn't reflect new positions
- Performance calendar shows no activity
- Total P/L appears incorrect

This creates confusion and makes the dashboard appear broken.

## Root Cause

### The Issue

`updateDailyStats()` is only called in `importKalshiSettlements()` but NOT in:
- `importTrades()` (Kalshi trades)
- `importPolymarketTrades()` (Polymarket trades)

### Trade Import Flow (MISSING updateDailyStats)

**File:** `app/actions/trades.ts`

```typescript
// Kalshi Trades Import (lines 66-198)
export async function importTrades() {
  // ... imports trades ...
  // Creates calculation job
  const jobResult = await createCalculationJob(user.id, totalTrades || 0, 500)
  // ❌ Does NOT call updateDailyStats()
}

// Polymarket Trades Import (lines 201-349)
export async function importPolymarketTrades() {
  // ... imports trades ...
  // Creates calculation job
  const jobResult = await createCalculationJob(user.id, totalTrades || 0, 500)
  // ❌ Does NOT call updateDailyStats()
}
```

### Settlement Import Flow (HAS updateDailyStats)

**File:** `app/actions/trades.ts`

```typescript
// Kalshi Settlements Import (lines 352-498)
export async function importKalshiSettlements() {
  // ... imports settlements ...
  const positionResult = await calculatePositions(user.id) // Line 466

  // ✅ CALLS updateDailyStats()
  await updateDailyStats(user.id, 0) // Line 469
}
```

**This is why analytics only update after settlement uploads!**

## Dashboard Dependencies on daily_stats

### What Depends on daily_stats

**File:** `app/actions/dashboard.ts`

```typescript
export async function getDashboardData(userId: string) {
  // Lines 38-49: Fetches positions
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'closed')

  // Lines 51-61: Fetches daily_stats ← THIS IS THE ISSUE
  const { data: dailyStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  // Line 75: Performance metrics calculated from positions (✅ WOULD UPDATE)
  const performance = calculatePerformanceMetrics(positions)

  // Line 76: Drawdown calculated from daily_stats (❌ WON'T UPDATE)
  const drawdown = calculateDrawdown(dailyStats)

  return { performance, drawdown, dailyStats, ... }
}
```

### Components Using daily_stats

**File:** `app/dashboard/page.tsx`

```typescript
// Line 128: P/L Curve Chart
<PLCurveChart data={dailyStats} />

// Line 132: Trading Calendar
<TradingCalendar data={dailyStats} />
```

**File:** `components/dashboard/pl-curve-chart.tsx`

```typescript
// Line 25: Uses stat.realized_pnl from daily_stats
const chartData = data.map((stat) => ({
  date: stat.date,
  pnl: stat.realized_pnl || 0,
  ...
}))
```

**File:** `components/dashboard/trading-calendar.tsx`

```typescript
// Line 19: Uses stat.realized_pnl from daily_stats
const dateMap = new Map(
  data.map((stat) => [stat.date, stat.realized_pnl || 0])
)
```

## The Problem with Async Jobs

**Challenge:** Both `importTrades()` and `importPolymarketTrades()` now use async job-based calculation:

```typescript
const jobResult = await createCalculationJob(user.id, totalTrades || 0, 500)
```

This returns immediately with a job ID. The actual position calculation happens asynchronously in batches via `processNextBatch()`.

**Can't wait for completion** in the import function because:
- User would see a loading spinner for minutes
- Server action might timeout
- That's why we moved to async jobs in the first place

## Solution Options

### Option 1: Update Daily Stats After Each Batch (Recommended)

**Pros:**
- Daily stats stay up-to-date throughout processing
- Dashboard updates incrementally as batches complete
- Most accurate real-time data

**Cons:**
- More database writes (could be expensive with many batches)
- Need to handle partial data states

**Implementation:**
```typescript
// In app/actions/positions.ts
export async function processNextBatch(jobId: string) {
  // ... process batch ...
  const result = await calculatePositions(job.user_id, batchSize, offset)

  // Update daily stats after this batch
  if (result.success) {
    await updateDailyStats(job.user_id, 0)
  }

  // ... rest of batch processing ...
}
```

### Option 2: Update Daily Stats Only on Job Completion

**Pros:**
- Single database write at the end
- More efficient for large imports
- Cleaner separation of concerns

**Cons:**
- Dashboard stays stale until all batches complete
- If job fails midway, stats never update
- Users see delay before analytics appear

**Implementation:**
```typescript
// In app/actions/positions.ts
export async function completeJob(jobId: string, success: boolean, errorMessage?: string) {
  // ... update job status ...

  // Update daily stats on successful completion
  if (success) {
    const job = await getJobStatus(jobId)
    if (job.success && job.job) {
      await updateDailyStats(job.job.user_id, 0)
    }
  }

  return { success: true }
}
```

### Option 3: Manual Refresh + Automatic on Settlement (Hybrid)

**Pros:**
- No changes to batch processing
- Users can trigger update when needed
- Settlements still auto-update

**Cons:**
- Requires user action (suboptimal UX)
- Users might not know they need to refresh
- Extra UI complexity

**Implementation:**
```typescript
// Add a "Refresh Analytics" button in dashboard
export async function refreshAnalytics(userId: string) {
  await updateDailyStats(userId, 0)
  revalidatePath('/dashboard')
}
```

### Option 4: Call in Import Success Callback (Client-Side)

**Pros:**
- Happens after job completes
- No changes to server-side batch logic
- One update per import

**Cons:**
- Requires client to stay connected
- If user navigates away, stats don't update
- More complex state management

**Implementation:**
```typescript
// In components/import/csv-import-dialog.tsx
useEffect(() => {
  if (jobComplete) {
    // Call server action to update stats
    await refreshAnalytics()
  }
}, [jobComplete])
```

## Recommended Implementation

**Hybrid Approach:**
1. **Option 2** as primary: Update stats on job completion
2. **Option 3** as backup: Add manual refresh button
3. Keep existing settlement import auto-update

This provides:
- Automatic updates after trade imports finish
- Manual override if user wants immediate update
- Consistency with settlement behavior

## Implementation Plan

### Step 1: Add updateDailyStats to Job Completion

**File:** `app/actions/positions.ts`

```typescript
export async function completeJob(
  jobId: string,
  success: boolean,
  errorMessage?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Get job details before updating
    const jobResult = await getJobStatus(jobId)

    // Update job status
    const { error } = await supabase
      .from('position_calculation_jobs')
      .update({
        status: success ? 'completed' : 'failed',
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (error) throw error

    // Update daily stats on successful completion
    if (success && jobResult.success && jobResult.job) {
      console.log(`[JOB ${jobId}] Updating daily stats after completion`)
      await updateDailyStats(jobResult.job.user_id, 0)
    }

    return { success: true }
  } catch (error) {
    // ... error handling ...
  }
}
```

### Step 2: Add Manual Refresh Action (Optional)

**File:** `app/actions/dashboard.ts`

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { updateDailyStats } from './positions'
import { createClient } from '@/lib/supabase/server'

export async function refreshDashboardAnalytics(): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    await updateDailyStats(user.id, 0)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

### Step 3: Add Refresh Button to Dashboard (Optional)

**File:** `app/dashboard/page.tsx`

```typescript
import { refreshDashboardAnalytics } from '@/app/actions/dashboard'
import { Button } from '@/components/ui/button'

// Inside component:
<div className="flex items-center justify-between">
  <div>
    <h1>Dashboard</h1>
    <p>Your trading performance</p>
  </div>
  <form action={refreshDashboardAnalytics}>
    <Button type="submit" variant="outline" size="sm">
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh Analytics
    </Button>
  </form>
</div>
```

## Testing Checklist

- [ ] Import Kalshi trades CSV
- [ ] Wait for job to complete
- [ ] Verify daily_stats table has new entries
- [ ] Check dashboard shows updated P/L curve
- [ ] Verify performance calendar reflects new trades
- [ ] Import Polymarket trades CSV
- [ ] Repeat verification steps
- [ ] Import settlements CSV
- [ ] Verify analytics still update (regression test)
- [ ] Test manual refresh button (if implemented)

## Success Metrics

- [ ] Dashboard analytics update after trade imports complete
- [ ] P/L curve shows all position data
- [ ] Performance calendar displays all trading days
- [ ] No user confusion about stale data
- [ ] Daily stats table stays synchronized with positions table

## Related Issues

- `SETTLEMENT_MATCHING_FIX.md` - Settlement position matching (FIXED)
- Win rate calculation discrepancy (partially addressed with label clarification)

## Next Steps

1. Implement Option 2 (update stats on job completion)
2. Test with real user data
3. Monitor for any performance issues with large datasets
4. Consider adding Option 3 (manual refresh) if users request it
5. Document behavior in user-facing help/docs

## Files to Modify

- `app/actions/positions.ts` - Add updateDailyStats call to completeJob()
- `app/actions/dashboard.ts` - Add refreshDashboardAnalytics() action (optional)
- `app/dashboard/page.tsx` - Add refresh button UI (optional)
