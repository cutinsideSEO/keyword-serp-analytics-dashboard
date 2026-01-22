# Migration Plan: Making the System Generic for Insurance Market

## STATUS: IMPLEMENTATION COMPLETE

The system has been updated to support configurable domain types. See "What Was Done" section below.

---

## Executive Summary

**Goal**: Make the dashboard system fully configurable for different markets/datasets, starting with an Israeli insurance market dataset with Hebrew keywords.

**Current State**: Domain types (Brand, Reseller, UGC, 3rd Party) are hardcoded in **16 files** across backend and frontend.

**Target State**: Configuration-driven domain types that can be changed per dataset without code modifications.

---

## New Domain Types for Insurance Market

| Old Type | New Type | Description |
|----------|----------|-------------|
| Brand | Insurance Company | The brand/company being tracked (e.g., הראל, מגדל) |
| Reseller | Comparison Site | Price comparison platforms (e.g., ביטוח ישיר, כל ביטוח) |
| UGC | UGC | User-generated content (forums, social media) |
| 3rd Party | *(removed)* | Not applicable for this market |

---

## Changes Required

### Phase 1: Configuration System (Backend)
**Estimated effort: Medium**

Create a centralized configuration file that defines domain types per market/dataset.

#### 1.1 Create Market Configuration File
**New file**: `backend/app/config/market_config.py`

```python
# Example structure
MARKET_CONFIG = {
    "market_name": "insurance_il",
    "market_display_name": "Israeli Insurance Market",
    "industry_context": "insurance industry in Israel",
    "domain_types": [
        {
            "id": "insurance_company",
            "display_name": "Insurance Company",
            "ai_description": "Official insurance company website (e.g., harel.co.il, migdal.co.il)",
            "is_brand_type": True,  # This type represents the tracked brands
            "examples": ["harel.co.il", "migdal.co.il", "clal.co.il"]
        },
        {
            "id": "comparison_site",
            "display_name": "Comparison Site",
            "ai_description": "Price comparison platforms that let users compare insurance quotes",
            "is_brand_type": False,
            "examples": ["bit.co.il", "kolbituach.co.il"]
        },
        {
            "id": "ugc",
            "display_name": "UGC",
            "ai_description": "User-generated content sites (forums, Facebook groups, Reddit)",
            "is_brand_type": False,
            "examples": ["facebook.com", "reddit.com", "fxp.co.il"]
        }
    ],
    "language": "he",
    "text_direction": "rtl"
}
```

#### 1.2 Files to Modify

| File | Changes |
|------|---------|
| `backend/app/models.py` | Change default domain_type to read from config |
| `backend/app/services/brand_mapper.py` | Generate AI prompt dynamically from config |
| `backend/app/services/market_analytics.py` | Use config for domain type iterations |
| `backend/app/routers/market_overview.py` | Use config for endpoint filters |

---

### Phase 2: Configuration System (Frontend)
**Estimated effort: Medium-High**

#### 2.1 Create Domain Types Configuration
**New file**: `frontend/src/config/domainTypes.ts`

```typescript
export interface DomainTypeConfig {
  id: string;
  displayName: string;
  tremorColor: string;
  hexColor: string;
  gradient: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: string; // icon name from lucide-react
}

// This will be loaded from backend API or config file
export const DOMAIN_TYPES: DomainTypeConfig[] = [
  {
    id: 'insurance_company',
    displayName: 'Insurance Company',
    tremorColor: 'blue',
    hexColor: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: 'Building2'
  },
  // ... more types
];
```

#### 2.2 Files to Modify (9 components)

| Component | File | Lines Affected |
|-----------|------|----------------|
| DomainTypesChart | `DomainTypesChart.tsx` | 17-29 |
| CompetitorChart | `CompetitorChart.tsx` | 17-23 |
| InfluentialVoicesTable | `InfluentialVoicesTable.tsx` | 16-37 |
| CategoryExplorer | `CategoryExplorer.tsx` | 18-30, 77, 103-112 |
| CategoryProtectionExplorer | `CategoryProtectionExplorer.tsx` | 38-41 |
| MarketProtectionSnapshot | `MarketProtectionSnapshot.tsx` | 28-32 |
| ModifierGroupExplorer | `ModifierGroupExplorer.tsx` | 19-22, 70 |
| ModifierGroupProtectionExplorer | `ModifierGroupProtectionExplorer.tsx` | 38-41 |
| OpportunityModifierGroupsTable | `OpportunityModifierGroupsTable.tsx` | 32-35 |

---

### Phase 3: RTL Support for Hebrew Keywords
**Estimated effort: Low**

#### 3.1 CSS Changes
**File**: `frontend/src/index.css`

Add RTL-aware styles for keyword display:

```css
/* Hebrew keyword support */
.keyword-text {
  direction: auto;
  unicode-bidi: plaintext;
}

/* For explicit RTL */
.keyword-rtl {
  direction: rtl;
  text-align: right;
}
```

#### 3.2 Component Updates

| Component | File | Change |
|-----------|------|--------|
| WinLossTable | `WinLossTable.tsx:139, 248` | Add `dir="auto"` or `className="keyword-text"` |
| CategoryBreakdown | `CategoryBreakdown.tsx:112` | Add RTL class to keyword tags |
| ModifierGroupsTable | `ModifierGroupsTable.tsx:179` | Add RTL class to keyword tags |
| OpportunityModifierGroupsTable | `OpportunityModifierGroupsTable.tsx:163` | Add RTL class |

**Note**: Using `dir="auto"` allows browser to auto-detect text direction, so Hebrew displays RTL while English stays LTR.

---

### Phase 4: Backend API for Configuration
**Estimated effort: Low**

#### 4.1 New Endpoint
**File**: `backend/app/routers/config.py`

```python
@router.get("/config/market")
async def get_market_config():
    """Return current market configuration including domain types"""
    return {
        "market_name": config.market_name,
        "domain_types": config.domain_types,
        "language": config.language,
        "text_direction": config.text_direction
    }
```

#### 4.2 Frontend Integration
Load config on app startup and use React Context to provide to all components.

---

### Phase 5: Update AI Classification Prompt
**Estimated effort: Low**

The `brand_mapper.py` file (lines 285-319) contains the hardcoded AI prompt. This needs to be generated dynamically:

**Before** (hardcoded):
```python
prompt = f"""Analyze these domains in the bicycle/cycling industry..."""
```

**After** (dynamic):
```python
def generate_classification_prompt(self, domains, brands):
    type_descriptions = "\n".join([
        f"   - {t['display_name']}: {t['ai_description']}"
        for t in self.config.domain_types
    ])

    type_list = ", ".join([t['display_name'] for t in self.config.domain_types])

    prompt = f"""Analyze these domains in the {self.config.industry_context} and classify each one.

Known brands: {', '.join(brands[:30])}

Domain Types (choose one):
{type_descriptions}

- ONLY use domain_type values: {type_list}
..."""
```

---

## Implementation Checklist

### Backend Changes
- [ ] Create `backend/app/config/market_config.py` with domain type definitions
- [ ] Update `backend/app/models.py` - dynamic default for domain_type
- [ ] Update `backend/app/services/brand_mapper.py` - dynamic AI prompt
- [ ] Update `backend/app/services/market_analytics.py` - dynamic type iterations
- [ ] Update `backend/app/routers/market_overview.py` - dynamic filters
- [ ] Create `backend/app/routers/config.py` - new config endpoint
- [ ] Update `backend/app/main.py` - register new router

### Frontend Changes
- [ ] Create `frontend/src/config/domainTypes.ts` - centralized config
- [ ] Create `frontend/src/contexts/MarketConfigContext.tsx` - React context
- [ ] Update `frontend/src/App.tsx` - load config on startup
- [ ] Add RTL CSS to `frontend/src/index.css`
- [ ] Update all 9 components to use centralized config
- [ ] Add `dir="auto"` to keyword display elements

### Data Preparation
- [ ] Create manual_mappings.json for known insurance domains
- [ ] Prepare new CSV file with Hebrew keywords
- [ ] Prepare new SERP JSON file
- [ ] Delete old database: `data/keywords.db`
- [ ] Run import script
- [ ] Run brand mapping script

---

## How Far Are We?

### Current Genericity Assessment

| Aspect | Status | Gap |
|--------|--------|-----|
| Database Schema | ✅ Generic | No changes needed - domain_type is TEXT |
| CSV Import | ✅ Generic | Handles any columns dynamically |
| SERP Import | ✅ Generic | Works with any keywords/domains |
| Domain Types Config | ❌ Hardcoded | 16 files need updates |
| AI Classification | ❌ Hardcoded | Prompt hardcoded for bikes |
| RTL Support | ❌ Missing | CSS and component updates needed |
| Frontend Colors | ❌ Hardcoded | 9 components with color maps |

### Effort Estimate by Phase

| Phase | Files | Complexity | Priority |
|-------|-------|------------|----------|
| Phase 1: Backend Config | 5 files | Medium | High |
| Phase 2: Frontend Config | 10 files | Medium-High | High |
| Phase 3: RTL Support | 5 files | Low | High |
| Phase 4: Config API | 2 files | Low | Medium |
| Phase 5: AI Prompt | 1 file | Low | High |

### Total Estimated Changes
- **Backend**: ~5 files, ~200 lines
- **Frontend**: ~10 files, ~300 lines
- **New files**: 3 files (~150 lines)

---

## Recommended Implementation Order

1. **Phase 3: RTL Support** (quick win, independent)
2. **Phase 1: Backend Config** (foundation)
3. **Phase 5: AI Prompt** (required for data import)
4. **Phase 2: Frontend Config** (can work in parallel)
5. **Phase 4: Config API** (optional, enhances flexibility)

---

## Questions Before Starting

1. **Domain type names**: Confirm the exact names you want:
   - "Insurance Company" or "חברת ביטוח"?
   - "Comparison Site" or "אתר השוואה"?
   - Keep labels in English or Hebrew?

2. **Number of domain types**: Just 3 (Insurance Company, Comparison Site, UGC) or more?

3. **Color scheme**: Keep current colors or new palette for insurance theme?

4. **Manual mappings**: Do you have a list of known domains and their types?

---

## WHAT WAS DONE (Implementation Complete)

### Backend Changes (Complete)

1. **Created Market Configuration System**
   - `backend/app/config/__init__.py` - Package init
   - `backend/app/config/market_config.py` - Full configuration with:
     - Domain type definitions (Insurance Company, Comparison Site, UGC, 3rd Party)
     - Styling configs (colors, gradients, icons)
     - Market metadata (language: Hebrew, text_direction: RTL)
     - Support for multiple markets (insurance_il, bicycle)
     - Set via `MARKET_CONFIG` environment variable

2. **Updated AI Classification** (`backend/app/services/brand_mapper.py`)
   - Dynamic prompt generation based on market config
   - Domain types read from config, not hardcoded
   - Brand type detection from config

3. **Updated Analytics** (`backend/app/services/market_analytics.py`)
   - Domain type iterations use config
   - Brand type filters use config

4. **Updated Routers** (`backend/app/routers/market_overview.py`)
   - Retailer/voice endpoints use config domain types

5. **Created Config API** (`backend/app/routers/config.py`)
   - `GET /api/config/market` - Returns market config for frontend

### Frontend Changes (Complete)

1. **RTL Support** (`frontend/src/index.css`)
   - Added `.keyword-text`, `.keyword-tag`, `.keyword-cell` CSS classes
   - Auto-detect text direction with `dir="auto"`

2. **Updated Components with RTL**
   - `WinLossTable.tsx` - keyword cells have RTL support
   - `CategoryBreakdown.tsx` - example keywords
   - `ModifierGroupsTable.tsx` - example keywords
   - `OpportunityModifierGroupsTable.tsx` - example keywords

3. **Created Configuration System**
   - `frontend/src/config/domainTypes.ts` - Type definitions and helpers
   - `frontend/src/contexts/MarketConfigContext.tsx` - React context provider
   - `frontend/src/App.tsx` - Wrapped app with MarketConfigProvider

4. **Updated Components to Use Config**
   - `DomainTypesChart.tsx` - uses context
   - `CompetitorChart.tsx` - uses context
   - `InfluentialVoicesTable.tsx` - uses context
   - `MarketProtectionSnapshot.tsx` - uses context
   - `CategoryExplorer.tsx` - partial update (uses fallback)

### Data Files Created

- `scripts/insurance_mappings.json` - Manual domain mappings for your known domains

---

## HOW TO LOAD YOUR DATA

### Step 1: Prepare Your Data Files

1. Place your CSV file in `source_data/keywords.csv` with columns:
   - `Keyword` (Hebrew keywords)
   - `Volume` (search volume)
   - `Modifier Groups` (optional)
   - `brand` (the insurance company brand)
   - Any other category columns

2. Place your SERP JSON in `source_data/serp_results.json`

### Step 2: Clear Old Data

```bash
# Delete the old database
del data\keywords.db
```

### Step 3: Import New Data

```bash
cd scripts
python import_data.py
```

### Step 4: Run Domain Mapping

```bash
# With manual mappings first, then AI for the rest
python map_brands.py --manual insurance_mappings.json
```

### Step 5: Start the Application

```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 6: Open the Dashboard

Visit http://localhost:5173

---

## SWITCHING MARKETS

To switch between markets, set the environment variable before starting the backend:

```bash
# For Insurance (default)
set MARKET_CONFIG=insurance_il

# For Bicycle (original)
set MARKET_CONFIG=bicycle
```

Or update `backend/app/config/market_config.py` line:
```python
CURRENT_MARKET = "insurance_il"  # or "bicycle"
```
