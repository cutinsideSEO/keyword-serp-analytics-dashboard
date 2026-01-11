# Keyword & SERP Analytics Dashboard

A comprehensive analytics platform for analyzing keyword rankings and SERP (Search Engine Results Page) data with AI-powered brand-domain classification and multi-dimensional performance insights.

## Quick Start

### 1. Set up the Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit backend/.env and add your ANTHROPIC_API_KEY
```

### 2. Import Data

```bash
# From project root, run the import script
cd scripts
python import_data.py

# Map brands to domains with AI classification
# This uses Claude API to classify domains into types:
# Brand, Reseller, UGC, 3rd Party
python map_brands.py
```

### 3. Start the Backend Server

```bash
# From project root
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Important**: Always start the backend from the `backend` directory so the database path resolves correctly.

### 4. Set up the Frontend

```bash
# In a new terminal, from project root
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Open the Dashboard

Visit http://localhost:5173 in your browser and select a brand to explore.

---

## Restarting the Application

When you need to restart the app (after code changes, system restart, etc.):

### Method 1: Quick Restart (Recommended)

```bash
# Terminal 1 - Backend (from project root)
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend (from project root)
cd frontend
npm run dev
```

### Method 2: Full Cleanup Restart

If you encounter issues, kill existing processes first:

```bash
# Windows - Kill Python processes
taskkill /F /IM python.exe /T
taskkill /F /IM python3.11.exe /T

# Check if port 8000 is in use
netstat -ano | findstr :8000

# If needed, kill the specific process (replace PID with actual)
taskkill /F /PID <PID>

# Then restart both servers
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# In new terminal
cd frontend
npm run dev
```

### Troubleshooting Restart Issues

**Database connection error:**
- Ensure you're starting the backend from the `backend` directory
- Database path in `.env` should be: `DATABASE_URL=sqlite+aiosqlite:///../data/keywords.db`

**Port already in use:**
- Backend port 8000 or Frontend port 5173 already occupied
- Use the cleanup commands above to kill existing processes

**Module not found errors:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

---

## Project Overview

### Core Features

The dashboard provides comprehensive brand protection analytics with:

#### 🎯 Performance Metrics
- **KPI Cards**: Win/loss rates for keywords and volume
- **Win Rate Tracking**: Percentage of branded keywords where you rank #1
- **Volume Analysis**: Total search volume at risk vs. captured

#### 🏆 Competitive Analysis
- **Top Competitors Chart**: Domains beating you on branded keywords
- **Domain Types Distribution**: Who beats you by domain type (Brand/Reseller/UGC/3rd Party)
- **Influential Voices**: Most dominant domain per type on your keywords
- **Competitive Positioning**: Average positions and ranking frequencies

#### 📊 Category Insights
- **Expandable Categories**: Click to see top values within each category
- **Loss Attribution**: Which categories drive most losses
- **Value-Level Breakdown**: Detailed stats per category value

#### 🔤 Modifier Group Analysis
- **Performance by Modifier**: Stats for each modifier group combination
- **Win/Loss Breakdown**: Keywords and volume won vs. lost per group
- **Average Positioning**: Where you rank on average per modifier
- **Tag Associations**: Top tags related to each modifier group

#### 📋 Keyword Tables
- **Wins Table**: Keywords where you rank #1 with URLs
- **Losses Table**: Competitors beating you with their domains
- **Modifier Filtering**: Filter losses by modifier group
- **Search Functionality**: Find specific keywords quickly

### Market Overview Dashboard

The Market Overview dashboard provides market-wide analytics without brand selection, showing the competitive landscape across all brands and competitors:

#### 🌍 Market-Wide Metrics
- **Market Size**: Total search volume across all keywords (~15.8M volume)
- **Brand Count**: Number of unique brands in the market
- **Share of Search**: Top brands by search demand/volume
- **Market Concentration**: Distribution of search interest across brands

#### 🏪 Strongest Market Players
- **Top Retailers**: Resellers with strongest visibility scores
- **Influential Voices**: UGC & 3rd party content shapers
- **Visibility Scoring**: Domains ranked by `sum(volume / rank)` across all keywords
- **Win Counts**: Number of #1 rankings per domain

#### 🛡️ Market Brand Protection
- **Protection KPIs**: Aggregate metrics across all brands
  - Total brands tracked
  - Total branded keywords
  - Average win rate (% of branded keywords where brand ranks #1)
  - Total volume at risk
- **Loss Distribution**: Breakdown by domain type (Brand/Reseller/UGC/3rd Party)
- **Top Capturing Domains**: Domains winning most branded keywords

#### 📉 Biggest Losers
- **Brands at Risk**: Brands with worst brand protection performance
- **Loss Metrics**: Keywords lost, volume lost, win rate per brand
- **Top Loss Areas**: Modifier groups where each brand loses most
- **Severity Ranking**: Color-coded by protection health

#### 🏷️ Category & Modifier Insights
- **Category Explorer**: Breakdown by all category values (bicycle type, etc.)
- **Modifier Group Analysis**: Performance by keyword modifier combinations
- **Tag Associations**: Common tags per modifier group
- **Volume Distribution**: Total keywords and volume per segment

#### 🎨 UI Components
All Market Overview sections use dedicated reusable components:
- `ShareOfSearchChart.tsx` - Animated brand demand chart with numbered badges
- `DomainVisibilitySection.tsx` - Reusable for retailers/influencers with variant styling
- `MarketProtectionSnapshot.tsx` - KPI cards with health indicators and loss distribution
- `BiggestLosersTable.tsx` - Severity color-coded table with tooltips
- `CategoryExplorer.tsx` - Grid of expandable category cards
- `ModifierGroupExplorer.tsx` - Grid of modifier group cards with top tags

**Key Differences from Brand Protection Dashboard:**
- No brand selection required - shows entire market
- Focus on market-wide trends vs. single-brand protection
- Visibility scoring instead of competitive analysis
- Share of search instead of win/loss tables

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────┐ │
│  │   Frontend      │────▶│    Backend      │────▶│      Database        │ │
│  │  React + Vite   │◀────│    FastAPI      │◀────│      SQLite          │ │
│  │  Tremor UI      │     │    Python 3.11  │     │   92K+ keywords      │ │
│  │  TypeScript     │     │    Async/Await  │     │   1.6M SERP results  │ │
│  └─────────────────┘     └─────────────────┘     └──────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│                        ┌──────────────────┐                                │
│                        │   Claude API     │                                │
│                        │  (Sonnet 3.5)    │                                │
│                        │  Brand→Domain    │                                │
│                        │  Classification  │                                │
│                        └──────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology        | Version  | Purpose                                    |
|------------|-------------------|----------|--------------------------------------------|
| Database   | SQLite            | 3.x      | Local data storage, analytical queries     |
| ORM        | SQLAlchemy        | 2.x      | Async database models and queries          |
| Backend    | FastAPI           | 0.100+   | REST API with automatic OpenAPI docs       |
| Runtime    | Python            | 3.11+    | Backend runtime with type hints            |
| Frontend   | React             | 18.x     | UI framework with hooks                    |
| Build      | Vite              | 5.x      | Fast frontend build tool                   |
| UI Library | Tremor            | 3.x      | Pre-built dashboard components             |
| Charts     | Recharts          | 2.x      | Data visualization (via Tremor)            |
| Icons      | Heroicons         | 2.x      | React icon library                         |
| HTTP       | Axios             | 1.x      | API client with interceptors               |
| AI         | Claude API        | Sonnet   | Intelligent domain classification          |

## Project Structure

```
NewDashboard/
├── CLAUDE.md                              # This file - comprehensive docs
├── README.md                              # Project overview
├── .gitignore                             # Git ignore rules
│
├── backend/                               # Python FastAPI backend
│   ├── .env                               # Environment variables (ANTHROPIC_API_KEY)
│   ├── requirements.txt                   # Python dependencies
│   ├── venv/                              # Python virtual environment
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                        # FastAPI app + CORS + lifespan
│       ├── config.py                      # Settings management (pydantic-settings)
│       ├── database.py                    # Async SQLAlchemy setup
│       ├── models.py                      # ORM models (Keyword, Domain, etc.)
│       ├── schemas.py                     # Pydantic request/response schemas
│       │
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── brands.py                  # Brand CRUD + auto-mapping
│       │   ├── keywords.py                # Keyword search + filtering
│       │   └── dashboard.py               # Analytics aggregations
│       │
│       └── services/
│           ├── __init__.py
│           ├── data_import.py             # CSV/JSON data importers
│           ├── brand_mapper.py            # 3-phase AI brand mapping
│           └── analytics.py               # Dashboard computations
│
├── frontend/                              # React TypeScript frontend
│   ├── package.json                       # NPM dependencies
│   ├── tsconfig.json                      # TypeScript config
│   ├── vite.config.ts                     # Vite bundler config
│   ├── tailwind.config.js                 # Tailwind CSS config
│   ├── index.html                         # HTML entry point
│   │
│   └── src/
│       ├── main.tsx                       # React app entry
│       ├── App.tsx                        # Root component + routing
│       │
│       ├── api/
│       │   ├── client.ts                  # Axios instance + interceptors
│       │   └── endpoints.ts               # Typed API functions
│       │
│       ├── components/
│       │   ├── common/
│       │   │   ├── BrandPicker.tsx        # Dropdown with search
│       │   │   ├── LoadingSpinner.tsx     # Loading states
│       │   │   └── ErrorBoundary.tsx      # Error handling
│       │   │
│       │   └── dashboard/
│       │       ├── KPICards.tsx           # Top metrics cards
│       │       ├── CompetitorChart.tsx    # Bar chart - competitors
│       │       ├── DomainTypesChart.tsx   # Donut chart - domain types
│       │       ├── CategoryBreakdown.tsx  # Expandable categories
│       │       ├── InfluentialVoicesTable.tsx  # Top domains per type
│       │       ├── ModifierGroupsTable.tsx     # Stats per modifier
│       │       └── WinLossTable.tsx       # Keywords with tabs + filters
│       │
│       ├── pages/
│       │   └── BrandProtection.tsx        # Main dashboard page
│       │
│       ├── hooks/
│       │   └── useApi.ts                  # Custom API hooks
│       │
│       ├── types/
│       │   └── index.ts                   # TypeScript interfaces
│       │
│       └── utils/
│           └── formatters.ts              # Number/string utilities
│
├── data/
│   └── keywords.db                        # SQLite database (auto-generated)
│
├── scripts/                               # Data processing scripts
│   ├── import_data.py                     # Import CSV + JSON → SQLite
│   └── map_brands.py                      # AI brand-domain mapping
│
└── source_data/                           # Raw data files (gitignored)
    ├── keywords.csv                       # Keyword data with tags
    └── serp_results.json                  # SERP ranking data
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    keywords     │       │   keyword_tags   │       │   categories    │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)          │   ┌───│ id (PK)         │
│ keyword (UQ)    │   └──▶│ keyword_id (FK)  │   │   │ name (UQ)       │
│ volume          │       │ category_id (FK) │◀──┘   │ display_name    │
│ modifier_group  │       │ value            │       └─────────────────┘
│ created_at      │       │ created_at       │
└─────────────────┘       └──────────────────┘
        │
        │
        ▼
┌─────────────────────┐       ┌─────────────────────┐
│    serp_results     │       │       domains       │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │   ┌───│ id (PK)             │
│ keyword_id (FK)     │   │   │ domain (UQ)         │
│ domain_id (FK)      │◀──┘   │ created_at          │
│ rank_group          │       └─────────────────────┘
│ rank_absolute       │               │
│ page                │               │
│ result_type         │               ▼
│ title               │       ┌─────────────────────┐
│ description         │       │   brand_domains     │
│ url                 │       ├─────────────────────┤
│ created_at          │       │ id (PK)             │
└─────────────────────┘       │ brand_name          │
                              │ domain_id (FK)      │
                              │ is_primary          │
                              │ confidence          │
                              │ domain_type  ◀─── NEW!
                              │ created_at          │
                              └─────────────────────┘
```

### Table Descriptions

#### `keywords`
Stores each unique keyword with its search volume and modifier group.

| Column         | Type      | Constraints      | Description                           |
|----------------|-----------|------------------|---------------------------------------|
| id             | INTEGER   | PK, AUTO         | Unique identifier                     |
| keyword        | TEXT      | NOT NULL, UNIQUE | The keyword string                    |
| volume         | INTEGER   | NOT NULL, >= 0   | Monthly search volume                 |
| modifier_group | TEXT      | NULLABLE         | Keyword modifier category combination |
| created_at     | TIMESTAMP | NOT NULL         | Record creation timestamp             |

#### `categories`
Defines all tag categories from the CSV columns.

| Column       | Type    | Constraints      | Description                    |
|--------------|---------|------------------|--------------------------------|
| id           | INTEGER | PK, AUTO         | Unique identifier              |
| name         | TEXT    | NOT NULL, UNIQUE | Internal name (snake_case)     |
| display_name | TEXT    | NOT NULL         | Human-readable name            |

#### `keyword_tags`
Links keywords to their tag values (normalized many-to-many with values).

| Column      | Type      | Constraints        | Description                  |
|-------------|-----------|--------------------|-----------------------------|
| id          | INTEGER   | PK, AUTO           | Unique identifier            |
| keyword_id  | INTEGER   | FK → keywords.id   | Reference to keyword         |
| category_id | INTEGER   | FK → categories.id | Reference to category        |
| value       | TEXT      | NOT NULL           | The tag value                |
| created_at  | TIMESTAMP | NOT NULL           | Record creation timestamp    |

**Index**: `(keyword_id, category_id)` - unique composite
**Index**: `(category_id, value)` - for filtering by category value

#### `domains`
Unique domains found in SERP results.

| Column     | Type      | Constraints      | Description               |
|------------|-----------|------------------|---------------------------|
| id         | INTEGER   | PK, AUTO         | Unique identifier         |
| domain     | TEXT      | NOT NULL, UNIQUE | Domain name               |
| created_at | TIMESTAMP | NOT NULL         | Record creation timestamp |

#### `serp_results`
Individual SERP ranking entries for each keyword.

| Column        | Type      | Constraints       | Description                      |
|---------------|-----------|-------------------|----------------------------------|
| id            | INTEGER   | PK, AUTO          | Unique identifier                |
| keyword_id    | INTEGER   | FK → keywords.id  | Reference to keyword             |
| domain_id     | INTEGER   | FK → domains.id   | Reference to domain              |
| rank_group    | INTEGER   | NOT NULL          | Position within organic results  |
| rank_absolute | INTEGER   | NOT NULL          | Absolute position on SERP        |
| page          | INTEGER   | NOT NULL          | SERP page number                 |
| result_type   | TEXT      | NOT NULL          | Type (organic, featured, etc.)   |
| title         | TEXT      | NULLABLE          | Result title                     |
| description   | TEXT      | NULLABLE          | Result description               |
| url           | TEXT      | NOT NULL          | Full URL                         |
| created_at    | TIMESTAMP | NOT NULL          | Record creation timestamp        |

**Index**: `(keyword_id, rank_group)` - for position queries
**Index**: `(domain_id, rank_group)` - for domain performance queries

#### `brand_domains`
Maps brand names to their owned domains with AI-powered classification.

| Column      | Type      | Constraints      | Description                                    |
|-------------|-----------|------------------|------------------------------------------------|
| id          | INTEGER   | PK, AUTO         | Unique identifier                              |
| brand_name  | TEXT      | NOT NULL         | Brand name (from keyword tags)                 |
| domain_id   | INTEGER   | FK → domains.id  | Reference to domain                            |
| is_primary  | BOOLEAN   | NOT NULL         | Is this the primary domain?                    |
| confidence  | FLOAT     | NOT NULL         | AI confidence score (0-1)                      |
| domain_type | TEXT      | NOT NULL         | Brand/Reseller/UGC/3rd Party                   |
| created_at  | TIMESTAMP | NOT NULL         | Record creation timestamp                      |

**Domain Types:**
- **Brand**: Official brand website selling own products (e.g., trekbikes.com)
- **Reseller**: Aggregators selling multiple brands (e.g., Amazon, Walmart)
- **UGC**: User-generated content platforms (e.g., Reddit, forums)
- **3rd Party**: Review sites, affiliates, news (e.g., bikeradar.com)

**Index**: `(brand_name)` - for brand lookups

## API Endpoints

### Brands

| Method | Endpoint                       | Description                                |
|--------|--------------------------------|--------------------------------------------|
| GET    | `/api/brands`                  | List all brands with keyword/volume counts |
| GET    | `/api/brands/{name}`           | Get brand details with domain mapping      |
| PUT    | `/api/brands/{name}/domains`   | Update brand-domain mapping                |
| POST   | `/api/brands/{name}/auto-map`  | Trigger AI domain mapping for brand        |

### Dashboard - Brand Protection

| Method | Endpoint                                          | Description                                      |
|--------|---------------------------------------------------|--------------------------------------------------|
| GET    | `/api/dashboard/brand-protection`                 | Complete dashboard (KPIs + all data)             |
| GET    | `/api/dashboard/brand-protection/kpis`            | Just the KPI metrics                             |
| GET    | `/api/dashboard/brand-protection/wins`            | Keywords where brand ranks #1                    |
| GET    | `/api/dashboard/brand-protection/losses`          | Keywords where competitors beat brand            |
| GET    | `/api/dashboard/brand-protection/competitors`     | Top competitors by volume captured               |
| GET    | `/api/dashboard/brand-protection/categories`      | Loss breakdown by category (aggregated)          |
| GET    | `/api/dashboard/brand-protection/categories/{category}/values` | Top values within a category    |
| GET    | `/api/dashboard/brand-protection/modifier-groups` | Stats per modifier group value                   |

### Dashboard - Market Overview

| Method | Endpoint                              | Description                                          |
|--------|---------------------------------------|------------------------------------------------------|
| GET    | `/api/dashboard/market-overview`      | Complete market dashboard (all sections)             |
| GET    | `/api/dashboard/market-overview/share-of-search` | Share of search by brand                  |
| GET    | `/api/dashboard/market-overview/top-retailers` | Top retailers by visibility score            |
| GET    | `/api/dashboard/market-overview/influential-voices` | Top UGC & 3rd party domains           |
| GET    | `/api/dashboard/market-overview/protection-kpis` | Market-wide brand protection metrics      |
| GET    | `/api/dashboard/market-overview/loss-distribution` | Loss breakdown by domain type          |
| GET    | `/api/dashboard/market-overview/biggest-losers` | Brands with worst protection (top 50)     |
| GET    | `/api/dashboard/market-overview/category-stats` | Category breakdown with top values        |
| GET    | `/api/dashboard/market-overview/modifier-group-stats` | Modifier group breakdown           |

### Keywords

| Method | Endpoint                    | Description                         |
|--------|-----------------------------|-------------------------------------|
| GET    | `/api/keywords`             | List keywords with filters          |
| GET    | `/api/keywords/{id}`        | Get keyword details with SERP       |
| GET    | `/api/keywords/categories`  | List all categories with values     |

### System

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/health`         | Health check + DB connection   |
| POST   | `/api/import/trigger` | Trigger data re-import         |

## Brand-Domain Mapping System

The system uses a sophisticated 3-phase approach to map brands to their domains:

### Phase 1: Manual Mappings (Highest Priority)
Supply a JSON file with manual overrides:

```json
{
  "trekbikes.com": {
    "brand_name": "Trek",
    "domain_type": "Brand",
    "is_primary": true,
    "confidence": 1.0
  },
  "amazon.com": {
    "brand_name": "N/A",
    "domain_type": "Reseller",
    "is_primary": false,
    "confidence": 1.0
  }
}
```

Run with: `python map_brands.py --manual mappings.json`

### Phase 2: Heuristic Matching
Automatically maps domains where the brand name appears in the domain URL.
- Example: "trek" brand → trekbikes.com (automatic match)

### Phase 3: AI Classification (Top 1000 by Visibility)
Uses Claude API to classify unmapped domains by:
1. Calculating visibility score: `sum(search_volume / rank)` across all keywords
2. Sorting domains by visibility
3. Classifying top 1000 with Claude AI in batches of 50
4. Determining both brand association and domain type

**Visibility Score**: Higher score = domain appears frequently on high-volume keywords with good positions.

**Example Output:**
```
Phase 1 - Manual mappings:      0
Phase 2 - Heuristic matching:   441
Phase 3 - AI classification:    1000
Total mappings created:         1441
```

## Dashboard Features Deep Dive

### 1. KPI Cards (Top of Dashboard)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Total Keywords  │  │  Keywords Win   │  │  Total Volume   │  │  Volume Win     │
│     4,461       │  │  Rate: 83.2%    │  │   1,045,420     │  │  Rate: 92.7%    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 2. Competitive Analysis Charts

**Who Beats You on Brand Keywords**
- Bar chart of top 10 competitors
- Volume they captured on your branded keywords
- Number of keywords they win
- Average position they hold

**Domain Types Beating You**
- Donut chart showing distribution by type
- Resellers (34%), UGC (45%), 3rd Party (30%), Other Brands (1%)
- Total volume lost per type
- Percentage of total losses

### 3. Category Breakdown (Expandable)

Click any category to expand and see top values:

```
▼ Bicycle Type (90 keywords, 9,920 volume) ─── 12.0% of losses
    ↳ mountain: 52 keywords, 5,430 vol
    ↳ road: 24 keywords, 2,890 vol
    ↳ electric: 14 keywords, 1,600 vol
```

### 4. Influential Voices Table

Shows the most dominant domain for each domain type:

| Domain          | Type      | Rankings | Volume  | Avg Pos | #1 Wins |
|-----------------|-----------|----------|---------|---------|---------|
| mtbr.com        | 3rd Party | 1,169    | 255,100 | 11.4    | 2       |
| reddit.com      | UGC       | 856      | 198,400 | 15.2    | 45      |
| amazon.com      | Reseller  | 643      | 142,300 | 8.7     | 98      |

### 5. Modifier Groups Table

Performance breakdown by keyword modifier combinations:

| Modifier Group              | Keywords    | Total Vol | Win Rate | Avg Pos | Top Tags                    |
|-----------------------------|-------------|-----------|----------|---------|------------------------------|
| brand                       | 1,842 / 274 | 453,500   | 85.1%    | #12.6   | -                            |
| brand, model or product     | 760 / 124   | 279,410   | 86.0%    | #12.5   | trek marlin (123), trek fx...|
| bicycle type, brand         | 279 / 105   | 117,060   | 72.7%    | #12.3   | mountain (165), road (84)... |

### 6. Win/Loss Tables

**Wins Tab:**
- Keywords where you rank #1
- Search volume
- Exact rank position
- Clickable URL
- Associated tags

**Losses Tab:**
- Keywords where competitors beat you
- Winning domain with URL
- Your position (if you rank)
- Volume at risk
- **Filter by modifier group** (dropdown)
- Search functionality

### Market Overview Dashboard Sections

The Market Overview dashboard is organized into these key sections:

#### 1. Header & Market Metrics

```
┌──────────────────────────────────────────────────────────────────┐
│  Market Overview                     ┌────────────────────────┐   │
│  Comprehensive market analytics      │  Market Size           │   │
│  across 441 brands                   │  15,798,010 volume     │   │
│                                      └────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

- Total market search volume (all keywords)
- Number of brands tracked
- Visual gradient design with emerald/teal theme

#### 2. Share of Search (Brand Demand)

- Top 10 brands by search volume
- Animated numbered badges (#1, #2, #3...)
- Progress bars showing market share percentage
- Insight box showing market concentration (e.g., "Top 10 brands = 23.2% of search demand")

#### 3. Strongest Market Players (2-column grid)

**Top Retailers:**
- Resellers ranked by visibility score: `sum(volume / rank)`
- Shows domain, visibility score, #1 wins, and top brands
- Purple gradient theme

**Influential Voices:**
- UGC & 3rd party domains by visibility
- Similar metrics as retailers
- Amber gradient theme

#### 4. Market Brand Protection Snapshot

**KPI Cards (4 cards):**
- Total brands tracked
- Average win rate (with health indicator)
- Total branded keywords
- Total volume at risk

**Loss Distribution Chart:**
- Donut chart by domain type
- Color-coded: Brand (blue), Reseller (purple), UGC (amber), 3rd Party (teal)
- Shows volume captured by each type

**Top Capturing Domains:**
- Preview of top 3 domains winning most branded keywords

#### 5. Biggest Losers Table

- Ranked table of brands with worst protection
- Columns: Rank, Brand, Keywords Lost, Volume Lost, Win Rate, Top Loss Areas
- Color-coded severity (red for high risk, yellow for moderate, green for healthy)
- Top 3 losers highlighted with red background
- Hover tooltips on modifier groups showing detailed stats
- Summary footer with aggregated totals

#### 6. Category Insights Grid

- Grid of category cards (3 columns on desktop)
- Each card shows:
  - Category display name
  - Unique values count
  - Total keywords and volume
  - Top 3 values preview with badges
- Hover effects with border color change
- Placeholder for future drill-down functionality

#### 7. Modifier Group Analysis Grid

- Grid of modifier group cards (3 columns on desktop)
- Each card shows:
  - Modifier group combination
  - Total keywords and volume
  - Top tags preview with badges
- Summary stats at bottom (total groups, keywords, volume)
- Placeholder for future explorer functionality

## Key Queries & Analytics

### Win Rate Calculation
```sql
SELECT
    COUNT(CASE WHEN sr.rank_group = 1 THEN 1 END) as wins,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(CASE WHEN sr.rank_group = 1 THEN 1 END) / COUNT(*), 1) as win_rate
FROM keywords k
JOIN keyword_tags kt ON k.id = kt.keyword_id
JOIN categories c ON kt.category_id = c.id
JOIN brand_domains bd ON kt.value = bd.brand_name AND bd.is_primary = 1
LEFT JOIN serp_results sr ON k.id = sr.keyword_id
    AND sr.domain_id = bd.domain_id AND sr.rank_group = 1
WHERE c.name = 'brand'
    AND kt.value = :selected_brand;
```

### Domain Type Distribution
```sql
SELECT
    bd.domain_type,
    COUNT(DISTINCT sr.keyword_id) as loss_count,
    SUM(k.volume) as loss_volume
FROM serp_results sr
JOIN keywords k ON sr.keyword_id = k.id
JOIN brand_domains bd ON sr.domain_id = bd.domain_id
WHERE sr.rank_group = 1
    AND sr.keyword_id IN (SELECT id FROM branded_keywords_losing)
GROUP BY bd.domain_type
ORDER BY loss_volume DESC;
```

### Modifier Group Stats
```sql
SELECT
    k.modifier_group,
    COUNT(*) as total_keywords,
    SUM(k.volume) as total_volume,
    COUNT(CASE WHEN sr.rank_group = 1 THEN 1 END) as keywords_winning,
    AVG(CASE WHEN sr_brand.rank_group IS NOT NULL
        THEN sr_brand.rank_group END) as avg_position
FROM keywords k
JOIN keyword_tags kt ON k.id = kt.keyword_id
LEFT JOIN serp_results sr ON k.id = sr.keyword_id
    AND sr.domain_id IN (brand_domains)
    AND sr.rank_group = 1
GROUP BY k.modifier_group
ORDER BY total_volume DESC;
```

## Data Sources

### CSV File Structure

The system accepts **any CSV file** with these required columns (case-insensitive):

| Column          | Type    | Required | Description                       |
|-----------------|---------|----------|-----------------------------------|
| Keyword         | TEXT    | Yes      | The keyword string                |
| Volume          | INTEGER | Yes      | Monthly search volume             |
| Modifier Groups | TEXT    | No       | Modifier category (can be empty)  |

**All other columns automatically become tag categories.**

Example:
```csv
Keyword,Volume,Modifier Groups,brand,bicycle_type,model_or_product
trek bike,12000,brand,Trek,mountain,
trek domane,8100,brand model or product,Trek,road,trek domane
mountain bike,5000,type,,mountain,
```

The importer will:
1. Create a `brand` category with values: Trek
2. Create a `bicycle_type` category with values: mountain, road
3. Create a `model_or_product` category with values: trek domane
4. Store "brand", "brand model or product", "type" as modifier groups

### JSON SERP File Structure

```json
{
  "keywords": {
    "trek bike": [
      {
        "type": "organic",
        "rank_group": 1,
        "rank_absolute": 1,
        "page": 1,
        "domain": "www.trekbikes.com",
        "title": "Trek Bikes | Official Site",
        "description": "Shop Trek mountain bikes, road bikes...",
        "url": "https://www.trekbikes.com/"
      },
      {
        "type": "organic",
        "rank_group": 2,
        "rank_absolute": 2,
        "page": 1,
        "domain": "www.amazon.com",
        "title": "Trek Bikes on Amazon",
        "url": "https://www.amazon.com/trek-bikes/"
      }
    ],
    "another keyword": [...]
  }
}
```

## Switching Datasets

To analyze a new dataset:

1. **Prepare your data:**
   - Place CSV file with keyword data in project root or `source_data/`
   - Place JSON file with SERP results in same location

2. **Clear existing data (optional):**
   ```bash
   # Delete the database to start fresh
   rm data/keywords.db
   ```

3. **Import new data:**
   ```bash
   cd scripts
   python import_data.py
   ```

   The importer will:
   - ✅ Create fresh database tables
   - ✅ Import all keywords with volumes
   - ✅ Create categories from CSV columns automatically
   - ✅ Import SERP results and link to domains
   - ✅ Report statistics (keywords, domains, categories)

4. **Map brands to domains:**
   ```bash
   python map_brands.py
   ```

   This will:
   - ✅ Identify unique brands from the data
   - ✅ Use heuristic matching (brand in domain name)
   - ✅ Apply AI classification to top 1000 domains
   - ✅ Assign domain types (Brand/Reseller/UGC/3rd Party)

5. **Restart the backend** to load the new data:
   ```bash
   cd ../backend
   # Kill existing process if running
   # Then restart:
   venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```

6. **Refresh the frontend** in your browser to see the new dataset.

## Environment Variables

### Backend (.env)

Located at: `backend/.env`

```bash
# Database connection (relative to backend directory)
DATABASE_URL=sqlite+aiosqlite:///../data/keywords.db

# CORS allowed origins (frontend URL)
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# Claude API key for brand-domain mapping
# Get your key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx

# Debug mode (set to true for detailed logging)
DEBUG=false
```

### Frontend (.env)

Located at: `frontend/.env` (optional - has defaults)

```bash
# Backend API URL (defaults to http://localhost:8000/api)
VITE_API_BASE_URL=http://localhost:8000/api
```

## Development Workflow

### Backend Development

```bash
# From backend directory
cd backend

# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install new dependencies (if added)
pip install -r requirements.txt

# Run with auto-reload on file changes
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Check logs in terminal for errors
# API docs available at: http://localhost:8000/docs
```

### Frontend Development

```bash
# From frontend directory
cd frontend

# Install new dependencies (if added)
npm install

# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Common Development Tasks

**Add a new API endpoint:**
1. Add schema to `backend/app/schemas.py`
2. Add method to analytics service: `backend/app/services/analytics.py`
3. Add route to `backend/app/routers/dashboard.py`
4. Update types: `frontend/src/types/index.ts`
5. Add API function: `frontend/src/api/endpoints.ts`
6. Use in component

**Add a new dashboard component:**
1. Create component: `frontend/src/components/dashboard/MyComponent.tsx`
2. Import and use in: `frontend/src/pages/BrandProtection.tsx`
3. Pass data from API hook: `useApiWithParam`

**Debug database queries:**
1. Check logs in backend terminal (SQL queries logged)
2. Use SQLite browser: `sqlite3 data/keywords.db`
3. Or use GUI tool: DB Browser for SQLite

## Caching & Performance

### Cache Prevention

The system is configured to prevent stale data issues:

**Backend:**
- `NoCacheMiddleware` adds `Cache-Control: no-cache` headers to all responses
- Ensures browser always fetches fresh data

**Frontend:**
- Axios interceptor adds timestamp parameter to GET requests
- Example: `/api/brands?_t=1704123456789`
- Forces cache bypass on every request

### After Code Changes

**Backend changes:**
1. Uvicorn auto-reloads on file save (--reload flag)
2. If it doesn't reload, `Ctrl+C` and restart manually

**Frontend changes:**
1. Vite HMR updates instantly in browser
2. Hard refresh if needed: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

**Database changes:**
1. Stop backend server
2. Delete `data/keywords.db`
3. Re-run import scripts
4. Restart backend server

## Troubleshooting

### Backend won't start

**Error: `unable to open database file`**
- Ensure you're in the `backend` directory when starting
- Check `DATABASE_URL` in `.env` points to `../data/keywords.db`
- Verify database file exists at `data/keywords.db` (from project root)

**Error: `ModuleNotFoundError: No module named 'app'`**
- Ensure you're running from `backend` directory
- Activate virtual environment: `venv\Scripts\activate`
- Reinstall dependencies: `pip install -r requirements.txt`

**Error: `Address already in use` (port 8000)**
- Another process is using port 8000
- Kill it: `taskkill /F /IM python.exe` (Windows)
- Or use different port: `--port 8001`

### Frontend won't start

**Error: `EADDRINUSE: address already in use :::5173`**
- Another Vite dev server is running
- Kill it or use different port in `vite.config.ts`

**Error: `Module not found` or import errors**
- Delete `node_modules` and `package-lock.json`
- Run: `npm install`
- Restart dev server: `npm run dev`

### Data import issues

**Error: No data imported**
- Check file paths in `import_data.py`
- Ensure CSV/JSON files exist in expected location
- Check CSV has required columns: Keyword, Volume

**Error: Brand mapping fails**
- Verify `ANTHROPIC_API_KEY` is set in `backend/.env`
- Check API key is valid: https://console.anthropic.com/
- Run with `--no-ai` flag to skip AI classification

### Dashboard shows no data

**Brand picker is empty:**
- No brands imported - run `python scripts/import_data.py`
- Brand category not found - check CSV has a "brand" column

**No domain mapping:**
- Run: `python scripts/map_brands.py`
- Wait for AI classification to complete (~7 minutes for 1000 domains)

**Dashboard loads but shows 0s:**
- Brand exists but no domains mapped to it
- Check `brand_domains` table: `sqlite3 data/keywords.db "SELECT * FROM brand_domains WHERE brand_name='Trek';"`

## Future Enhancements

Potential additions to the dashboard:

- [ ] **Trend Analysis**: Track changes over time with periodic imports
- [ ] **Competitor Deep Dive**: Dedicated page per competitor
- [ ] **Opportunity Finder**: High-volume keywords with weak brand presence
- [ ] **Content Gap Analysis**: Topics competitors cover that you don't
- [ ] **Position Tracking**: Historical rank changes
- [ ] **Automated Alerts**: Email when competitor overtakes on key terms
- [ ] **Export Functionality**: Download reports as PDF/Excel
- [ ] **Multi-Brand Comparison**: Side-by-side brand analysis

## Coding Standards

### Python (Backend)
- Follow **PEP 8** style guide
- Use **type hints** for all function parameters and returns
- Write **docstrings** for public functions (Google style)
- Use **async/await** for all database operations
- Prefer **SQLAlchemy ORM** over raw SQL
- Keep routes thin - business logic in services

### TypeScript (Frontend)
- **Strict mode** enabled in tsconfig.json
- **Explicit types** - no `any` unless absolutely necessary
- **Functional components** with hooks (not class components)
- **Named exports** for components
- **Interface** for data shapes, **Type** for unions/utilities
- Extract **reusable logic** into custom hooks

### Git
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`
- **Descriptive messages**: What and why, not how
- **Small commits**: One logical change per commit
- **Branch naming**: `feature/name`, `fix/name`, `docs/name`

### SQL
- Use **parameterized queries** always (SQLAlchemy handles this)
- Never **string concatenation** for queries
- Add **indexes** for frequently queried columns
- Use **JOINs** over multiple queries when possible

## Support & Resources

### Documentation
- FastAPI docs: http://localhost:8000/docs (when running)
- React docs: https://react.dev/
- Tremor UI: https://tremor.so/docs
- SQLAlchemy: https://docs.sqlalchemy.org/

### Tools
- **DB Browser for SQLite**: Inspect database visually
- **Postman/Insomnia**: Test API endpoints
- **React DevTools**: Debug React components
- **VS Code Extensions**: Python, TypeScript, Tailwind CSS IntelliSense

---

**Built with Claude Code** 🤖

This dashboard was designed and implemented to provide actionable insights into brand presence on search engines. Use it to identify opportunities, track competitors, and protect your branded keywords.
