-- Migration: fix_category_matching_exact_first
-- Description: Fix category matching to prefer exact matches over prefix matches
-- This fixes the issue where "parts" incorrectly matched "Parts Brands" instead of "Parts"
-- because the LIKE 'parts%' pattern matched both.
--
-- The fix: Try exact match first, only fall back to prefix match if no exact match found.

-- See full SQL in mcp__supabase__apply_migration call
-- Applied to database on 2026-01-30
