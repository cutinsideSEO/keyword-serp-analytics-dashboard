-- Migration: add_modifier_group_heatmap_rpc
-- Description: RPC function for two-category heatmap cross-tabulation
-- Returns opportunity metrics for each (row_value, col_value) combination within a modifier group
--
-- To apply this migration:
-- Option 1: Run in Supabase SQL Editor
-- Option 2: Use psycopg2 with DATABASE_URL from backend/.env

CREATE OR REPLACE FUNCTION get_modifier_group_heatmap(
    p_market_id TEXT,
    p_brand_name TEXT,
    p_modifier_group TEXT,
    p_row_category TEXT,
    p_col_category TEXT,
    p_keyword_type TEXT DEFAULT 'nonbranded',
    p_max_rows INT DEFAULT 12,
    p_max_cols INT DEFAULT 12
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_brand_domain_ids INT[];
    v_result JSON;
    v_row_cat_display TEXT;
    v_col_cat_display TEXT;
BEGIN
    -- Get brand domain IDs
    SELECT ARRAY_AGG(bd.domain_id) INTO v_brand_domain_ids
    FROM brand_domains bd
    WHERE bd.market_id = p_market_id AND bd.brand_name = p_brand_name;

    IF v_brand_domain_ids IS NULL THEN
        v_brand_domain_ids := ARRAY[]::INT[];
    END IF;

    -- Get category display names
    SELECT display_name INTO v_row_cat_display
    FROM categories WHERE market_id = p_market_id AND name = p_row_category;

    SELECT display_name INTO v_col_cat_display
    FROM categories WHERE market_id = p_market_id AND name = p_col_category;

    -- Build the result
    WITH
    -- Get branded keyword IDs to exclude (for nonbranded) or include (for competitor_branded)
    branded_kw_ids AS (
        SELECT DISTINCT kt.keyword_id
        FROM keyword_tags kt
        JOIN categories c ON kt.category_id = c.id
        JOIN markets m ON c.market_id = m.id
        WHERE c.market_id = p_market_id
          AND c.name = ANY(
              SELECT jsonb_array_elements_text(m.brand_category_names::jsonb)
          )
          AND kt.value IS NOT NULL
          AND kt.value != ''
    ),
    -- Filter keywords for this modifier group
    filtered_keywords AS (
        SELECT k.id, k.volume
        FROM keywords k
        WHERE k.market_id = p_market_id
          AND k.modifier_group = p_modifier_group
          AND (
              (p_keyword_type = 'nonbranded' AND k.id NOT IN (SELECT keyword_id FROM branded_kw_ids))
              OR
              (p_keyword_type = 'competitor_branded' AND k.id IN (SELECT keyword_id FROM branded_kw_ids))
          )
    ),
    -- Get row category values for filtered keywords
    row_tags AS (
        SELECT kt.keyword_id, kt.value as row_value
        FROM keyword_tags kt
        JOIN categories c ON kt.category_id = c.id
        WHERE c.market_id = p_market_id
          AND c.name = p_row_category
          AND kt.keyword_id IN (SELECT id FROM filtered_keywords)
    ),
    -- Get col category values for filtered keywords
    col_tags AS (
        SELECT kt.keyword_id, kt.value as col_value
        FROM keyword_tags kt
        JOIN categories c ON kt.category_id = c.id
        WHERE c.market_id = p_market_id
          AND c.name = p_col_category
          AND kt.keyword_id IN (SELECT id FROM filtered_keywords)
    ),
    -- Calculate metrics for all combinations
    all_combinations AS (
        SELECT
            rt.row_value,
            ct.col_value,
            COUNT(DISTINCT fk.id) as total_keywords,
            COALESCE(SUM(fk.volume), 0) as total_volume,
            COALESCE(SUM(CASE WHEN ow.domain_id = ANY(v_brand_domain_ids) THEN fk.volume ELSE 0 END), 0) as volume_captured,
            COALESCE(SUM(CASE WHEN ow.domain_id IS NULL OR ow.domain_id != ALL(v_brand_domain_ids) THEN fk.volume ELSE 0 END), 0) as volume_uncaptured
        FROM filtered_keywords fk
        JOIN row_tags rt ON fk.id = rt.keyword_id
        JOIN col_tags ct ON fk.id = ct.keyword_id
        LEFT JOIN organic_winners ow ON ow.keyword_id = fk.id
        GROUP BY rt.row_value, ct.col_value
    ),
    -- Get top N row values by total volume_uncaptured
    top_rows AS (
        SELECT row_value, SUM(volume_uncaptured) as row_total
        FROM all_combinations
        GROUP BY row_value
        ORDER BY row_total DESC
        LIMIT p_max_rows
    ),
    -- Get top N col values by total volume_uncaptured
    top_cols AS (
        SELECT col_value, SUM(volume_uncaptured) as col_total
        FROM all_combinations
        GROUP BY col_value
        ORDER BY col_total DESC
        LIMIT p_max_cols
    ),
    -- Final filtered combinations (only top rows and cols)
    final_combinations AS (
        SELECT
            ac.row_value,
            ac.col_value,
            ac.total_keywords,
            ac.total_volume,
            ac.volume_captured,
            ac.volume_uncaptured,
            CASE WHEN ac.total_volume > 0
                 THEN ROUND(100.0 * ac.volume_captured / ac.total_volume, 1)
                 ELSE 0 END as capture_rate
        FROM all_combinations ac
        WHERE ac.row_value IN (SELECT row_value FROM top_rows)
          AND ac.col_value IN (SELECT col_value FROM top_cols)
    )
    SELECT json_build_object(
        'modifier_group', p_modifier_group,
        'row_category', p_row_category,
        'row_category_display', COALESCE(v_row_cat_display, p_row_category),
        'col_category', p_col_category,
        'col_category_display', COALESCE(v_col_cat_display, p_col_category),
        'row_values', (SELECT COALESCE(json_agg(row_value ORDER BY row_total DESC), '[]'::json) FROM top_rows),
        'col_values', (SELECT COALESCE(json_agg(col_value ORDER BY col_total DESC), '[]'::json) FROM top_cols),
        'cells', (
            SELECT COALESCE(json_agg(json_build_object(
                'row_value', row_value,
                'col_value', col_value,
                'total_keywords', total_keywords,
                'total_volume', total_volume,
                'volume_captured', volume_captured,
                'volume_uncaptured', volume_uncaptured,
                'capture_rate', capture_rate
            )), '[]'::json)
            FROM final_combinations
        ),
        'max_volume_uncaptured', (SELECT COALESCE(MAX(volume_uncaptured), 0) FROM final_combinations),
        'total_combinations', (SELECT COUNT(*) FROM final_combinations)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_modifier_group_heatmap TO anon, authenticated;