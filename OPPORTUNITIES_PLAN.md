# Opportunities Dashboard - Future Implementation Plan

## Overview

This document captures ideas for a future **Opportunities Dashboard** that will help identify high-value keywords where brands can realistically improve their rankings. This is a separate initiative from the Market Overview tab.

---

## Core Concept

The Opportunities Dashboard will surface keywords that are:
1. **High Value** - Significant search volume
2. **Winnable** - Current competition shows signs of weakness
3. **Relevant** - Match brand's category strengths

---

## Opportunity Signals (Each Could Be a Separate View)

### 1. Low #1 Visibility Score
**Logic:** The domain ranking #1 has low overall market visibility (doesn't dominate similar keywords)

**What it indicates:** The current winner may have gotten lucky or optimized for just this keyword - they're not a dominant force.

**Calculation:**
```sql
SELECT k.keyword, k.volume, d.domain as winner,
       (SELECT SUM(k2.volume / sr2.rank_group)
        FROM serp_results sr2
        JOIN keywords k2 ON sr2.keyword_id = k2.id
        WHERE sr2.domain_id = sr.domain_id) as winner_visibility
FROM keywords k
JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group = 1
JOIN domains d ON sr.domain_id = d.id
WHERE k.volume > 1000
ORDER BY k.volume DESC, winner_visibility ASC
```

**Use case:** Find high-volume keywords where the #1 isn't a market leader.

---

### 2. High Fragmentation (No Dominant Player)
**Logic:** Top 5 positions have 5 different domains (no single player holds multiple spots)

**What it indicates:** Market is unsettled, no player has established dominance.

**Calculation:**
```sql
SELECT k.keyword, k.volume,
       COUNT(DISTINCT sr.domain_id) as unique_domains_in_top5
FROM keywords k
JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group <= 5
WHERE k.volume > 1000
GROUP BY k.id
HAVING unique_domains_in_top5 >= 4
ORDER BY k.volume DESC
```

**Use case:** Find keywords where the battle is still being fought.

---

### 3. UGC/Forum Dominance
**Logic:** Reddit, forums, or Q&A sites rank #1

**What it indicates:** Brands aren't optimizing for these queries - users are seeking peer advice instead of brand content.

**Calculation:**
```sql
SELECT k.keyword, k.volume, d.domain as winner, bd.domain_type
FROM keywords k
JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group = 1
JOIN domains d ON sr.domain_id = d.id
JOIN brand_domains bd ON d.id = bd.domain_id
WHERE bd.domain_type = 'UGC'
  AND k.volume > 500
ORDER BY k.volume DESC
```

**Use case:** Content marketing opportunities - create better brand content to capture these queries.

---

### 4. No Brand in Top 5
**Logic:** No official brand domain (domain_type = 'Brand') appears in positions 1-5

**What it indicates:** Pure opportunity - brands haven't targeted this keyword at all.

**Calculation:**
```sql
SELECT k.keyword, k.volume
FROM keywords k
WHERE k.volume > 500
  AND NOT EXISTS (
    SELECT 1 FROM serp_results sr
    JOIN domains d ON sr.domain_id = d.id
    JOIN brand_domains bd ON d.id = bd.domain_id
    WHERE sr.keyword_id = k.id
      AND sr.rank_group <= 5
      AND bd.domain_type = 'Brand'
  )
ORDER BY k.volume DESC
```

**Use case:** Identify completely uncontested branded search opportunities.

---

### 5. 3rd Party/Review Site Dominance
**Logic:** Review sites, affiliates, or comparison sites rank #1

**What it indicates:** Users want independent opinions - but brands could create comparison content or improve their own presence.

**Calculation:**
```sql
SELECT k.keyword, k.volume, d.domain as winner
FROM keywords k
JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group = 1
JOIN domains d ON sr.domain_id = d.id
JOIN brand_domains bd ON d.id = bd.domain_id
WHERE bd.domain_type = '3rd Party'
  AND k.volume > 500
ORDER BY k.volume DESC
```

**Use case:** PR/outreach opportunities or content strategy adjustments.

---

### 6. Retailer Dominance (Brand Absent)
**Logic:** Retailers (Amazon, Walmart, etc.) rank #1 but the actual brand doesn't appear in top 10

**What it indicates:** Brand is losing direct traffic to resellers - potential DTC opportunity.

**Calculation:**
```sql
SELECT k.keyword, k.volume,
       d.domain as retailer_winner,
       kt.value as brand_tag
FROM keywords k
JOIN keyword_tags kt ON k.id = kt.keyword_id
JOIN categories c ON kt.category_id = c.id AND c.name = 'brand'
JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group = 1
JOIN domains d ON sr.domain_id = d.id
JOIN brand_domains bd ON d.id = bd.domain_id AND bd.domain_type = 'Reseller'
LEFT JOIN brand_domains brand_bd ON kt.value = brand_bd.brand_name AND brand_bd.is_primary = 1
WHERE NOT EXISTS (
    SELECT 1 FROM serp_results sr2
    WHERE sr2.keyword_id = k.id
      AND sr2.rank_group <= 10
      AND sr2.domain_id = brand_bd.domain_id
  )
ORDER BY k.volume DESC
```

**Use case:** DTC strategy - capture traffic going to retailers.

---

## Composite Opportunity Score

Combine multiple signals into a single score:

```
Opportunity Score =
  base_volume_score ×
  competition_weakness_multiplier ×
  relevance_bonus

Where:
- base_volume_score = log(volume) normalized to 0-100
- competition_weakness_multiplier =
    (0.3 × low_visibility_factor) +
    (0.2 × fragmentation_factor) +
    (0.25 × ugc_bonus) +
    (0.25 × no_brand_bonus)
- relevance_bonus = 1.0 + (0.2 if matches brand's strong categories)
```

---

## Proposed Dashboard Sections

### 1. Opportunity Overview KPIs
- Total opportunity volume in market
- Keywords with weak competition count
- Top opportunity categories

### 2. Opportunity Explorer
Filterable table with:
- Keyword
- Volume
- Current #1 (domain + type)
- Opportunity signals (badges)
- Composite score
- Relevant brand (if branded keyword)

### 3. Opportunity by Signal Type
Tabs or filters:
- Low Visibility Winners
- High Fragmentation
- UGC Dominated
- No Brand Present
- Retailer Dominated

### 4. Category Opportunities
Which categories have most opportunity keywords

### 5. Brand-Specific Opportunities
For each brand, show their top opportunities based on:
- Their tagged keywords where they don't rank #1
- Keywords in their strong categories

---

## Implementation Notes

### Prerequisites
- Market Overview dashboard completed
- Visibility scores pre-calculated (or calculated on-demand)
- Domain type classification complete for all major domains

### Performance Considerations
- Some queries are expensive (subqueries, NOT EXISTS)
- Consider pre-computing opportunity scores nightly
- Add database indexes for common filters

### Potential Enhancements
- Difficulty score (based on winner's authority)
- Trend data (if available) - rising opportunities
- Export to CSV for SEO team
- Integration with task management (create SEO tasks)

---

## Questions to Answer Before Implementation

1. **Volume threshold** - What's the minimum volume to consider?
2. **Brand focus** - Should this be brand-specific or market-wide?
3. **Actionability** - What actions can users take from this dashboard?
4. **Update frequency** - Real-time or daily batch?
5. **Prioritization** - How should opportunities be ranked?

---

*Document Version: 1.0*
*Created: January 2026*
*Status: Future Implementation*
*Depends on: Market Overview Dashboard*
