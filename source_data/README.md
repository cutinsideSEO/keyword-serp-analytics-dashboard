# Source Data Directory

Place your market data files here, organized by market ID.

## Folder Structure

```
source_data/
├── insurance_il/
│   ├── keywords.csv      # Keyword data with volume and tags
│   └── serp.json         # SERP ranking data
├── bicycle/
│   ├── keywords.csv
│   └── serp.json
└── your_new_market/
    ├── keywords.csv
    └── serp.json
```

## CSV Format

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

## JSON Format (SERP Data)

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

## Import Commands

```bash
# List available markets
python scripts/import_data.py --list

# Import specific market
python scripts/import_data.py --market insurance_il

# Import all markets
python scripts/import_data.py --all
```

## Note

Data files are NOT committed to git (added to .gitignore).
Only the folder structure and this README are tracked.
