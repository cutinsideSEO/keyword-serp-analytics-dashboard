-- Migration: fix_combination_keywords_column
-- Description: Fix column name bug - market_domain_types has display_name not name
-- The RPC was failing with "column mdt.name does not exist"

CREATE OR REPLACE FUNCTION get_combination_keywords(
    p_market_id TEXT,
    p_brand_name TEXT,
    p_modifier_group TEXT,
    p_row_category TEXT,
    p_row_value TEXT,
    p_col_category TEXT,
    p_col_value TEXT,
    p_keyword_type TEXT DEFAULT 'nonbranded',
    p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_brand_domain_ids INT[];
    v_result JSON;
    v_row_cat_name TEXT;
    v_col_cat_name TEXT;
BEGIN
    -- Get brand domain IDs
    SELECT ARRAY_AGG(bd.domain_id) INTO v_brand_domain_ids
    FROM brand_domains bd
    WHERE bd.market_id = p_market_id AND bd.brand_name = p_brand_name;

    IF v_brand_domain_ids IS NULL THEN
        v_brand_domain_ids := ARRAY[]::INT[];
    END IF;

    -- Find row category by matching display_name prefix (case-insensitive)
    SELECT name INTO v_row_cat_name
    FROM categories
    WHERE market_id = p_market_id
      AND (
          LOWER(display_name) LIKE LOWER(p_row_category) || '%'
          OR LOWER(REPLACE(display_name, ' - Canonical', '')) = LOWER(p_row_category)
          OR name = p_row_category
      )
    LIMIT 1;

    -- Find col category by matching display_name prefix (case-insensitive)
    SELECT name INTO v_col_cat_name
    FROM categories
    WHERE market_id = p_market_id
      AND (
          LOWER(display_name) LIKE LOWER(p_col_category) || '%'
          OR LOWER(REPLACE(display_name, ' - Canonical', '')) = LOWER(p_col_category)
          OR name = p_col_category
      )
    LIMIT 1;

    -- If categories not found, return empty result
    IF v_row_cat_name IS NULL OR v_col_cat_name IS NULL THEN
        RETURN json_build_object(
            'row_value', p_row_value,
            'col_value', p_col_value,
            'row_category', p_row_category,
            'col_category', p_col_category,
            'total_keywords', 0,
            'total_volume', 0,
            'volume_captured', 0,
            'volume_uncaptured', 0,
            'capture_rate', 0,
            'keywords', '[]'::json
        );
    END IF;

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
    -- Filter keywords for this modifier group and combination
    filtered_keywords AS (
        SELECT k.id, k.keyword, k.volume
        FROM keywords k
        JOIN keyword_tags kt_row ON k.id = kt_row.keyword_id
        JOIN categories c_row ON kt_row.category_id = c_row.id
        JOIN keyword_tags kt_col ON k.id = kt_col.keyword_id
        JOIN categories c_col ON kt_col.category_id = c_col.id
        WHERE k.market_id = p_market_id
          AND k.modifier_group = p_modifier_group
          AND c_row.market_id = p_market_id
          AND c_row.name = v_row_cat_name
          AND kt_row.value = p_row_value
          AND c_col.market_id = p_market_id
          AND c_col.name = v_col_cat_name
          AND kt_col.value = p_col_value
          AND (
              (p_keyword_type = 'nonbranded' AND k.id NOT IN (SELECT keyword_id FROM branded_kw_ids))
              OR
              (p_keyword_type = 'competitor_branded' AND k.id IN (SELECT keyword_id FROM branded_kw_ids))
          )
    ),
    -- Get winner info and brand position for each keyword
    keyword_details AS (
        SELECT
            fk.id,
            fk.keyword,
            fk.volume,
            ow.domain_id as winner_domain_id,
            d.domain as winner_domain,
            COALESCE(
                (SELECT bd.domain_type FROM brand_domains bd
                 WHERE bd.domain_id = ow.domain_id AND bd.market_id = p_market_id
                 LIMIT 1),
                -- FIX: Changed mdt.name to mdt.display_name
                (SELECT mdt.display_name FROM market_domain_types mdt
                 WHERE mdt.market_id = p_market_id AND mdt.display_name = '3rd Party'
                 LIMIT 1),
                '3rd Party'
            ) as winner_domain_type,
            CASE WHEN ow.domain_id = ANY(v_brand_domain_ids) THEN TRUE ELSE FALSE END as is_captured,
            -- Get brand's best position on this keyword
            (
                SELECT MIN(sr.rank_absolute)
                FROM serp_results sr
                WHERE sr.keyword_id = fk.id
                  AND sr.domain_id = ANY(v_brand_domain_ids)
                  AND sr.result_type = 'organic'
            ) as brand_position
        FROM filtered_keywords fk
        LEFT JOIN organic_winners ow ON ow.keyword_id = fk.id
        LEFT JOIN domains d ON ow.domain_id = d.id
    ),
    -- Get top 5 ranking domains for each keyword
    top_rankings AS (
        SELECT
            sr.keyword_id,
            json_agg(
                json_build_object(
                    'rank', sr.rank_absolute,
                    'domain', d.domain,
                    'domain_type', COALESCE(
                        (SELECT bd.domain_type FROM brand_domains bd
                         WHERE bd.domain_id = sr.domain_id AND bd.market_id = p_market_id
                         LIMIT 1),
                        '3rd Party'
                    )
                ) ORDER BY sr.rank_absolute
            ) as top_5
        FROM serp_results sr
        JOIN domains d ON sr.domain_id = d.id
        WHERE sr.keyword_id IN (SELECT id FROM filtered_keywords)
          AND sr.result_type = 'organic'
          AND sr.rank_absolute <= 5
        GROUP BY sr.keyword_id
    ),
    -- Calculate summary stats
    summary AS (
        SELECT
            COUNT(*) as total_keywords,
            COALESCE(SUM(volume), 0) as total_volume,
            COALESCE(SUM(CASE WHEN is_captured THEN volume ELSE 0 END), 0) as volume_captured,
            COALESCE(SUM(CASE WHEN NOT is_captured THEN volume ELSE 0 END), 0) as volume_uncaptured
        FROM keyword_details
    )
    SELECT json_build_object(
        'row_value', p_row_value,
        'col_value', p_col_value,
        'row_category', v_row_cat_name,
        'col_category', v_col_cat_name,
        'total_keywords', (SELECT total_keywords FROM summary),
        'total_volume', (SELECT total_volume FROM summary),
        'volume_captured', (SELECT volume_captured FROM summary),
        'volume_uncaptured', (SELECT volume_uncaptured FROM summary),
        'capture_rate', CASE
            WHEN (SELECT total_volume FROM summary) > 0
            THEN ROUND(100.0 * (SELECT volume_captured FROM summary) / (SELECT total_volume FROM summary), 1)
            ELSE 0
        END,
        'keywords', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'keyword_id', kd.id,
                    'keyword', kd.keyword,
                    'volume', kd.volume,
                    'brand_position', kd.brand_position,
                    'is_captured', kd.is_captured,
                    'winner_domain', kd.winner_domain,
                    'winner_domain_type', kd.winner_domain_type,
                    'top_5', COALESCE(tr.top_5, '[]'::json)
                ) ORDER BY kd.volume DESC
            ), '[]'::json)
            FROM (SELECT * FROM keyword_details ORDER BY volume DESC LIMIT p_limit) kd
            LEFT JOIN top_rankings tr ON kd.id = tr.keyword_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_combination_keywords TO anon, authenticated;
