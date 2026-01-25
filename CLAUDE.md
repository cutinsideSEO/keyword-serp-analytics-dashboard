# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Backend (from project root)
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Edit backend/.env with Supabase credentials
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend (new terminal, from project root)
cd frontend
npm install
npm run dev
```

**Dashboard**: http://localhost:5173 | **API Docs**: http://localhost:8000/docs

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

| Layer    | Technology        | Purpose                          |
|----------|-------------------|----------------------------------|
| Database | Supabase/Postgres | Cloud database with multi-market |
| Backend  | FastAPI           | REST API with OpenAPI docs       |
| Frontend | React 18 + TS     | UI framework                     |
| UI       | Tremor 3.x        | Dashboard components             |
| AI       | Claude API        | Domain classification            |

## Data Request Flow (Critical Pattern)

All dashboard data flows through Supabase RPC functions for serverless compatibility:

```
Frontend API Call → FastAPI Router → Service Method → Supabase RPC → PostgreSQL
     ↓                    ↓              ↓                ↓
  TypeScript type    Pydantic schema  .rpc() call    plpgsql function
```

### Key Files by Layer:

| Layer | File | Purpose |
|-------|------|---------|
| Frontend Types | `frontend/src/types/index.ts` | TypeScript interfaces for API responses |
| Frontend API | `frontend/src/api/endpoints.ts` | Axios calls to backend |
| Backend Router | `backend/app/routers/dashboard.py` | FastAPI endpoints |
| Backend Service | `backend/app/services/supabase_analytics.py` | Brand protection RPC calls |
| Backend Service | `backend/app/services/supabase_market_analytics.py` | Market overview RPC calls |
| Backend Schemas | `backend/app/schemas.py` | Pydantic response models |

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

Always handle both list and dict responses from RPC (Supabase can return either):

```python
if result.data:
    data = result.data
    # Handle both list and dict responses from RPC
    if isinstance(data, list) and len(data) > 0:
        data = data[0]
    # Now process data as dict
```

## Common Mistakes to Avoid

### 1. Frontend/Backend Type Mismatch (CRITICAL)
**Problem**: Backend returns different field names or structure than frontend expects.
**Example**: Backend `DomainWinnerItem` returned `win_count` but frontend `DomainVisibilityItem` expected `visibility_score`.
**Solution**: Always verify TypeScript types match Pydantic schemas. Frontend types are in `frontend/src/types/index.ts`, backend schemas in `backend/app/schemas.py`.

### 2. Missing Endpoints for Drill-Down Views
**Problem**: Frontend calls breakdown/drill-down endpoint that doesn't exist (404 errors).
**Example**: Frontend called `/dashboard/brand-protection/categories/{category}/breakdown` which wasn't implemented.
**Solution**: When adding a list/summary endpoint, always implement the corresponding breakdown endpoint if the frontend has expandable rows.

### 3. RPC Function Timeouts
**Problem**: Complex correlated subqueries in RPC functions timeout on Vercel (10s limit).
**Example**: `get_share_of_search` had expensive subqueries calculating per-brand stats.
**Solution**: Use separate SELECT statements and aggregate with `json_agg`/`json_object_agg` instead of correlated subqueries.

### 4. Stub Methods Returning Empty Data
**Problem**: Service methods return `[]` as stubs, causing "0 items" in dashboard.
**Solution**: Always implement RPC call when adding service method; don't leave stubs.

### 5. Missing Fields in Dashboard Aggregations
**Problem**: Dashboard endpoint doesn't call all required service methods.
**Example**: `get_brand_protection_dashboard` wasn't calling `get_losses_by_category`.
**Solution**: Check Pydantic schema for all required fields and fetch each.

## Multi-Market System

The application supports multiple isolated markets (e.g., insurance, bicycles). Each market has its own data (keywords, domains, brands), custom domain types with unique styling, and configurable brand categories.

**Key Principle**: Always filter by `market_id`, never mix market data.

### Adding a New Market

```bash
cd scripts
python import_data.py --create-config --market new_market_id  # Creates config template
# Edit source_data/new_market_id/config.json
# Add keywords.csv and serp.json
python import_data.py --market new_market_id
python map_brands.py --market new_market_id  # AI domain mapping
```

### Large Dataset Import Considerations

For markets with large SERP files (>100MB), the import uses:
- **Batch size of 2,000** for SERP results (reduced from 10,000 to avoid Supabase statement timeouts)
- **Retry logic with exponential backoff** - if a batch times out, it automatically retries with smaller chunks
- **Subquery-based deletions** - `clear_market_data()` uses SQL subqueries instead of `IN` clauses to avoid PostgreSQL's 65,535 parameter limit

Example import times:
| Market | SERP Size | Keywords | Import Time |
|--------|-----------|----------|-------------|
| insurance_il | 127 MB | 12,500 | ~15 minutes |
| bicycle_us | 778 MB | 92,344 | ~2 hours |

### Market Selection Flow
- Users select markets via sidebar dropdown (persists in localStorage)
- All API requests include `market_id` automatically
- Frontend uses `X-Market-ID` header + query param

## Database Schema (Core Tables)

All tables have `market_id` for multi-tenant isolation:
- `markets` - Market definitions
- `market_domain_types` - Domain types per market (brand, reseller, UGC, 3rd party)
- `keywords` - Keyword + volume + modifier_group
- `domains` - Unique domains from SERP
- `serp_results` - Rankings per keyword
- `brand_domains` - Brand-domain mapping with domain_type

## Vercel Deployment

**Live**: https://keyword-serp-dashboard.vercel.app

The deployment uses:
- `api/index.py` - Vercel serverless entry point (native ASGI support for FastAPI)
- `vercel.json` - Routes `/api/*` to Python, everything else to React frontend
- `pyproject.toml` - Python dependencies for Vercel

**Important**: The `api/index.py` creates the FastAPI app WITHOUT the lifespan handler (Vercel serverless doesn't support startup/shutdown hooks). For local development, use `backend/app/main.py` which has the full lifespan.

### Environment Variables (Vercel)
Set via `vercel env add` (use `printf` not `echo` to avoid trailing newlines):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DEFAULT_MARKET_ID`
- `CORS_ALLOW_ALL=true`

### Data Updates
Import scripts run locally and connect directly to Supabase:
```bash
python scripts/import_data.py --market insurance_il
```
Data appears immediately in the live app (no redeploy needed).

## Testing Endpoints

After adding/modifying endpoints, test with curl:
```bash
# Local
curl "http://localhost:8000/api/dashboard/brand-protection?brand=הראל&market_id=insurance_il"

# Production
curl "https://keyword-serp-dashboard.vercel.app/api/dashboard/market-overview?market_id=insurance_il"
```

Check Supabase logs for RPC errors:
```bash
# Via MCP
mcp__supabase__get_logs with service="postgres"
```

## Frontend: useMarketConfig() Hook

```tsx
const { currentMarketId, availableMarkets, setCurrentMarket, getStyles, getIcon } = useMarketConfig();

// Domain type styling - NEVER hardcode domain types
const styles = getStyles(competitor.domain_type);
const Icon = getIcon(competitor.domain_type);
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
