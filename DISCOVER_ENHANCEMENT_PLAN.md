# DISCOVER Page Enhancement Plan
## Two-Category Heatmap & Opportunity Sorting

---

## Executive Summary

**Goal:** Enhance the DISCOVER page to:
1. Sort modifier groups by `volume_uncaptured` (opportunity size)
2. Add a heatmap view for modifier groups with TWO categories (e.g., "bicycle type, parts")
3. Enable drill-down to specific "need combinations" (e.g., "Mountain Bike + Frame")

**Key Simplification:** Modifier groups with comma-separated values already encode which two categories to cross-tabulate. No category selector needed.

**Total Estimated Effort:** ~15-19 hours

---

## Design Decisions (Locked)

| Decision | Choice |
|----------|--------|
| Heatmap container | Modal overlay |
| Max grid size | 12×12 (top values by volume_uncaptured) |
| Empty cells | Show gray "—" |
| Opportunity metric | `volume_uncaptured` (already exists) |
| Existing drawer | Keep unchanged, add "View Heatmap" button |

---

## Feature Flow

```
LEVEL 1: Modifier Groups Table (sorted by volume_uncaptured)
┌──────────────────────────────────────────────────────────────┐
│ Group                │ Vol to Capture │ Capture Rate │ 🗺️   │
├──────────────────────┼────────────────┼──────────────┼───────┤
│ bicycle type, parts  │    185,000     │    23.5%     │  ✓    │ ← 2 categories
│ parts                │    142,000     │    31.2%     │       │
│ bicycle type, wheels │     98,000     │    45.1%     │  ✓    │ ← 2 categories
└──────────────────────────────────────────────────────────────┘
        │
        │ Click row
        ▼
EXISTING DRAWER (unchanged) + "View Heatmap" button (if 2 categories)
┌──────────────────────────────────────────────────────────────┐
│ [Values] [Competitors] [Keywords]        [📊 View Heatmap]   │
│                                                              │
│ (existing drawer content - no changes)                       │
└──────────────────────────────────────────────────────────────┘
        │
        │ Click "View Heatmap"
        ▼
LEVEL 2: Heatmap Modal (new)
┌──────────────────────────────────────────────────────────────┐
│ ✕  "bicycle type, parts" - Opportunity Heatmap               │
├──────────────────────────────────────────────────────────────┤
│          │  Frame   │  Pedals  │  Wheels  │  Brakes  │  ...  │
│ ─────────┼──────────┼──────────┼──────────┼──────────┼───────│
│ Mountain │  19.5K   │   8.2K   │  12.1K   │   2.3K   │  ...  │
│ Road     │  14.2K   │   5.1K   │   9.8K   │   4.1K   │  ...  │
│ Electric │   8.7K   │   2.9K   │   6.2K   │   1.1K   │  ...  │
│ Hybrid   │   4.2K   │   1.8K   │   3.1K   │    —     │  ...  │
│ ...      │   ...    │   ...    │   ...    │   ...    │  ...  │
├──────────────────────────────────────────────────────────────┤
│ Showing top 12 values per axis by opportunity volume         │
│ Cell color = volume intensity    Click cell for keyword list │
└──────────────────────────────────────────────────────────────┘
        │
        │ Click cell (e.g., Mountain + Frame)
        ▼
LEVEL 3: Combination Keywords Drawer (new)
┌──────────────────────────────────────────────────────────────┐
│ ← Back                                                       │
│                                                              │
│ "Mountain + Frame" - 45 keywords, 19.5K volume to capture    │
├──────────────────────────────────────────────────────────────┤
│ Keyword                    │ Volume │ Your Pos │ Winner      │
│ ───────────────────────────┼────────┼──────────┼─────────────│
│ mountain bike frame size   │  2,400 │    4     │ 🏷 Trek     │
│ carbon mtb frame           │  1,900 │    7     │ 🛒 REI      │
│ cheap mountain bike frame  │  1,200 │   --     │ 🗣 Reddit   │
│ 29er mountain frame        │    880 │   12     │ 🏷 Special. │
│ ...                        │   ...  │   ...    │ ...         │
├──────────────────────────────────────────────────────────────┤
│ 🏷 Brand  🛒 Retailer  🗣 UGC  📰 3rd Party                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Chunks

---

### CHUNK 1: Sort by Volume Uncaptured ✅ COMPLETE
**Difficulty: TRIVIAL | Time: 30 minutes**

`volume_uncaptured` already exists in the data. Just sort the table by it.

**Status:** ✅ Completed on 2026-01-30

**Changes Made:**

| File | Change |
|------|--------|
| `frontend/src/pages/CategoryOpportunities.tsx` | Sorted both `nbModGroups` and `compModGroups` by `volume_uncaptured` desc |

**Code Added (lines 327-329 and 348-350):**
```tsx
// Sort modifier groups by volume_uncaptured (opportunity size) descending
const nbModGroups = [...(nonBrandedData?.modifier_groups ?? [])].sort(
  (a, b) => b.volume_uncaptured - a.volume_uncaptured
);

// Sort modifier groups by volume_uncaptured (opportunity size) descending
const compModGroups = [...(competitorData?.modifier_groups ?? [])].sort(
  (a, b) => b.volume_uncaptured - a.volume_uncaptured
);
```

**Result:** Modifier groups now appear sorted by opportunity size (highest volume to capture first) in both the Non-Branded and Competitor Branded sections.

---

### CHUNK 2: Detect Two-Category Groups + UI Indicator ✅ COMPLETE
**Difficulty: EASY | Time: 1-2 hours**

Parse modifier_group string to detect two-category groups and show indicator.

**Status:** ✅ Completed on 2026-01-30

**New File Created:** `frontend/src/utils/modifierGroup.ts`
```typescript
export function parseModifierGroup(mg: string): {
  isTwoCategory: boolean;
  categories: string[];
} {
  const parts = mg.split(',').map(s => s.trim()).filter(Boolean);
  return {
    isTwoCategory: parts.length === 2,
    categories: parts,
  };
}

export function isTwoCategoryGroup(mg: string): boolean {
  return parseModifierGroup(mg).isTwoCategory;
}
```

**Changes Made:**

| File | Change |
|------|--------|
| `frontend/src/utils/modifierGroup.ts` | NEW - helper functions for parsing modifier groups |
| `frontend/src/pages/CategoryOpportunities.tsx` | Added Grid3X3 icon badge for two-category rows, heatmap state, `handleViewHeatmap` callback |
| `frontend/src/components/dashboard/ModifierGroupDrawer.tsx` | Added `onViewHeatmap` prop, "View Heatmap" button (shows only for two-category opportunity groups) |

**Result:**
- Two-category modifier groups now show a small blue grid icon in the table
- When drawer opens for a two-category group, a "View Heatmap" button appears
- Clicking the button triggers `onViewHeatmap` callback and sets up heatmap state (modal to be implemented in Chunks 4-6)

---

### CHUNK 3: Heatmap Data RPC ✅ COMPLETE
**Difficulty: MEDIUM-HIGH | Time: 4-5 hours**

New RPC function for cross-tabulation of two categories within a modifier group.

**Status:** ✅ Completed on 2026-01-30

**Key Feature:** Return only top 12 row values and top 12 column values by total `volume_uncaptured`.

**Files Created/Modified:**
| File | Change |
|------|--------|
| `scripts/migrations/add_modifier_group_heatmap_rpc.sql` | NEW - SQL migration for RPC function |
| `backend/app/schemas.py` | Added `HeatmapCell`, `HeatmapResponse` Pydantic models |
| `backend/app/services/supabase_analytics.py` | Added `get_modifier_group_heatmap()` service method |
| `backend/app/routers/dashboard.py` | Added `GET /dashboard/modifier-group-heatmap` endpoint |
| `frontend/src/types/index.ts` | Added `HeatmapCell`, `HeatmapResponse` TypeScript interfaces |
| `frontend/src/api/endpoints.ts` | Added `getModifierGroupHeatmap()` API function |

**✅ SQL Migration Applied:** RPC function is live in Supabase (applied 2026-01-30)

**RPC Signature:**
```sql
CREATE OR REPLACE FUNCTION get_modifier_group_heatmap(
  p_market_id TEXT,
  p_brand_name TEXT,
  p_modifier_group TEXT,
  p_row_category TEXT,
  p_col_category TEXT,
  p_keyword_type TEXT,
  p_max_rows INT DEFAULT 12,
  p_max_cols INT DEFAULT 12
) RETURNS JSON
```

**Return Structure:**
```json
{
  "modifier_group": "bicycle type, parts",
  "row_category": "bicycle_type",
  "row_category_display": "Bicycle Type",
  "col_category": "parts",
  "col_category_display": "Parts",
  "row_values": ["mountain", "road", "electric", "hybrid", ...],
  "col_values": ["frame", "pedals", "wheels", "brakes", ...],
  "cells": [
    {
      "row_value": "mountain",
      "col_value": "frame",
      "total_keywords": 45,
      "total_volume": 28000,
      "volume_captured": 8500,
      "volume_uncaptured": 19500,
      "capture_rate": 30.4
    }
  ],
  "max_volume_uncaptured": 19500,
  "truncated": { "rows": false, "cols": true }
}
```

**SQL Query Pattern (with top-N filtering):**
```sql
WITH
-- Get brand domain IDs
brand_domains AS (
  SELECT domain_id FROM brand_domains
  WHERE market_id = p_market_id AND brand_name = p_brand_name
),
-- Filter keywords for this modifier group
filtered_keywords AS (
  SELECT k.id, k.volume
  FROM keywords k
  WHERE k.market_id = p_market_id
    AND k.modifier_group = p_modifier_group
    -- nonbranded/competitor filter here
),
-- All combinations with metrics
all_combinations AS (
  SELECT
    rt.row_value, ct.col_value,
    COUNT(*) as total_keywords,
    SUM(fk.volume) as total_volume,
    SUM(CASE WHEN ow.domain_id IN (SELECT domain_id FROM brand_domains)
             THEN fk.volume ELSE 0 END) as volume_captured,
    SUM(CASE WHEN ow.domain_id NOT IN (SELECT domain_id FROM brand_domains)
             OR ow.domain_id IS NULL
             THEN fk.volume ELSE 0 END) as volume_uncaptured
  FROM filtered_keywords fk
  JOIN row_tags rt ON fk.id = rt.keyword_id
  JOIN col_tags ct ON fk.id = ct.keyword_id
  LEFT JOIN organic_winners ow ON ow.keyword_id = fk.id
  GROUP BY rt.row_value, ct.col_value
),
-- Top 12 row values by total volume_uncaptured
top_rows AS (
  SELECT row_value, SUM(volume_uncaptured) as row_total
  FROM all_combinations
  GROUP BY row_value
  ORDER BY row_total DESC
  LIMIT p_max_rows
),
-- Top 12 col values by total volume_uncaptured
top_cols AS (
  SELECT col_value, SUM(volume_uncaptured) as col_total
  FROM all_combinations
  GROUP BY col_value
  ORDER BY col_total DESC
  LIMIT p_max_cols
)
-- Final: only cells within top rows and cols
SELECT ac.*
FROM all_combinations ac
WHERE ac.row_value IN (SELECT row_value FROM top_rows)
  AND ac.col_value IN (SELECT col_value FROM top_cols);
```

**Changes:**

| Layer | File | Change |
|-------|------|--------|
| Supabase | SQL Editor | New RPC: `get_modifier_group_heatmap` |
| Backend | `schemas.py` | Add `HeatmapCell`, `HeatmapResponse` |
| Backend | `supabase_analytics.py` | Add `get_modifier_group_heatmap()` method |
| Backend | `dashboard.py` | Add `GET /dashboard/modifier-group-heatmap` endpoint |
| Frontend | `types/index.ts` | Add `HeatmapCell`, `HeatmapResponse` interfaces |
| Frontend | `api/endpoints.ts` | Add `getModifierGroupHeatmap()` function |

---

### CHUNK 4: Heatmap Visualization Component ✅ COMPLETE
**Difficulty: MEDIUM | Time: 4-5 hours**

React component for heatmap modal with color + volume numbers.

**Status:** ✅ Completed on 2026-01-30

**New Files Created:**
- `frontend/src/utils/colorScale.ts` - Color utilities for heatmap cells
- `frontend/src/components/dashboard/HeatmapModal.tsx` - Heatmap modal component

**Files Modified:**
- `frontend/src/pages/CategoryOpportunities.tsx` - Integrated HeatmapModal

**Implementation Details:**

1. **colorScale.ts** - Color scale utility:
```typescript
export function getHeatmapColor(value: number, maxValue: number): HeatmapColorResult {
  if (!value || value === 0) return { bg: 'bg-gray-50', text: 'text-gray-400' };
  const intensity = value / maxValue;
  if (intensity > 0.8) return { bg: 'bg-green-600', text: 'text-white' };
  if (intensity > 0.6) return { bg: 'bg-green-500', text: 'text-white' };
  if (intensity > 0.4) return { bg: 'bg-green-400', text: 'text-gray-900' };
  if (intensity > 0.2) return { bg: 'bg-green-300', text: 'text-gray-900' };
  return { bg: 'bg-green-100', text: 'text-gray-700' };
}
```

2. **HeatmapModal.tsx** - Key features:
- Uses TanStack Query to fetch heatmap data via `getModifierGroupHeatmap`
- Auto-detects categories from modifier group using `parseModifierGroup`
- Renders scrollable grid with sticky row headers
- Color intensity based on `volume_uncaptured` relative to max
- Cell tooltips show volume, capture rate, and keyword count
- Framer Motion for smooth open/close animations
- Escape key to close, click backdrop to close
- Legend showing color intensity scale

3. **CategoryOpportunities.tsx** - Integration:
- Imported HeatmapModal component
- Renders modal with heatmapState
- Cell click handler logs click (placeholder for Chunk 5)

**Result:**
- Clicking "View Heatmap" button in drawer opens heatmap modal
- Modal shows 12x12 grid of category value combinations
- Cells colored by opportunity size (volume_uncaptured)
- Cell click ready for Chunk 5 integration (combination keywords)

---

### CHUNK 5: Combination Keywords RPC + Drawer ✅ COMPLETE
**Difficulty: MEDIUM | Time: 3-4 hours**

Get keywords for a specific (row_value, col_value) combination.

**Status:** ✅ Completed on 2026-01-30

**Files Created/Modified:**

| Layer | File | Change |
|-------|------|--------|
| SQL | `scripts/migrations/add_combination_keywords_rpc.sql` | NEW - RPC function migration |
| Backend | `backend/app/schemas.py` | Added `CombinationKeywordRanker`, `CombinationKeyword`, `CombinationKeywordsResponse` |
| Backend | `backend/app/services/supabase_analytics.py` | Added `get_combination_keywords()` method |
| Backend | `backend/app/routers/dashboard.py` | Added `GET /dashboard/combination-keywords` endpoint |
| Frontend | `frontend/src/types/index.ts` | Added TypeScript interfaces |
| Frontend | `frontend/src/api/endpoints.ts` | Added `getCombinationKeywords()` function |
| Frontend | `frontend/src/components/dashboard/CombinationKeywordsDrawer.tsx` | NEW - Drawer component |

**RPC Function:** `get_combination_keywords` - returns keywords with full ranking info for drill-down

**Note:** SQL migration file created at `scripts/migrations/add_combination_keywords_rpc.sql`. User needs to run this in Supabase SQL Editor.

---

### CHUNK 6: Integration & Wiring ✅ COMPLETE
**Difficulty: EASY | Time: 2 hours**

Connect all pieces in CategoryOpportunities page.

**Status:** ✅ Completed on 2026-01-30

**Changes Made:**

| File | Change |
|------|--------|
| `frontend/src/pages/CategoryOpportunities.tsx` | Added combinationState, updated HeatmapModal onCellClick to open drawer, added CombinationKeywordsDrawer with back navigation |

**Integration Details:**
- HeatmapModal cell click opens CombinationKeywordsDrawer
- Back button on drawer returns to heatmap modal
- Categories auto-parsed from modifier group string
- State management for bidirectional navigation between heatmap ↔ keywords drawer

---

## Agentic Execution Plan

Split implementation across specialized agents with a QA agent for verification.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR AGENT                             │
│  Coordinates work, manages dependencies, assembles final result     │
└─────────────────────────────────────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┬──────────────────┐
        ▼                  ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ AGENT 1       │  │ AGENT 2       │  │ AGENT 3       │  │ AGENT 4       │
│ Backend RPC   │  │ Backend API   │  │ Frontend      │  │ Frontend      │
│               │  │               │  │ Components    │  │ Integration   │
├───────────────┤  ├───────────────┤  ├───────────────┤  ├───────────────┤
│ • Heatmap RPC │  │ • Pydantic    │  │ • Heatmap     │  │ • Page state  │
│ • Combination │  │   schemas     │  │   Modal       │  │ • Wire modals │
│   Keywords RPC│  │ • Service     │  │ • Combination │  │ • Drawer btn  │
│ • Test queries│  │   methods     │  │   Drawer      │  │ • Sorting     │
│               │  │ • Endpoints   │  │ • Color utils │  │               │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │                  │
        └──────────────────┴──────────────────┴──────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │     QA AGENT          │
                        ├───────────────────────┤
                        │ • Verify RPC returns  │
                        │   correct data        │
                        │ • Test API endpoints  │
                        │ • Check TypeScript    │
                        │   types match schemas │
                        │ • Visual review of    │
                        │   heatmap rendering   │
                        │ • Test full flow:     │
                        │   table → drawer →    │
                        │   heatmap → keywords  │
                        │ • Edge cases:         │
                        │   - Empty cells       │
                        │   - Single category   │
                        │   - Large datasets    │
                        └───────────────────────┘
```

### Agent Assignments

| Agent | Chunks | Responsibilities |
|-------|--------|------------------|
| **Agent 1: RPC Developer** | CHUNK 3 (partial), CHUNK 5 (partial) | Write & test SQL RPC functions in Supabase |
| **Agent 2: Backend API** | CHUNK 3 (partial), CHUNK 5 (partial) | Pydantic schemas, service methods, FastAPI endpoints |
| **Agent 3: Frontend Components** | CHUNK 4, CHUNK 5 (partial) | HeatmapModal, CombinationKeywordsDrawer, colorScale utils |
| **Agent 4: Frontend Integration** | CHUNK 1, CHUNK 2, CHUNK 6 | Sorting, detection, state management, wiring |
| **Agent 5: QA** | All | End-to-end testing, type verification, edge cases |

### Execution Order

```
Phase 1: Foundation (Can run in parallel)
├── Agent 1: Write RPC functions
├── Agent 4: CHUNK 1 (sorting) + CHUNK 2 (detection)
│
Phase 2: Backend (Sequential after Phase 1)
├── Agent 2: Schemas + Services + Endpoints (needs RPC done)
│
Phase 3: Frontend (Sequential after Phase 2)
├── Agent 3: Components (needs types from Agent 2)
├── Agent 4: CHUNK 6 integration (needs components from Agent 3)
│
Phase 4: QA (After all phases)
└── Agent 5: Full verification
```

### Agent Handoff Contracts

**Agent 1 → Agent 2:**
```
Delivers: RPC function names, parameter signatures, return JSON structure
Example: "get_modifier_group_heatmap returns { cells: [...], max_volume_uncaptured: number }"
```

**Agent 2 → Agent 3:**
```
Delivers: TypeScript interface definitions (copy from Pydantic schemas)
Example: "HeatmapResponse { cells: HeatmapCell[], maxVolumeUncaptured: number }"
```

**Agent 3 → Agent 4:**
```
Delivers: Component props interfaces
Example: "HeatmapModal accepts { isOpen, onClose, onCellClick, ... }"
```

### QA Agent Checklist

```markdown
## RPC Verification
- [ ] get_modifier_group_heatmap returns correct cell structure
- [ ] Top 12 filtering works (returns max 12 rows, 12 cols)
- [ ] Empty combinations return null/missing (not zero)
- [ ] Performance: <2s on bicycle_us market

## API Verification
- [ ] GET /dashboard/modifier-group-heatmap returns 200
- [ ] GET /dashboard/combination-keywords returns 200
- [ ] Error handling for invalid modifier_group

## Type Verification
- [ ] Pydantic schemas match RPC return structure
- [ ] TypeScript types match Pydantic schemas
- [ ] No `any` types in new code

## UI Verification
- [ ] Sorting by volume_uncaptured works
- [ ] 🗺️ icon appears only for two-category groups
- [ ] "View Heatmap" button appears in drawer
- [ ] Heatmap modal opens/closes correctly
- [ ] Cell colors scale correctly (darker = higher)
- [ ] Cell click opens combination drawer
- [ ] Back button returns to heatmap
- [ ] Empty cells show gray "—"

## Edge Cases
- [ ] Single-category modifier group (no heatmap button)
- [ ] Modifier group with 0 uncaptured volume
- [ ] Combination with 0 keywords
- [ ] Very long value names (truncation)
```

---

## Complete File Summary

### New Files (5)

| File | Purpose | Agent |
|------|---------|-------|
| `frontend/src/utils/modifierGroup.ts` | Parse modifier group | Agent 4 |
| `frontend/src/utils/colorScale.ts` | Heatmap colors | Agent 3 |
| `frontend/src/components/dashboard/HeatmapModal.tsx` | Heatmap UI | Agent 3 |
| `frontend/src/components/dashboard/CombinationKeywordsDrawer.tsx` | Keywords UI | Agent 3 |

### Modified Files (8)

| File | Changes | Agent |
|------|---------|-------|
| `backend/app/schemas.py` | +4 Pydantic models | Agent 2 |
| `backend/app/services/supabase_analytics.py` | +2 service methods | Agent 2 |
| `backend/app/routers/dashboard.py` | +2 endpoints | Agent 2 |
| `frontend/src/types/index.ts` | +4 TypeScript interfaces | Agent 2 |
| `frontend/src/api/endpoints.ts` | +2 API functions | Agent 4 |
| `frontend/src/pages/CategoryOpportunities.tsx` | Sorting, state, modals | Agent 4 |
| `frontend/src/components/dashboard/ModifierGroupDrawer.tsx` | Heatmap button | Agent 4 |

### New RPC Functions (2)

| Function | Agent |
|----------|-------|
| `get_modifier_group_heatmap` | Agent 1 |
| `get_combination_keywords` | Agent 1 |

---

## Timeline

| Phase | Duration | Agents Active |
|-------|----------|---------------|
| Phase 1: Foundation | 2-3 hours | Agent 1, Agent 4 (parallel) |
| Phase 2: Backend | 3-4 hours | Agent 2 |
| Phase 3: Frontend | 4-5 hours | Agent 3, Agent 4 |
| Phase 4: QA | 2-3 hours | Agent 5 |
| **Total** | **~12-15 hours** | |

---

## Progress Tracking

| Chunk | Description | Status | Date |
|-------|-------------|--------|------|
| 1 | Sort by volume_uncaptured | ✅ Complete | 2026-01-30 |
| 2 | Detect two-category groups + UI | ✅ Complete | 2026-01-30 |
| 3 | Heatmap Data RPC | ✅ Complete | 2026-01-30 |
| 4 | Heatmap Visualization Component | ✅ Complete | 2026-01-30 |
| 5 | Combination Keywords RPC + Drawer | ✅ Complete | 2026-01-30 |
| 6 | Integration & Wiring | ✅ Complete | 2026-01-30 |

**Overall Progress:** 6/6 chunks complete (100% done!)

**Remaining Action:** User needs to run the SQL migration `scripts/migrations/add_combination_keywords_rpc.sql` in Supabase SQL Editor

**✅ SQL Migration Applied:** `get_modifier_group_heatmap` RPC is now live in Supabase

---

## Strategic Value

This feature enables pattern-based insights:

> "Pedals are searched across ALL bike types → create one comprehensive pedals guide"

> "Road bikes only need handlebars and wheels → focus content there"

> "We're position 4 on 'mountain bike frame size' with 2.4K volume → small win possible"

The **heatmap reveals patterns**. The **keyword table enables action**.
