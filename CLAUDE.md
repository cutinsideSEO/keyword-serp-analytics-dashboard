# Keyword & SERP Analytics Dashboard

A comprehensive analytics platform for keyword rankings and SERP data with AI-powered brand-domain classification, multi-market support, and multi-dimensional performance insights.

## Quick Start

```bash
# 1. Backend Setup
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Edit backend/.env with Supabase credentials

# 2. Import Data (specify market)
cd scripts
python import_data.py --market insurance_il
python map_brands.py --market insurance_il

# 3. Start Backend (from backend directory)
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# 4. Start Frontend (new terminal)
cd frontend
npm install
npm run dev
```

**Dashboard**: http://localhost:5173 | **API Docs**: http://localhost:8000/docs

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    Supabase      │
│  React + Vite   │◀────│    FastAPI      │◀────│   PostgreSQL     │
│  Tremor + TS    │     │    Python 3.11  │     │  Multi-market    │
└─────────────────┘     └─────────────────┘     └──────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │   Claude API     │
                      │  Domain Mapping  │
                      └──────────────────┘
```

## Tech Stack

| Layer    | Technology        | Purpose                          |
|----------|-------------------|----------------------------------|
| Database | Supabase/Postgres | Cloud database with multi-market |
| ORM      | SQLAlchemy 2.x    | Async database operations        |
| Backend  | FastAPI           | REST API with OpenAPI docs       |
| Frontend | React 18 + TS     | UI framework                     |
| UI       | Tremor 3.x        | Dashboard components             |
| AI       | Claude API        | Domain classification            |

---

## Multi-Market System

The application supports multiple isolated markets (e.g., insurance, bicycles). Each market has:
- Its own data (keywords, domains, brands)
- Custom domain types with unique styling
- Configurable brand categories

### Adding a New Market

Markets are defined via `config.json` files in each market folder. The import script automatically creates/updates the market in Supabase.

**1. Create config template:**
```bash
cd scripts
python import_data.py --create-config --market electronics_us
```

**2. Edit `source_data/electronics_us/config.json`:**
```json
{
  "market": {
    "name": "US Electronics Market",
    "industry_context": "Consumer electronics retail",
    "language": "en",
    "text_direction": "ltr",
    "brand_category_names": ["Brand - Canonical"]
  },
  "domain_types": [
    {
      "type_id": "brand",
      "display_name": "Brand",
      "ai_description": "Official brand website selling their own products",
      "is_brand_type": true,
      "color": "blue",
      "icon": "Building2",
      "examples": ["apple.com", "samsung.com"]
    },
    {
      "type_id": "retailer",
      "display_name": "Retailer",
      "ai_description": "Multi-brand retailers",
      "is_brand_type": false,
      "color": "purple",
      "icon": "ShoppingCart",
      "examples": ["amazon.com", "bestbuy.com"]
    }
  ]
}
```

**3. Add data files and import:**
```bash
# Add keywords.csv and serp.json to source_data/electronics_us/
python import_data.py --market electronics_us
python map_brands.py --market electronics_us
```

**Color Presets** (just specify `"color": "blue"` - styling is auto-generated):
| Color | Use Case |
|-------|----------|
| blue | Brand (primary) |
| purple | Comparison/Aggregator |
| orange | Reseller |
| amber | UGC |
| emerald | 3rd Party |
| teal, rose, indigo, cyan, gray | Additional options |

### Market Selection
- Users select markets via the sidebar dropdown
- Selection persists in localStorage
- All API requests include `market_id` automatically
- Frontend uses `X-Market-ID` header + query param

---

## Project Structure

```
NewDashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + middleware
│   │   ├── config.py            # Supabase settings
│   │   ├── database.py          # PostgreSQL connection
│   │   ├── models.py            # ORM models with market_id
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── middleware/
│   │   │   └── market_context.py # Market context middleware
│   │   ├── routers/
│   │   │   ├── markets.py       # Market CRUD + config
│   │   │   ├── brands.py        # Brand CRUD
│   │   │   ├── keywords.py      # Keyword search
│   │   │   └── dashboard.py     # Analytics endpoints
│   │   └── services/
│   │       ├── analytics.py     # Brand protection analytics
│   │       ├── market_analytics.py  # Market-wide analytics
│   │       ├── market_setup.py  # Config-based market setup
│   │       └── data_import.py   # Data import service
│   └── .env                     # Supabase credentials
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── BrandProtection.tsx
│       │   ├── MarketOverview.tsx
│       │   ├── CategoryOpportunities.tsx
│       │   └── Config.tsx
│       ├── components/
│       │   ├── layout/Sidebar.tsx    # Market selector
│       │   └── common/MarketSelector.tsx
│       ├── contexts/
│       │   └── MarketConfigContext.tsx  # Multi-market context
│       └── api/
│           └── client.ts        # Axios with market_id injection
│
└── scripts/
    ├── import_data.py           # CSV/JSON import (--market required)
    └── map_brands.py            # AI brand-domain mapping
```

---

## Database Schema

### Core Tables (all have market_id)

| Table | Purpose |
|-------|---------|
| `markets` | Market definitions |
| `market_domain_types` | Domain types per market |
| `keywords` | Keyword + volume + modifier_group |
| `categories` | Tag categories from CSV columns |
| `keyword_tags` | Keyword - category values (many-to-many) |
| `domains` | Unique domains from SERP |
| `serp_results` | Rankings per keyword |
| `brand_domains` | Brand - domain mapping with domain_type |

### Domain Types
Configured per market in `market_domain_types` table:
- **Brand**: Official brand website
- **Reseller**: Multi-brand aggregators
- **UGC**: User-generated content
- **3rd Party**: Review sites, affiliates, news

---

## API Endpoints

### Markets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/markets` | List all active markets |
| GET | `/api/markets/{id}/config` | Get market config + domain types |

### Brands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands` | List brands (filtered by market) |
| GET | `/api/brands/{name}` | Brand details + domains |

### Brand Protection
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/brand-protection?brand=X` | Full dashboard |
| GET | `/api/dashboard/brand-protection/kpis?brand=X` | KPIs only |
| GET | `/api/dashboard/brand-protection/wins?brand=X` | Winning keywords |
| GET | `/api/dashboard/brand-protection/losses?brand=X` | Lost keywords |

### Market Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/market-overview` | Full market dashboard |
| GET | `/api/dashboard/market-overview/share-of-search` | Brand demand |

### Category Opportunities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/category-opportunities?brand=X` | Non-branded |
| GET | `/api/dashboard/competitor-branded-opportunities?brand=X` | Competitor |

---

## Environment Variables

### Backend (`backend/.env`)
```bash
# Supabase PostgreSQL connection
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase API (optional, for direct API access)
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Default market
DEFAULT_MARKET_ID=insurance_il

# CORS
CORS_ORIGINS=["http://localhost:5173"]

# Claude API (for brand-domain mapping)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### Frontend (`frontend/.env`)
```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Development

### Restart Commands
```bash
# Backend
cd backend && ./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

### Import Data

Data is organized by market in `source_data/` folders. **config.json is required** for each market:
```
source_data/
├── insurance_il/
│   ├── config.json       <- REQUIRED: Market + domain type definitions
│   ├── keywords.csv
│   ├── serp.json
│   └── mappings.json     <- Optional: Manual brand-domain mappings
└── new_market/
    ├── config.json       <- Must create before first import
    ├── keywords.csv
    └── serp.json
```

Import commands:
```bash
cd scripts
python import_data.py --list                          # List available markets
python import_data.py --create-config --market new    # Create config template
python import_data.py --market insurance_il           # Import one market
python import_data.py --all                           # Import all markets
python map_brands.py --market insurance_il            # AI domain mapping
```

### Frontend: useMarketConfig() hook
```tsx
const {
  currentMarketId,
  availableMarkets,
  setCurrentMarket,
  getStyles,
  getIcon
} = useMarketConfig();

// Domain type styling
const styles = getStyles(competitor.domain_type);
const Icon = getIcon(competitor.domain_type);
```

**IMPORTANT**: Never hardcode domain types. Always use the context.

---

## Deployment Architecture (Vercel + Supabase)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Your Computer   │     │     Vercel       │     │    Supabase      │
│                  │     │                  │     │                  │
│  source_data/    │     │  Frontend (React)│     │   PostgreSQL     │
│  ├── market_a/   │     │  Backend (FastAPI│────▶│   Database       │
│  └── market_b/   │     │    on Vercel)    │     │                  │
│                  │     │                  │     │  - markets       │
│  import_data.py ─┼─────┼──────────────────┼────▶│  - keywords      │
│  (runs locally)  │     │                  │     │  - serp_results  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### How It Works
1. **Vercel** hosts the app (frontend + API)
2. **Supabase** hosts the database (cloud PostgreSQL)
3. **Import scripts run locally** on your computer, connecting directly to Supabase

### Data Update Workflow
1. Place new data files in `source_data/{market_id}/`
2. Run import script locally (connects to Supabase):
   ```bash
   python scripts/import_data.py --market insurance_il
   ```
3. Data appears immediately in the live Vercel app

### Why This Works
- Import scripts use the same `DATABASE_URL` as the deployed app
- Both your local machine and Vercel connect to the same Supabase database
- No need to redeploy Vercel when updating data

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Check Supabase credentials in .env |
| No markets in dropdown | Verify `markets` table has data |
| Brand picker empty | Run `import_data.py --market X` |
| No domain mapping | Run `map_brands.py --market X` |
| Wrong market data | Check `market_id` filter in queries |

---

## Coding Standards

- **Python**: PEP 8, type hints, async/await, SQLAlchemy ORM
- **TypeScript**: Strict mode, explicit types, functional components
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`)
- **SQL**: Parameterized queries only, proper indexes
- **Markets**: Always filter by `market_id`, never mix market data

---

**Built with Claude Code**
