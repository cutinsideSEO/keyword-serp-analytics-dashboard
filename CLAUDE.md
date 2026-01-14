# Keyword & SERP Analytics Dashboard

A comprehensive analytics platform for keyword rankings and SERP data with AI-powered brand-domain classification and multi-dimensional performance insights.

## Quick Start

```bash
# 1. Backend Setup
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Edit backend/.env and add ANTHROPIC_API_KEY

# 2. Import Data
cd scripts
python import_data.py
python map_brands.py           # AI domain classification

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

## Project Overview

### Three Main Dashboards

#### 1. Brand Protection Dashboard
Analyze how well a brand protects its branded keywords:
- **KPI Cards**: Win/loss rates for keywords and volume
- **Competitor Analysis**: Top domains beating you on branded keywords
- **Domain Type Distribution**: Losses by type (Brand/Reseller/UGC/3rd Party)
- **Category & Modifier Breakdown**: Where you lose most
- **Win/Loss Tables**: Detailed keyword lists with search and filtering

#### 2. Market Overview Dashboard
Market-wide analytics without brand selection:
- **Share of Search**: Top brands by search volume
- **Market Players**: Top retailers and influential voices by visibility score
- **Brand Protection Snapshot**: Aggregate metrics across all brands
- **Biggest Losers**: Brands with worst protection performance
- **Category & Modifier Insights**: Market-wide breakdowns

#### 3. Category Opportunities Dashboard
Discover growth opportunities beyond branded searches:
- **Non-Branded Opportunities**: Generic keywords (no brand mention)
  - Capture rate, volume to capture, biggest opportunities
  - Expandable modifier groups with category/competitor breakdown
- **Competitor Branded Opportunities**: Keywords with competitor brand names
  - Shows competitor brands found, capture rate on competitor keywords
  - Same expandable details with lazy-loaded breakdowns

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    Database      │
│  React + Vite   │◀────│    FastAPI      │◀────│    SQLite        │
│  Tremor + TS    │     │    Python 3.11  │     │  92K+ keywords   │
└─────────────────┘     └─────────────────┘     └──────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │   Claude API     │
                      │  Domain Mapping  │
                      └──────────────────┘
```

## Tech Stack

| Layer    | Technology     | Purpose                          |
|----------|----------------|----------------------------------|
| Database | SQLite         | Local analytical queries         |
| ORM      | SQLAlchemy 2.x | Async database operations        |
| Backend  | FastAPI        | REST API with OpenAPI docs       |
| Frontend | React 18 + TS  | UI framework                     |
| UI       | Tremor 3.x     | Dashboard components             |
| AI       | Claude API     | Domain classification            |

---

## Project Structure

```
NewDashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── brands.py        # Brand CRUD
│   │   │   ├── keywords.py      # Keyword search
│   │   │   └── dashboard.py     # Analytics endpoints
│   │   ├── services/
│   │   │   ├── analytics.py     # Brand protection analytics
│   │   │   └── market_analytics.py  # Market-wide analytics
│   │   └── market_config/
│   │       └── market_config.py # Domain types per market
│   └── .env                     # ANTHROPIC_API_KEY
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── BrandProtection.tsx
│       │   ├── MarketOverview.tsx
│       │   └── CategoryOpportunities.tsx
│       ├── components/dashboard/  # Reusable components
│       ├── contexts/
│       │   └── MarketConfigContext.tsx  # Dynamic domain type styling
│       └── api/endpoints.ts       # API client functions
│
├── data/keywords.db               # SQLite database
└── scripts/
    ├── import_data.py             # CSV/JSON import
    └── map_brands.py              # AI brand-domain mapping
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `keywords` | Keyword + volume + modifier_group |
| `categories` | Tag categories from CSV columns |
| `keyword_tags` | Keyword ↔ category values (many-to-many) |
| `domains` | Unique domains from SERP |
| `serp_results` | Rankings per keyword (rank, URL, etc.) |
| `brand_domains` | Brand ↔ domain mapping with domain_type |

### Domain Types
Configured per market in `market_config.py`:
- **Brand**: Official brand website
- **Reseller**: Multi-brand aggregators (Amazon, Walmart)
- **UGC**: User-generated content (Reddit, forums)
- **3rd Party**: Review sites, affiliates, news

---

## API Endpoints

### Brands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands` | List brands with counts |
| GET | `/api/brands/{name}` | Brand details + domains |

### Brand Protection
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/brand-protection?brand=X` | Full dashboard |
| GET | `/api/dashboard/brand-protection/kpis?brand=X` | KPIs only |
| GET | `/api/dashboard/brand-protection/wins?brand=X` | Winning keywords |
| GET | `/api/dashboard/brand-protection/losses?brand=X` | Lost keywords |
| GET | `/api/dashboard/brand-protection/competitors?brand=X` | Top competitors |

### Market Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/market-overview` | Full market dashboard |
| GET | `/api/dashboard/market-overview/share-of-search` | Brand demand |
| GET | `/api/dashboard/market-overview/biggest-losers` | Worst performers |

### Category Opportunities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/category-opportunities?brand=X` | Non-branded opportunities |
| GET | `/api/dashboard/competitor-branded-opportunities?brand=X` | Competitor branded |
| GET | `/api/dashboard/modifier-group-opportunity-breakdown?brand=X&modifier_group=Y&keyword_type=Z` | Lazy-loaded details |

---

## Market Configuration System

Domain types are **dynamic per market** (not hardcoded). This allows the same codebase to support different markets (bicycles, insurance, etc.).

### Backend: `market_config.py`
```python
DOMAIN_TYPES = {
    "Brand": {"color": "blue", "icon": "star"},
    "Reseller": {"color": "purple", "icon": "shopping-cart"},
    "UGC": {"color": "amber", "icon": "users"},
    "3rd Party": {"color": "teal", "icon": "newspaper"}
}
```

### Frontend: `useMarketConfig()` hook
```tsx
const { getStyles, getIcon, getDomainTypeNames } = useMarketConfig();

// Use for any domain type display
const styles = getStyles(competitor.domain_type);
const Icon = getIcon(competitor.domain_type);
```

**IMPORTANT**: Never hardcode domain types in components. Always use the context.

---

## Data Import

### CSV Format
Required columns: `Keyword`, `Volume`
Optional: `Modifier Groups`
All other columns become tag categories automatically.

```csv
Keyword,Volume,Modifier Groups,brand,bicycle_type
trek bike,12000,brand,Trek,mountain
mountain bike,5000,type,,mountain
```

### SERP JSON Format
```json
{
  "keywords": {
    "trek bike": [
      {"rank_group": 1, "domain": "trekbikes.com", "url": "..."}
    ]
  }
}
```

### Brand-Domain Mapping (3-phase)
1. **Manual**: JSON file with overrides
2. **Heuristic**: Brand name in domain URL
3. **AI**: Claude classifies top 1000 domains by visibility

---

## Environment Variables

### Backend (`backend/.env`)
```bash
DATABASE_URL=sqlite+aiosqlite:///../data/keywords.db
CORS_ORIGINS=["http://localhost:5173"]
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

### Kill Running Processes (Windows)
```bash
taskkill /F /IM python.exe /T
netstat -ano | findstr :8000
```

### Add New API Endpoint
1. Add schema → `backend/app/schemas.py`
2. Add service method → `backend/app/services/analytics.py`
3. Add route → `backend/app/routers/dashboard.py`
4. Add types → `frontend/src/types/index.ts`
5. Add API function → `frontend/src/api/endpoints.ts`
6. Use in component

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `unable to open database` | Start backend from `backend/` directory |
| `Address already in use` | Kill existing process or use different port |
| Brand picker empty | Run `python scripts/import_data.py` |
| No domain mapping | Run `python scripts/map_brands.py` |
| Dashboard shows 0s | Check `brand_domains` table has mappings |

---

## Coding Standards

- **Python**: PEP 8, type hints, async/await, SQLAlchemy ORM
- **TypeScript**: Strict mode, explicit types, functional components
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`)
- **SQL**: Parameterized queries only, proper indexes

---

**Built with Claude Code**
