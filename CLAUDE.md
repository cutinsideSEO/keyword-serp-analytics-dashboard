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
│  Tremor + TS    │     │    Python 3.11  │     │  Multi-market    │
└─────────────────┘     └─────────────────┘     └──────────────────┘
         │                      │
   TypeScript types      Pydantic schemas        RPC functions
   frontend/src/types    backend/app/schemas     Supabase Dashboard
```

| Layer    | Technology                   | Purpose                          |
|----------|------------------------------|----------------------------------|
| Database | Supabase/Postgres            | Cloud database with multi-market |
| Backend  | FastAPI + Python 3.11        | REST API with OpenAPI docs       |
| Frontend | React 18 + TypeScript        | UI framework                     |
| UI       | Tremor 3.x + Tailwind CSS    | Dashboard components + styling   |
| Animation| Framer Motion                | Sidebar, drawer, card transitions|
| Icons    | Lucide React                 | Icon library                     |
| AI       | Claude API                   | Domain classification            |

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

This pattern is used in `supabase_market_analytics.py` and reduces the total Market Overview load time from ~20s (sequential) to ~1s (parallel).

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

- **`ModifierGroupDrawer`** (`frontend/src/components/dashboard/ModifierGroupDrawer.tsx`) — Used by both Protect and Opportunities pages. Accepts a `context: 'protection' | 'opportunity'` prop to switch between win/loss metrics (protection) and capture/uncapture metrics (opportunity). Also accepts `keywordType?: 'nonbranded' | 'competitor_branded'` for the opportunity context. Contains hero stats with SVG progress ring, tabbed content (Values/Tags, Competitors, Keywords), and custom CSS visualizations (no Tremor charts).
- **`CategoryDetailDrawer`** (`frontend/src/components/dashboard/CategoryDetailDrawer.tsx`) — Used by the Protect page for category breakdowns. Accepts `context: 'protection' | 'opportunity'` prop. Contains hero stats, tabbed content (Values, Competitors, Keywords), and custom CSS visualizations replacing Tremor BarChart/DonutChart.
- **Base `Drawer`** (`frontend/src/components/common/Drawer.tsx`) — Low-level reusable shell that both drawers build on.

**DataExplorer** (`frontend/src/components/dashboard/DataExplorer.tsx`): Generic table component used for all data tables on Protect page. Accepts typed columns via `ExplorerColumn<T>[]`, supports row click handlers (for opening drawers), pagination via "Show More", optional footer, and loading states. Custom styled card (no Tremor Card dependency).

**Data fetching hooks**: `useApi(fetchFn)` and `useApiWithParam(fetchFn, param)` handle loading/error states.

**Shared formatters** (`frontend/src/utils/formatters.ts`): Use `formatNumber()` for exact counts, `formatCompactNumber()` for abbreviated volume (e.g., "1.2M"), and `formatPercent()` for percentages. Never create local formatting functions in components.

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

### Performance: Large Market Queries
For markets with 1M+ SERP results (e.g., bicycle_us has 1.6M rows):
- Use covering indexes for frequently joined columns: `CREATE INDEX ON serp_results (domain_id, keyword_id, rank_absolute)` enables index-only scans
- Use direct JOINs to `brand_domains` instead of array-based `ANY()` filters on large result sets
- Use window functions (`ROW_NUMBER() OVER (PARTITION BY ...)`) instead of N correlated subqueries
- Vercel serverless has a 10-second timeout; test RPC performance against the largest market

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
