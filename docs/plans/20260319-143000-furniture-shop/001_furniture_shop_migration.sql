-- ============================================================================
-- Migration: Furniture Shop System
-- Version: 001
-- Date: 2026-03-19
-- Description: Extends existing shop system for furniture with categories,
--              sprite data, and multiplayer furniture placement
-- ============================================================================

-- migrate:up

-- ----------------------------------------------------------------------------
-- 1. Enhance shop_items table with furniture-specific columns
-- ----------------------------------------------------------------------------

-- Add new columns to existing shop_items table
ALTER TABLE shop_items
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS footprint_w INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS footprint_h INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS sprite_width INTEGER NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS sprite_height INTEGER NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS is_desk BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_place_on_surfaces BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_place_on_walls BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS background_tiles INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rotation_group_id TEXT,
    ADD COLUMN IF NOT EXISTS orientation TEXT CHECK(orientation IN ('front', 'back', 'left', 'right', 'side')),
    ADD COLUMN IF NOT EXISTS state_group_id TEXT,
    ADD COLUMN IF NOT EXISTS default_state TEXT CHECK(default_state IN ('on', 'off')),
    ADD COLUMN IF NOT EXISTS animation_group_id TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Add comments for documentation
COMMENT ON TABLE shop_items IS 'Shop catalog including furniture items with placement properties';
COMMENT ON COLUMN shop_items.footprint_w IS 'Tile width of furniture footprint';
COMMENT ON COLUMN shop_items.footprint_h IS 'Tile height of furniture footprint';
COMMENT ON COLUMN shop_items.sprite_width IS 'Sprite pixel width';
COMMENT ON COLUMN shop_items.sprite_height IS 'Sprite pixel height';
COMMENT ON COLUMN shop_items.is_desk IS 'Whether this furniture counts as a desk for seating';
COMMENT ON COLUMN shop_items.can_place_on_surfaces IS 'Whether this item can be placed on desk/table surfaces';
COMMENT ON COLUMN shop_items.can_place_on_walls IS 'Whether this item can be placed on wall tiles';
COMMENT ON COLUMN shop_items.background_tiles IS 'Number of top footprint rows that are background (passable)';
COMMENT ON COLUMN shop_items.rotation_group_id IS 'ID grouping items that can be rotated together';
COMMENT ON COLUMN shop_items.orientation IS 'The orientation of this specific asset variant';
COMMENT ON COLUMN shop_items.state_group_id IS 'ID grouping on/off state variants';
COMMENT ON COLUMN shop_items.default_state IS 'Default state: on or off';
COMMENT ON COLUMN shop_items.animation_group_id IS 'ID grouping animation frame variants';

-- ----------------------------------------------------------------------------
-- 2. Create furniture_categories table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS furniture_categories (
    id              TEXT PRIMARY KEY,
    label           TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    icon_emoji      TEXT,
    is_unlocked     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE furniture_categories IS 'Dynamic categories for furniture catalog';

-- ----------------------------------------------------------------------------
-- 3. Create furniture_assets table for sprite data
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS furniture_assets (
    id              TEXT PRIMARY KEY,
    item_id         TEXT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    asset_type      TEXT NOT NULL CHECK(asset_type IN ('sprite', 'color_mask')),
    asset_data      JSONB NOT NULL,
    frame_number    INTEGER,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE furniture_assets IS 'Sprite and asset data for furniture items';

-- ----------------------------------------------------------------------------
-- 4. Create placed_furniture table for multiplayer furniture persistence
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS placed_furniture (
    id              BIGSERIAL PRIMARY KEY,
    room_id         TEXT NOT NULL,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id         TEXT NOT NULL REFERENCES shop_items(id),
    uid             TEXT NOT NULL,
    col             INTEGER NOT NULL,
    row             INTEGER NOT NULL,
    color_h         INTEGER,
    color_s         INTEGER,
    color_b         INTEGER,
    color_c         INTEGER,
    colorize        BOOLEAN NOT NULL DEFAULT FALSE,
    current_state   TEXT CHECK(current_state IN ('on', 'off')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE placed_furniture IS 'Authoritative storage of placed furniture for multiplayer rooms';
COMMENT ON COLUMN placed_furniture.room_id IS 'Room identifier (e.g., user_id for personal rooms)';
COMMENT ON COLUMN placed_furniture.uid IS 'Unique identifier for this placed instance';
COMMENT ON COLUMN placed_furniture.current_state IS 'Current on/off state for toggleable items';

-- Indexes for placed_furniture
CREATE INDEX IF NOT EXISTS idx_placed_furniture_room ON placed_furniture(room_id);
CREATE INDEX IF NOT EXISTS idx_placed_furniture_user ON placed_furniture(user_id);
CREATE INDEX IF NOT EXISTS idx_placed_furniture_position ON placed_furniture(room_id, col, row);

-- ----------------------------------------------------------------------------
-- 5. Update inventory table with additional fields
-- ----------------------------------------------------------------------------

ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS color_override JSONB,
    ADD COLUMN IF NOT EXISTS current_state TEXT CHECK(current_state IN ('on', 'off'));

COMMENT ON COLUMN inventory.color_override IS 'Optional color customization (HSBC format)';
COMMENT ON COLUMN inventory.current_state IS 'Current state for toggleable items';

-- ----------------------------------------------------------------------------
-- 6. Create shop_purchases audit table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shop_purchases (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    item_id         TEXT NOT NULL REFERENCES shop_items(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    price_paid      INTEGER NOT NULL,
    coins_before    INTEGER NOT NULL,
    coins_after     INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shop_purchases IS 'Audit log of all shop purchases';

CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON shop_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_item ON shop_purchases(item_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 7. Seed initial furniture categories
-- ----------------------------------------------------------------------------

INSERT INTO furniture_categories (id, label, sort_order, icon_emoji) VALUES
    ('desks', 'Desks', 1, 'U+1F4BB'),
    ('chairs', 'Chairs', 2, 'U+1FA91'),
    ('storage', 'Storage', 3, 'U+1F5C1'),
    ('electronics', 'Tech', 4, 'U+1F4F1'),
    ('decor', 'Decor', 5, 'U+1F381'),
    ('wall', 'Wall Items', 6, 'U+1F3F7'),
    ('misc', 'Miscellaneous', 7, 'U+1F50E')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. Update shop_items category foreign key (deferred, to be applied manually)
-- ----------------------------------------------------------------------------

-- Note: Existing shop_items rows have category as a plain string.
-- After this migration, category should reference furniture_categories.id
-- For now, we keep it as a plain string for backward compatibility.

-- ----------------------------------------------------------------------------
-- 9. Create view for shop catalog with joined data
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW shop_catalog_view AS
SELECT
    si.id,
    si.name,
    si.description,
    si.category,
    fc.label as category_label,
    si.price,
    si.rarity,
    si.is_available,
    si.max_per_user,
    si.footprint_w,
    si.footprint_h,
    si.sprite_width,
    si.sprite_height,
    si.is_desk,
    si.can_place_on_surfaces,
    si.can_place_on_walls,
    si.background_tiles,
    si.rotation_group_id,
    si.orientation,
    si.state_group_id,
    si.default_state,
    si.animation_group_id,
    si.metadata,
    si.created_at
FROM shop_items si
LEFT JOIN furniture_categories fc ON si.category = fc.id
WHERE si.is_available = TRUE;

COMMENT ON VIEW shop_catalog_view IS 'Denormalized view for shop catalog queries';

-- ----------------------------------------------------------------------------
-- 10. Create function to update updated_at timestamp
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to placed_furniture
DROP TRIGGER IF EXISTS update_placed_furniture_updated_at ON placed_furniture;
CREATE TRIGGER update_placed_furniture_updated_at
    BEFORE UPDATE ON placed_furniture
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- migrate:down

-- Drop triggers
DROP TRIGGER IF EXISTS update_placed_furniture_updated_at ON placed_furniture;

-- Drop view
DROP VIEW IF EXISTS shop_catalog_view;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order due to dependencies)
DROP TABLE IF EXISTS shop_purchases;
DROP TABLE IF EXISTS placed_furniture;
DROP TABLE IF EXISTS furniture_assets;
DROP TABLE IF EXISTS furniture_categories;

-- Remove columns from shop_items (this will vary by PostgreSQL version)
ALTER TABLE shop_items DROP COLUMN IF EXISTS metadata;
ALTER TABLE shop_items DROP COLUMN IF EXISTS animation_group_id;
ALTER TABLE shop_items DROP COLUMN IF EXISTS default_state;
ALTER TABLE shop_items DROP COLUMN IF EXISTS state_group_id;
ALTER TABLE shop_items DROP COLUMN IF EXISTS orientation;
ALTER TABLE shop_items DROP COLUMN IF EXISTS rotation_group_id;
ALTER TABLE shop_items DROP COLUMN IF EXISTS background_tiles;
ALTER TABLE shop_items DROP COLUMN IF EXISTS can_place_on_walls;
ALTER TABLE shop_items DROP COLUMN IF EXISTS can_place_on_surfaces;
ALTER TABLE shop_items DROP COLUMN IF EXISTS is_desk;
ALTER TABLE shop_items DROP COLUMN IF EXISTS sprite_height;
ALTER TABLE shop_items DROP COLUMN IF EXISTS sprite_width;
ALTER TABLE shop_items DROP COLUMN IF EXISTS footprint_h;
ALTER TABLE shop_items DROP COLUMN IF EXISTS footprint_w;
ALTER TABLE shop_items DROP COLUMN IF EXISTS description;

-- Remove columns from inventory
ALTER TABLE inventory DROP COLUMN IF EXISTS current_state;
ALTER TABLE inventory DROP COLUMN IF EXISTS color_override;
