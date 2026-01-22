# Source Data Directory

Place your market data files here, organized by market ID.

## Folder Structure

```
source_data/
├── insurance_il/
│   ├── keywords.csv      # Keyword data with volume and tags
│   ├── serp.json         # SERP ranking data
│   └── mappings.json     # Manual brand-domain mappings (optional)
├── bicycle/
│   ├── keywords.csv
│   ├── serp.json
│   └── mappings.json
└── your_new_market/
    ├── keywords.csv
    ├── serp.json
    └── mappings.json
```

## File Formats

### keywords.csv

Required columns:
- `Keyword` - The search term
- `Volume` - Monthly search volume
- `Modifier Groups` - Keyword classification

All other columns become tag categories automatically.

```csv
Keyword,Volume,Modifier Groups,brand,category,intent
car insurance quote,50000,brand,Geico,auto,transactional
best home insurance,12000,type,,home,informational
```

### serp.json (SERP Rankings)

```json
{
  "keywords": {
    "car insurance quote": [
      {
        "type": "organic",
        "rank_group": 1,
        "domain": "geico.com",
        "url": "https://geico.com/auto-insurance",
        "title": "Car Insurance | GEICO"
      }
    ]
  }
}
```

### mappings.json (Manual Brand-Domain Mappings)

Optional file for overriding AI classification. Useful for:
- Known brand websites
- Common retailers (Amazon, Walmart)
- UGC sites (Reddit, forums)
- Industry-specific review sites

```json
{
  "geico.com": {
    "brand_name": "Geico",
    "domain_type": "Brand",
    "is_primary": true,
    "confidence": 1.0
  },
  "amazon.com": {
    "brand_name": "N/A",
    "domain_type": "Reseller",
    "is_primary": false,
    "confidence": 1.0
  },
  "reddit.com": {
    "brand_name": "N/A",
    "domain_type": "UGC",
    "is_primary": false,
    "confidence": 1.0
  },
  "insurancereview.com": {
    "brand_name": "N/A",
    "domain_type": "3rd Party",
    "is_primary": false,
    "confidence": 1.0
  }
}
```

**Domain Types** (use exact names from your market config):
- `Brand` - Official brand website
- `Reseller` - Multi-brand retailers/aggregators
- `UGC` - User-generated content (forums, Reddit)
- `3rd Party` - Review sites, news, affiliates

## Import Commands

```bash
# List available markets
python scripts/import_data.py --list

# Import data for specific market
python scripts/import_data.py --market insurance_il

# Import all markets
python scripts/import_data.py --all

# Run brand mapping after import
python scripts/map_brands.py --market insurance_il

# Map all markets
python scripts/map_brands.py --all

# Create example mappings.json
python scripts/map_brands.py --create-example --market insurance_il
```

## Workflow

1. **Create market folder**: `source_data/{market_id}/`
2. **Add data files**: `keywords.csv` and `serp.json`
3. **Import data**: `python scripts/import_data.py --market {market_id}`
4. **Add mappings** (optional): Create `mappings.json` for manual overrides
5. **Run mapping**: `python scripts/map_brands.py --market {market_id}`

## Note

Data files are NOT committed to git (added to .gitignore).
Only the folder structure and this README are tracked.
