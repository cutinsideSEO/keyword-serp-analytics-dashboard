# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Backend (from project root)
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend (new terminal, from project root)
cd frontend
npm install
npm run dev           # Dev server on http://localhost:5173
npm run build         # Production build
npm run build:typecheck  # TypeScript check + build
npm run lint          # ESLint (strict, zero warnings allowed)
npm run preview       # Preview production build
```

**Dashboard**: http://localhost:5173 | **API Docs**: http://localhost:8000/docs

### Testing Endpoints

```bash
# Local
curl "http://localhost:8000/api/dashboard/brand-protection?brand=הראל&market_id=insurance_il"
# Production
curl "https://keyword-serp-dashboard.vercel.app/api/dashboard/market-overview?market_id=insurance_il"
```

Check Supabase logs for RPC errors via MCP: `mcp__supabase__get_logs` with `service="postgres"`.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    Supabase      │
│  React + Vite   │◀────│    FastAPI      │◀────│   PostgreSQL     │
│  shadcn/ui + TS │     │    Python 3.11  │     │  Multi-market    │
└─────────────────┘     └─────────────────┘     └──────────────────┘
         │                      │
   TypeScript types      Pydantic schemas        RPC functions
   frontend/src/types    backend/app/schemas     Supabase Dashboard
```

| Layer    | Technology                       | Purpose                          |
|----------|----------------------------------|----------------------------------|
| Database | Supabase/Postgres                | Cloud database with multi-market |
| Backend  | FastAPI + Python 3.11            | REST API with OpenAPI docs       |
| Frontend | React 18 + TypeScript            | UI framework                     |
| UI       | shadcn/ui + Radix UI + Tailwind  | Component primitives + styling   |
| Data     | TanStack Query (react-query)     | Caching, dedup, auto-cancel      |
| Charts   | Recharts + shadcn ChartContainer | Dashboard charts (bar, pie)      |
| Tables   | TanStack Table + shadcn Table    | Data tables with sorting/paging  |
| Animation| Framer Motion                    | Sidebar, drawer, card transitions|
| Icons    | Lucide React                     | Icon library (shadcn default)    |
| AI       | Claude API                       | Domain classification            |

## Data Request Flow (Critical Pattern)

All dashboard data flows through Supabase RPC functions for serverless compatibility:

```
Frontend API Call → FastAPI Router → Service Method → Supabase RPC → PostgreSQL
     ↓                    ↓              ↓                ↓
  TypeScript type    Pydantic schema  .rpc() call    plpgsql function
```

### Key Files by Layer

| Layer | File | Purpose |
|-------|------|---------|
| Frontend Types | `frontend/src/types/index.ts` | TypeScript interfaces for API responses |
| Frontend API | `frontend/src/api/endpoints.ts` | Axios calls to backend |
| Backend Router | `backend/app/routers/dashboard.py` | FastAPI endpoints |
| Backend Service | `backend/app/services/supabase_analytics.py` | Brand protection RPC calls |
| Backend Service | `backend/app/services/supabase_market_analytics.py` | Market overview RPC calls |
| Backend Service | `backend/app/services/supabase_keywords.py` | Keyword filtering via RPC |
| Backend Schemas | `backend/app/schemas.py` | Pydantic response models |
| Backend Utils | `backend/app/utils/rpc_helpers.py` | `unwrap_rpc_single()` / `unwrap_rpc_list()` for RPC response normalization |
| Frontend Drawers | `frontend/src/components/dashboard/ModifierGroupDrawer.tsx` | Unified modifier group drill-down (protection + opportunity) |
| Frontend Drawers | `frontend/src/components/dashboard/CategoryDetailDrawer.tsx` | Category drill-down drawer (protection) |
| Frontend Tables | `frontend/src/components/dashboard/DataExplorer.tsx` | Generic data table with row click, pagination, footer |
| Frontend Hooks | `frontend/src/hooks/useApi.ts` | `useApi` / `useApiWithParam` — TanStack Query wrappers |
| Frontend Hooks | `frontend/src/hooks/usePersistedBrand.ts` | Cross-page brand persistence (localStorage, per-market) |
| Frontend Pages | `frontend/src/pages/BrandProtection.tsx` | Protect page (brand health, categories, modifier groups) |
| Frontend Pages | `frontend/src/pages/CategoryOpportunities.tsx` | Discover page (non-branded + competitor opportunities) |

### Adding a New Dashboard Endpoint

1. **Create RPC function** in Supabase SQL Editor (or via `mcp__supabase__apply_migration`):
```sql
CREATE OR REPLACE FUNCTION get_my_data(p_market_id TEXT, p_brand_name TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (SELECT json_build_object('field', value) FROM ...);
END;
$$;
```
2. **Add Pydantic schema** in `backend/app/schemas.py`
3. **Add service method** in appropriate service file
4. **Add router endpoint** in `backend/app/routers/dashboard.py`
5. **Add TypeScript type** in `frontend/src/types/index.ts`
6. **Add API function** in `frontend/src/api/endpoints.ts`

### RPC Response Handling Pattern

Use the helpers in `backend/app/utils/rpc_helpers.py` to normalize responses:

```python
from app.utils.rpc_helpers import unwrap_rpc_single, unwrap_rpc_list

# Single object response (e.g., KPIs, dashboard aggregations)
result = client.rpc("get_kpis", {"p_market_id": market_id}).execute()
data = unwrap_rpc_single(result.data, "get_kpis")

# List response (e.g., categories, modifier groups, competitors)
result = client.rpc("get_items", {"p_market_id": market_id}).execute()
items = unwrap_rpc_list(result.data)
```

Supabase RPC can return data in multiple formats (direct dict, list-wrapped, function-name-wrapped). These helpers handle all cases. **Always use them** — manual `if isinstance(data, list)` checks miss the function-name wrapper and cause empty results.

### Async RPC Parallelism

The Supabase Python client is **synchronous**. To parallelize multiple RPC calls (e.g., in market overview which calls 10+ RPCs), wrap calls with `asyncio.to_thread()` and use `asyncio.gather()`:

```python
import asyncio

async def _rpc(self, function_name: str, params: dict):
    """Wrap sync Supabase call for true async parallelism."""
    return await asyncio.to_thread(
        lambda: self.client.rpc(function_name, params).execute()
    )

# Run independent RPCs in parallel
results = await asyncio.gather(
    self._rpc("get_share_of_search", params),
    self._rpc("get_protection_kpis", params),
    self._rpc("get_loss_distribution", params),
    return_exceptions=True,  # Don't fail all if one fails
)
```

This pattern is used in both `supabase_analytics.py` and `supabase_market_analytics.py`. It reduces page load times from sum-of-RPCs to max-of-RPCs (e.g., Market Overview: ~20s sequential to ~3s parallel, Protect: ~5s sequential to ~1s parallel).

**Key rule**: Any dashboard method that calls 2+ independent RPCs should use `asyncio.gather()`. Handle failures gracefully with `return_exceptions=True` and fallback defaults for each result.

### Creating or Modifying RPC Functions (DDL)

The Supabase MCP tool and REST API cannot execute DDL (CREATE FUNCTION, etc.). Use `psycopg2` with the `DATABASE_URL` from `backend/.env`:

```python
import psycopg2, os
from dotenv import load_dotenv
load_dotenv()
db_url = os.getenv('DATABASE_URL', '').replace('postgresql+psycopg://', 'postgresql://')
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()
cur.execute("CREATE OR REPLACE FUNCTION ...")
cur.close()
conn.close()
```

## Frontend Architecture

### Routing (React Router v6)

Four main sections in the sidebar:
- `/` — Home (quick pulse dashboard)
- `/protect` — Brand Protection
- `/discover` — Category Opportunities
- `/analyze` — Market Overview

Legacy redirects exist for old bookmarks (e.g., `/market-overview` → `/analyze`).

### Key Patterns

**Path alias**: `@/` maps to `frontend/src/` (configured in `vite.config.ts` and `tsconfig.json`).

**Market context**: `MarketConfigContext` provides market config + domain type styling to all components. Use the `useMarketConfig()` hook:
```tsx
const { currentMarketId, availableMarkets, setCurrentMarket, getStyles, getIcon } = useMarketConfig();
// Domain type styling - NEVER hardcode domain types
const styles = getStyles(competitor.domain_type);
const Icon = getIcon(competitor.domain_type);
```

**API client** (axios): Request interceptor auto-adds `X-Market-ID` header + `market_id` query param + cache-bust `_t` timestamp on all requests. Dev server proxies `/api` to `http://localhost:8000`.

**Drawer pattern**: All drill-down detail views use side-panel drawers (slide-in from right, escape key, overlay click-to-close, body scroll lock). Click any table row on any page to open a drawer with detailed breakdown. Two unified, context-aware drawer components handle all drill-downs:

- **`ModifierGroupDrawer`** (`frontend/src/components/dashboard/ModifierGroupDrawer.tsx`) — Used by both Protect and Opportunities pages. Accepts a `context: 'protection' | 'opportunity'` prop to switch between win/loss metrics (protection) and capture/uncapture metrics (opportunity). Also accepts `keywordType?: 'nonbranded' | 'competitor_branded'` for the opportunity context. Contains hero stats with SVG progress ring, tabbed content (Values/Tags, Competitors, Keywords), and custom CSS visualizations.
- **`CategoryDetailDrawer`** (`frontend/src/components/dashboard/CategoryDetailDrawer.tsx`) — Used by the Protect page for category breakdowns. Accepts `context: 'protection' | 'opportunity'` prop. Contains hero stats, tabbed content (Values, Competitors, Keywords), and custom CSS visualizations.
- **Base `Drawer`** (`frontend/src/components/common/Drawer.tsx`) — Low-level reusable shell that both drawers build on.

**DataExplorer** (`frontend/src/components/dashboard/DataExplorer.tsx`): Generic table component used for all data tables on Protect page. Accepts typed columns via `ExplorerColumn<T>[]`, supports row click handlers (for opening drawers), pagination via "Show More", optional footer, and loading states. Styled with `rounded-xl border border-gray-200`.

**Data fetching (TanStack Query)**: All API data flows through TanStack Query (`@tanstack/react-query`). The `QueryClientProvider` wraps the app in `App.tsx` with these defaults:
- `staleTime: 5 min` — data stays fresh for 5 minutes (only changes after imports)
- `gcTime: 10 min` — cached data kept for 10 minutes
- `retry: 2` — failed queries retry twice automatically
- `refetchOnWindowFocus: false` — no background refetches

Hooks in `frontend/src/hooks/useApi.ts` wrap TanStack Query while preserving the `{ data, loading, error, refetch }` return shape:
```tsx
// Generic fetch (used by pages that call parameterless endpoints)
const { data, loading, error, refetch } = useApi(fetchFn, dependencies);

// Fetch with nullable param (disabled when param is null)
const { data, loading, error, refetch } = useApiWithParam(fetchFn, param, dependencies);
```
Both hooks auto-prefix query keys with the current market ID from localStorage, preventing cross-market cache collisions. Pages like Home, BrandProtection, and CategoryOpportunities use these hooks. MarketOverview and drawers use `useQuery` directly.

When switching markets, `MarketConfigContext.setCurrentMarket()` calls `queryClient.invalidateQueries()` to clear all cached data.

**Brand persistence**: `usePersistedBrand()` (`frontend/src/hooks/usePersistedBrand.ts`) stores the selected brand in `localStorage` scoped per market (`selectedBrand_{marketId}`). Used by Home, BrandProtection, and CategoryOpportunities. Switching markets reads that market's stored brand; switching back restores the previous selection.
```tsx
const [selectedBrand, setSelectedBrand] = usePersistedBrand();
```

**Shared formatters** (`frontend/src/utils/formatters.ts`): Use `formatNumber()` for exact counts, `formatCompactNumber()` for abbreviated volume (e.g., "1.2M"), and `formatPercent()` for percentages. Never create local formatting functions in components.

### shadcn/ui Component System

The frontend uses [shadcn/ui](https://ui.shadcn.com/) — a collection of copy-pasted Radix UI components styled with Tailwind CSS. Config: `frontend/components.json`. Utility: `cn()` from `@/lib/utils`.

**Available components** (in `frontend/src/components/ui/`):
- `card.tsx` — Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
- `button.tsx` — Button (variants: default, destructive, outline, secondary, ghost, link)
- `badge.tsx` — Badge (variants: default, secondary, destructive, outline)
- `input.tsx` — Input
- `select.tsx` — Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- `tabs.tsx` — Tabs, TabsList, TabsTrigger, TabsContent (value-based, not index-based)
- `table.tsx` — Table, TableHeader, TableHead, TableRow, TableBody, TableCell
- `chart.tsx` — ChartContainer, ChartTooltip, ChartTooltipContent (Recharts wrapper)
- `combobox.tsx` — Combobox (custom: Command + Popover, replaces search-select pattern)
- `command.tsx`, `popover.tsx`, `dialog.tsx`, `separator.tsx`, `tooltip.tsx`

**Usage patterns**:
```tsx
// Card
import { Card, CardContent } from '@/components/ui/card';
<Card><CardContent className="pt-6">...</CardContent></Card>
// Or plain: <div className="rounded-xl border border-gray-200 p-6">

// Tabs (value-based, NOT index-based)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
<Tabs defaultValue="wins">
  <TabsList><TabsTrigger value="wins">Wins</TabsTrigger></TabsList>
  <TabsContent value="wins">...</TabsContent>
</Tabs>

// Select (compound component)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
<Select value={v} onValueChange={set}>
  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
  <SelectContent><SelectItem value="x">X</SelectItem></SelectContent>
</Select>

// Combobox (searchable select)
import { Combobox } from '@/components/ui/combobox';
<Combobox options={[{ value: 'x', label: 'X' }]} value={v} onValueChange={set} />

// Charts (Recharts + shadcn wrapper)
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <BarChart data={data}><Bar dataKey="value" /></BarChart>
</ChartContainer>

// cn() utility for conditional classes
import { cn } from '@/lib/utils';
<div className={cn("base-class", isActive && "active-class")} />
```

### Visual Design System

The UI follows a clean, minimal aesthetic. All components must follow these rules:

| Aspect | Pattern |
|--------|---------|
| Body background | White `#FFFFFF` |
| Card container | `rounded-xl border border-gray-200` (no shadows) |
| Card hover | `hover:border-gray-300` (no shadow-xl, no scale-105) |
| Icon boxes | `w-8 h-8 rounded-lg bg-{color}-50 text-{color}-600` (flat, no gradients) |
| Section titles | `text-lg font-semibold` |
| Page titles | `text-gray-900` plain text (no gradient text) |
| KPI values | `text-2xl font-semibold text-gray-900` |
| Badges | `bg-{color}-50 text-{color}-600 font-medium` |
| Progress bars | Solid `bg-{color}-500` (no gradients) |
| Sidebar | `bg-white border-r border-gray-200` |
| Animations | `initial={{ opacity: 0 }}` (no y-slide); stagger `delay: idx * 0.03` |

**Never use**: gradient text (`bg-clip-text`), glass morphism (`backdrop-blur`), glow effects (`shadow-xl`, `blur-xl`), heavy transforms (`hover:scale-105`), or dark sidebar gradients.

## Backend Architecture

### Middleware Stack (order matters)

1. **CORSMiddleware** — Configurable via `CORS_ORIGINS` env or `CORS_ALLOW_ALL=true`
2. **NoCacheMiddleware** — Adds `Cache-Control: no-store` to `/api/*` responses
3. **MarketContextMiddleware** — Extracts `market_id` from: path param → query param → `X-Market-ID` header → default. Stores in Python `ContextVar` for thread-safe access.

### Entry Points

- `backend/app/main.py` — Local development (has lifespan handler for DB init/cleanup)
- `api/index.py` — Vercel serverless (NO lifespan handler — Vercel doesn't support startup/shutdown hooks)

### Router Hierarchy

All routes prefixed with `/api`:
- `/api/markets/` — List markets, get market config
- `/api/brands/` — Brand CRUD and domain mapping
- `/api/config/` — Market configuration
- `/api/keywords/` — Keyword search and filtering
- `/api/dashboard/` — Main dashboard aggregations (home, brand-protection, market-overview, category-opportunities, breakdowns)

## RPC Function Design Rules

### Brand Domain Lookups: Use ALL Domains
A brand wins a keyword if **ANY** of its domains holds position 1, not just a "primary" one. Never filter `brand_domains` by `is_primary = true` in win/loss/competitor calculations. The `is_primary` flag is for display purposes only (e.g., picking a representative domain to show in a UI label).

```sql
-- CORRECT: use all brand domains
SELECT ARRAY_AGG(domain_id) INTO v_brand_domain_ids
FROM brand_domains
WHERE market_id = p_market_id AND brand_name = p_brand_name;

-- WRONG: filters out most domains, causes empty results
SELECT ARRAY_AGG(domain_id) INTO v_brand_domain_ids
FROM brand_domains
WHERE market_id = p_market_id AND brand_name = p_brand_name AND is_primary = true;
```

### Branded Keyword Identification: Use `brand_category_names`
Each market stores its brand category names in `markets.brand_category_names` (a JSON array). For example, `bicycle_us` uses `["brand"]`, while `insurance_il` uses `["insurance_company___canonical"]`. **Never hardcode `name = 'brand'`** — always look up from the markets table:

```sql
-- CORRECT: dynamic brand category lookup (works for all markets)
SELECT ARRAY_AGG(c.id) INTO v_brand_category_ids
FROM categories c
JOIN markets m ON c.market_id = m.id
WHERE m.id = p_market_id
  AND c.name = ANY(
      SELECT json_array_elements_text(m.brand_category_names::json)
  );

-- Fallback for markets without brand_category_names configured
IF v_brand_category_ids IS NULL THEN
    v_brand_category_ids := ARRAY(
        SELECT id FROM categories
        WHERE market_id = p_market_id AND name = 'brand'
    );
END IF;

-- WRONG: hardcoded, only works for bicycle_us
WHERE c.name = 'brand'
```

### Only Compute What the Frontend Renders
RPC functions should not return fields that no frontend component displays. Before adding a field to an RPC, verify a component actually renders it. Summary RPCs should not compute data that only the breakdown/detail RPC needs — the detail drawer calls its own separate RPC.

### Domain Types Vary Per Market
Each market has its own domain types (e.g., bicycle_us uses "Brand", "Retailer", "UGC", "3rd Party" while insurance_il uses "Insurance Company", "Insurance Agent", "Comparison Platform", "UGC", "3rd Party"). Never hardcode domain type names — always query `market_domain_types` or `brand_domains` filtered by `market_id`.

### Winner Lookups: Always Use `organic_winners`
All "who won keyword X?" queries must JOIN the `organic_winners` materialized view instead of filtering `serp_results` directly. This ensures:
- Correct column: `rank_group = 1` (not `rank_absolute = 1`)
- Organic only: excludes paid ads and featured snippets
- Performance: scans ~100K rows instead of 1.8M

```sql
-- CORRECT: use organic_winners for winner lookups
JOIN organic_winners ow ON ow.keyword_id = k.id

-- WRONG: scanning full serp_results with rank_absolute (wrong column)
JOIN serp_results sr ON sr.keyword_id = k.id AND sr.rank_absolute = 1

-- WRONG: scanning full serp_results even with correct column (slow, no organic filter)
JOIN serp_results sr ON sr.keyword_id = k.id AND sr.rank_group = 1
```

**When to keep using `serp_results`**: Only for "what position does domain X have for keyword Y?" — i.e., looking up a specific domain's rank, not finding the winner. Example:
```sql
-- This is NOT a winner lookup — it's a position lookup. Keep serp_results.
LEFT JOIN serp_results sr ON sr.keyword_id = k.id
    AND sr.domain_id = ANY(v_brand_domain_ids)
```

### `rank_group` vs `rank_absolute`
- **`rank_group`**: Position within a result type (e.g., 1st organic result = rank_group 1). Use this for "who won" logic.
- **`rank_absolute`**: Position on the full SERP page including all result types. Use this for display only (e.g., showing "Position 3" in the UI).
- The `organic_winners` view is built on `rank_group = 1 AND result_type = 'organic'`, so JOINing it automatically uses the correct semantics.

### Never Filter `brand_domains` by `domain_type` in Win/Loss Calculations
A brand wins a keyword if ANY of its domains holds position 1, regardless of which domain_type that domain has. Never add `AND domain_type = '...'` when building the set of brand domain IDs for win/loss calculations.

```sql
-- CORRECT: all brand domains participate in win detection
JOIN brand_domains bd ON bk.brand_name = bd.brand_name
    AND bd.market_id = p_market_id
JOIN organic_winners ow ON ow.keyword_id = bk.keyword_id
    AND ow.domain_id = bd.domain_id

-- WRONG: excludes domains that aren't the "brand" type
JOIN brand_domains bd ON bk.brand_name = bd.brand_name
    AND bd.market_id = p_market_id
    AND bd.domain_type = v_brand_type_name  -- BUG: misses wins from other domain types
```

### Performance: Large Market Queries
For markets with 1M+ SERP results (e.g., bicycle_us has 1.8M rows):

**Use `organic_winners` for all winner lookups.** This is the single most impactful optimization — it reduced the slowest RPC from 5.5s to 2.9s.

**Use direct JOINs, not `ANY(array)`:**
```sql
-- GOOD: direct JOIN — Postgres can use hash/merge joins
JOIN brand_domains bd ON bk.brand_name = bd.brand_name AND bd.market_id = p_market_id
JOIN organic_winners ow ON ow.keyword_id = bk.keyword_id AND ow.domain_id = bd.domain_id

-- BAD: ANY(array) forces nested loop joins on large datasets
JOIN organic_winners ow ON ow.keyword_id = bk.keyword_id
    AND ow.domain_id = ANY(bdm.domain_ids)
```

**Use `ROW_NUMBER()` for top-N per group:** When you need "top 20 domains per domain_type", don't compute all winners then `LIMIT`. Instead:
```sql
SELECT *, ROW_NUMBER() OVER (PARTITION BY domain_type ORDER BY volume_captured DESC) as rn
FROM all_winners
-- Then: WHERE rn <= 20
```

**Additional rules:**
- Use covering indexes for frequently joined columns: `CREATE INDEX ON serp_results (domain_id, keyword_id, rank_absolute)` enables index-only scans
- Vercel serverless has a 10-second timeout; Supabase `anon` and `authenticator` roles have `statement_timeout=30s`
- Always benchmark new RPCs against `bicycle_us` (the largest market) using `EXPLAIN ANALYZE`
- If an RPC takes >2s on `bicycle_us`, it will likely cause timeouts when called in parallel with other slow RPCs via `asyncio.gather()`

## Common Mistakes to Avoid

### 1. Frontend/Backend Type Mismatch (CRITICAL)
**Problem**: Backend returns different field names or structure than frontend expects.
**Solution**: Always verify TypeScript types in `frontend/src/types/index.ts` match Pydantic schemas in `backend/app/schemas.py`.

### 2. Missing Endpoints for Drill-Down Views
**Problem**: Frontend calls breakdown/drill-down endpoint that doesn't exist (404 errors).
**Solution**: When adding a list/summary endpoint, always implement the corresponding breakdown endpoint if the frontend has a drawer detail view.

### 3. RPC Function Timeouts
**Problem**: Complex correlated subqueries in RPC functions timeout on Vercel (10s limit).
**Solution**: Use separate SELECT statements and aggregate with `json_agg`/`json_object_agg` instead of correlated subqueries.

### 4. Stub Methods Returning Empty Data
**Problem**: Service methods return `[]` as stubs, causing "0 items" in dashboard.
**Solution**: Always implement the RPC call when adding a service method; don't leave stubs.

### 5. Missing Fields in Dashboard Aggregations
**Problem**: Dashboard endpoint doesn't call all required service methods.
**Solution**: Check Pydantic schema for all required fields and fetch each.

### 6. Modifying RPC Functions Without Updating All Three Layers
**Problem**: Changing an RPC's return shape without updating the Pydantic schema and TypeScript type (or vice versa).
**Solution**: Any RPC change must be reflected in all three: (1) the SQL function, (2) `backend/app/schemas.py`, (3) `frontend/src/types/index.ts`. Also update the backend service mapping in the appropriate service file.

### 7. Hardcoding Brand Category Name
**Problem**: RPC uses `WHERE c.name = 'brand'` to find branded keywords, but this only works for `bicycle_us`. Other markets use different brand category names (e.g., `insurance_company___canonical`).
**Solution**: Look up `brand_category_names` from the `markets` table. See "Branded Keyword Identification" in RPC Design Rules.

### 8. Manual RPC Unwrapping Instead of Helpers
**Problem**: Using manual `if isinstance(data, list): data = data[0]` to unwrap RPC responses misses the function-name wrapper (`{"function_name": {...}}`), causing `data.get("field")` to return `None`.
**Solution**: Always use `unwrap_rpc_single(result.data, "function_name")` or `unwrap_rpc_list(result.data)` from `backend/app/utils/rpc_helpers.py`.

### 9. Using `rank_absolute` Instead of `rank_group` for Winner Detection
**Problem**: `rank_absolute = 1` means "first result on the page" which could be a paid ad or featured snippet, not the top organic result. This pollutes win/loss calculations with non-organic results.
**Solution**: Never use `rank_absolute = 1` for winner detection. Use `organic_winners` which is built on `rank_group = 1 AND result_type = 'organic'`. See "Winner Lookups" in RPC Design Rules.

### 10. Using `ANY(array)` for Brand Domain Matching on Large Datasets
**Problem**: `WHERE ow.domain_id = ANY(ARRAY_AGG(domain_id))` forces PostgreSQL into nested loop joins, causing 3-5 second query times on large markets.
**Solution**: Use direct JOINs to `brand_domains` instead. This lets Postgres choose hash or merge joins. See "Performance: Large Market Queries" in RPC Design Rules.

### 11. Filtering `brand_domains` by `domain_type` in Win/Loss Calculations
**Problem**: Adding `AND domain_type = v_brand_type_name` when collecting brand domain IDs excludes legitimate brand domains of other types, causing missed wins and inflated loss counts.
**Solution**: Always use ALL brand domains for win/loss detection. The `domain_type` field is for categorization/display, not for filtering win eligibility. See "Never Filter brand_domains by domain_type" in RPC Design Rules.

### 12. Sequential RPC Calls in Dashboard Methods
**Problem**: Dashboard methods that call 3-6 RPCs sequentially (with `await` on each) multiply total response time. A page calling 5 RPCs at 500ms each takes 2.5s sequentially.
**Solution**: Use `asyncio.gather()` with `return_exceptions=True` to run independent RPCs in parallel. Total time becomes max(individual RPCs) instead of sum. Both `supabase_analytics.py` and `supabase_market_analytics.py` use this pattern.

### 13. Slow RPCs Causing Silent Data Loss via Timeouts
**Problem**: Supabase PostgREST `anon`/`authenticator` roles have a 30-second statement timeout. When multiple slow RPCs run in parallel via `asyncio.gather()`, they can all hit the timeout simultaneously. Exception handlers silently return default empty objects (e.g., `MarketProtectionKPIs()` with all zeros), making it look like the data is empty rather than an error.
**Solution**: Keep all RPCs under 2 seconds on the largest market. Use `organic_winners` materialized view, direct JOINs, and `ROW_NUMBER()` to optimize. Always benchmark with `EXPLAIN ANALYZE SELECT function_name('bicycle_us', ...)` before deploying.

## Multi-Market System

The application supports multiple isolated markets (e.g., `insurance_il`, `bicycle_us`). Each market has its own data, custom domain types with unique styling, and configurable brand categories.

**Key Principle**: Always filter by `market_id`, never mix market data.

### Market Selection Flow
- Users select markets via sidebar dropdown (persists in localStorage as `selectedMarketId`)
- Frontend auto-injects `X-Market-ID` header + `market_id` query param on all API requests
- Backend `MarketContextMiddleware` extracts market ID and sets in `ContextVar`

### Adding a New Market

```bash
cd scripts
python import_data.py --create-config --market new_market_id
# Edit source_data/new_market_id/config.json
# Add keywords.csv and serp.json
python import_data.py --market new_market_id
python map_brands.py --market new_market_id  # 3-phase: manual → heuristic → AI
```

### Large Dataset Import

- Batch size of 2,000 for SERP results (avoids Supabase statement timeouts)
- Retry logic with exponential backoff on batch failures
- Subquery-based deletions (avoids PostgreSQL's 65,535 parameter limit)

## Database Schema (Core Tables)

All tables have `market_id` for multi-tenant isolation:
- `markets` — Market definitions
- `market_domain_types` — Domain types per market (brand, reseller, UGC, 3rd party)
- `keywords` — Keyword + volume + modifier_group
- `domains` — Unique domains from SERP
- `serp_results` — Rankings per keyword
- `brand_domains` — Brand-domain mapping with domain_type

### Materialized View: `organic_winners`

Pre-computed view of organic rank_group=1 winners (~100K rows instead of scanning 1.8M `serp_results`). All RPC functions JOIN this view instead of filtering `serp_results` directly for winner lookups.

```sql
-- One row per keyword: the organic rank_group=1 winner
CREATE MATERIALIZED VIEW organic_winners AS
SELECT sr.keyword_id, sr.domain_id, sr.rank_absolute, sr.url
FROM serp_results sr
WHERE sr.rank_group = 1 AND sr.result_type = 'organic';

-- Indexes (already created):
-- ix_organic_winners_keyword (UNIQUE) — "who won keyword X?"
-- ix_organic_winners_domain — "which keywords did domain X win?"
-- ix_organic_winners_keyword_domain — composite for JOIN patterns
```

**Columns available**: `keyword_id`, `domain_id`, `rank_absolute` (for display), `url` (for `get_brand_wins`).

**Refresh requirement**: The view must be refreshed after any SERP data import. The import scripts (`run_full_import` and `import_data.py`) do this automatically. For manual refresh:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY organic_winners;
```

**Rule**: Use `organic_winners` for "who won keyword X?" lookups. Keep `serp_results` for "what position does domain X have for keyword Y?" lookups (specific domain position queries, not winner queries).

**Adding new RPCs**: Any new RPC that needs to determine keyword winners MUST use `organic_winners`, not `serp_results`. This is the most important performance and correctness rule for this codebase.

## Vercel Deployment

**Live**: https://keyword-serp-dashboard.vercel.app

Deployment structure:
- `api/index.py` — Vercel serverless entry point (native ASGI for FastAPI, max 50MB lambda)
- `vercel.json` — Routes `/api/*` to Python, everything else to React static build
- `frontend/package.json` — Built via `@vercel/static-build` (output: `dist/`)

### Environment Variables (Vercel)
Set via `vercel env add` (use `printf` not `echo` to avoid trailing newlines):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DEFAULT_MARKET_ID`
- `CORS_ALLOW_ALL=true`

### Data Updates
Import scripts run locally and connect directly to Supabase. Data appears immediately in the live app (no redeploy needed):
```bash
python scripts/import_data.py --market insurance_il
```

## Environment Variables

### Backend (`backend/.env`)
```bash
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJ...
DEFAULT_MARKET_ID=insurance_il
CORS_ORIGINS=["http://localhost:5173"]
ANTHROPIC_API_KEY=sk-ant-api03-xxx  # For brand-domain mapping
```

### Frontend (`frontend/.env`)
```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## Coding Standards

- **Python**: PEP 8, type hints, async/await
- **TypeScript**: Strict mode, explicit types, functional components
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`)
- **Markets**: Always filter by `market_id`
