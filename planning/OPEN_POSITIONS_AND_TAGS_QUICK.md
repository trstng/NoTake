# Open Positions & Tagging - Quick Reference

Fast reference guide for implementing open positions toggle and trade tagging.

---

## Open Positions Toggle - Quick Todos

### 🟢 Phase 1: Basic Toggle (3-4 hours)
1. [ ] Create `PositionStatusToggle` component (tabs: Closed | Open)
2. [ ] Update `/trades` page to read `?status=` query param
3. [ ] Query positions by status: `.eq('status', status)`
4. [ ] Update page title dynamically based on status
5. [ ] Calculate different stats for open vs closed

### 🟡 Phase 2: Open Positions Table (3-4 hours)
6. [ ] Extend `SortablePositionsTable` for open positions
7. [ ] Different columns for open:
   - Entry Time, Size, Entry Price, Time in Position
   - Remove: Exit Price, Exit Time, P/L
8. [ ] Empty state: "No Open Positions"
9. [ ] Test with real open positions

**Total Estimate**: 6-8 hours

---

## Trade Tagging - Quick Todos

### 🟢 Phase 1: Basic Tag UI (4-5 hours)
1. [ ] Create `TagInput` component (multi-select with autocomplete)
2. [ ] Create `TagBadge` component (display single tag)
3. [ ] Create `TagList` component (display multiple tags)
4. [ ] Add tags column to tables (show tags as badges)

### 🟢 Phase 2: Tag Backend (2-3 hours)
5. [ ] Create `updateTradeTags(tradeId, tags)` server action
6. [ ] Create `getUserTags()` server action (get unique tags)
7. [ ] Add GIN index: `CREATE INDEX idx_trades_tags ON trades USING GIN (tags);`

### 🟡 Phase 3: Tag Editing (3-4 hours)
8. [ ] Add tag edit modal/popover (opens when clicking tags)
9. [ ] Implement save/cancel functionality
10. [ ] Test tag CRUD: add, edit, remove tags

### 🟡 Phase 4: Tag Filtering (3-4 hours)
11. [ ] Create `TagFilter` component (multi-select dropdown)
12. [ ] Add filter UI to /trades page header
13. [ ] Update queries: `.contains('tags', selectedTags)`
14. [ ] Add "Match All" vs "Match Any" toggle
15. [ ] Persist filters in URL params

**Total Estimate**: 12-16 hours

---

## Key Code Snippets

### Query Open Positions
```typescript
const status = searchParams.status || 'closed'
const { data: positions } = await supabase
  .from('positions')
  .select('*')
  .eq('user_id', user?.id)
  .eq('status', status)
  .order(status === 'open' ? 'entry_time' : 'exit_time', { ascending: false })
```

### Update Trade Tags
```typescript
export async function updateTradeTags(tradeId: string, tags: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('trades')
    .update({ tags })
    .eq('id', tradeId)
    .eq('user_id', user.id)

  return { success: !error, error: error?.message }
}
```

### Query with Tag Filter
```typescript
let query = supabase.from('trades').select('*').eq('user_id', user.id)

if (selectedTags.length > 0) {
  query = query.contains('tags', selectedTags) // Match any tag
}

const { data } = await query
```

### Get User's Tags
```typescript
export async function getUserTags() {
  const supabase = await createClient()
  const { data: trades } = await supabase
    .from('trades')
    .select('tags')
    .eq('user_id', user?.id)

  const tagMap = new Map()
  trades?.forEach(trade => {
    trade.tags?.forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })
  })

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
```

---

## Database Schema Notes

### ✅ No Migration Needed!
- `trades.tags` column already exists as `TEXT[]`
- `positions.status` column already exists as `'open' | 'closed'`

### Optional Performance Index
```sql
-- Add GIN index for fast tag queries
CREATE INDEX idx_trades_tags ON trades USING GIN (tags);
```

---

## Component Structure

```
components/
├── positions/
│   └── PositionStatusToggle.tsx    # New: Closed/Open toggle
└── tags/
    ├── TagInput.tsx                 # New: Multi-select input
    ├── TagBadge.tsx                 # New: Single tag display
    ├── TagList.tsx                  # New: Multiple tags display
    ├── TagFilter.tsx                # New: Filter dropdown
    └── TagEditModal.tsx             # New: Edit tags modal
```

---

## Testing Checklist

### Open Positions
- [ ] Switch between closed/open views
- [ ] Stats update correctly for each view
- [ ] Table columns change based on view
- [ ] Empty state shows when no open positions
- [ ] URL params work (refresh preserves view)

### Tagging
- [ ] Add tag to trade
- [ ] Remove tag from trade
- [ ] Edit multiple tags at once
- [ ] Filter by single tag
- [ ] Filter by multiple tags
- [ ] Tag autocomplete shows suggestions
- [ ] Tag count updates correctly
- [ ] Special characters in tags handled safely

---

## Quick Wins (Start Here!)

1. **Open Positions Toggle** (simplest, high impact)
   - Reuse existing table component
   - Just change query and stats logic
   - ~3-4 hours for MVP

2. **Basic Tag Display** (visual impact)
   - Just show existing tags as badges
   - Read-only first, then add editing
   - ~2-3 hours for display only

---

## Notes

- Tags column already exists on `trades` table ✅
- Need to join trades to positions to show tags in positions view
- Start with closed positions tagging, extend to open later
- Consider using library like `react-tag-input` for TagInput component

---

*Last Updated: November 5, 2025*
