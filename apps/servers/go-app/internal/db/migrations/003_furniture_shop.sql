-- ============================================================================
-- Migration: Furniture Shop System
-- Version: 003
-- Date: 2026-03-19
-- Description: Creates furniture shop tables: categories, products, inventory,
--              purchase history, and room placements.
-- ============================================================================

-- migrate:up

-- ----------------------------------------------------------------------------
-- 1. furniture_categories
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS furniture_categories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    description     TEXT,
    icon_url        TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE furniture_categories IS 'Dynamic categories for the furniture shop catalog';

-- ----------------------------------------------------------------------------
-- 2. furniture_products
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS furniture_products (
    id              TEXT PRIMARY KEY,
    category_id     TEXT NOT NULL REFERENCES furniture_categories(id) ON DELETE RESTRICT,
    name            TEXT NOT NULL,
    description     TEXT,

    -- Pricing
    price_coins     INTEGER NOT NULL CHECK (price_coins >= 0),

    -- Rarity
    rarity          TEXT NOT NULL DEFAULT 'common'
                        CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),

    -- Dimensions for placement validation
    width           INTEGER NOT NULL DEFAULT 1 CHECK (width > 0),
    height          INTEGER NOT NULL DEFAULT 1 CHECK (height > 0),
    can_stack       BOOLEAN NOT NULL DEFAULT FALSE,

    -- Visual assets
    sprite_url      TEXT NOT NULL,
    thumbnail_url   TEXT,
    preview_url     TEXT,

    -- Availability
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    available_from  TIMESTAMPTZ,
    available_until TIMESTAMPTZ,

    -- Stock (NULL = unlimited, integer = limited stock remaining)
    stock_quantity  INTEGER CHECK (stock_quantity >= 0),

    -- Purchase limits
    max_per_user    INTEGER CHECK (max_per_user > 0),

    -- Metadata
    tags            TEXT[] NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validate date range (bug fix: original design had syntax error `OR)`)
    CONSTRAINT valid_date_range CHECK (
        available_from IS NULL
        OR available_until IS NULL
        OR available_from < available_until
    )
);

COMMENT ON TABLE furniture_products IS 'Furniture items available in the shop';
COMMENT ON COLUMN furniture_products.stock_quantity IS 'Remaining global stock. NULL = unlimited. 0 = sold out.';

-- ----------------------------------------------------------------------------
-- 3. user_furniture_inventory
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_furniture_inventory (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id          TEXT NOT NULL REFERENCES furniture_products(id) ON DELETE CASCADE,
    quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    first_purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_purchased_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

COMMENT ON TABLE user_furniture_inventory IS 'Tracks owned furniture items per user';

-- ----------------------------------------------------------------------------
-- 4. furniture_purchase_history
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS furniture_purchase_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    product_id      TEXT NOT NULL REFERENCES furniture_products(id),
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    coins_spent     INTEGER NOT NULL CHECK (coins_spent >= 0),
    balance_after   INTEGER NOT NULL CHECK (balance_after >= 0),
    transaction_id  BIGINT REFERENCES transactions(id),
    purchase_method TEXT NOT NULL DEFAULT 'shop'
                        CHECK (purchase_method IN ('shop', 'admin', 'gift', 'refund')),
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE furniture_purchase_history IS 'Audit log of all furniture purchases';

-- ----------------------------------------------------------------------------
-- 5. room_furniture_placements
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS room_furniture_placements (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_item_id   BIGINT NOT NULL REFERENCES user_furniture_inventory(id) ON DELETE CASCADE,
    x                   INTEGER NOT NULL CHECK (x >= 0),
    y                   INTEGER NOT NULL CHECK (y >= 0),
    rotation            INTEGER NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
    layer               INTEGER NOT NULL DEFAULT 0,
    room_id             TEXT NOT NULL DEFAULT 'main',
    placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE room_furniture_placements IS 'Positions of placed furniture items in rooms';
COMMENT ON COLUMN room_furniture_placements.room_id IS 'Room identifier (supports future multi-room)';

-- ----------------------------------------------------------------------------
-- 6. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_furniture_products_category
    ON furniture_products (category_id);

CREATE INDEX IF NOT EXISTS idx_furniture_products_rarity
    ON furniture_products (rarity);

CREATE INDEX IF NOT EXISTS idx_furniture_products_availability
    ON furniture_products (is_available, available_from, available_until);

CREATE INDEX IF NOT EXISTS idx_furniture_products_price
    ON furniture_products (price_coins);

CREATE INDEX IF NOT EXISTS idx_furniture_products_tags
    ON furniture_products USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user
    ON user_furniture_inventory (user_id);

CREATE INDEX IF NOT EXISTS idx_user_inventory_product
    ON user_furniture_inventory (product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_history_user
    ON furniture_purchase_history (user_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_history_product
    ON furniture_purchase_history (product_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_placements_user_room
    ON room_furniture_placements (user_id, room_id);

CREATE INDEX IF NOT EXISTS idx_room_placements_position
    ON room_furniture_placements (user_id, room_id, x, y);

-- ----------------------------------------------------------------------------
-- 7. updated_at trigger function and triggers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_furniture_categories_updated_at ON furniture_categories;
CREATE TRIGGER update_furniture_categories_updated_at
    BEFORE UPDATE ON furniture_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_furniture_products_updated_at ON furniture_products;
CREATE TRIGGER update_furniture_products_updated_at
    BEFORE UPDATE ON furniture_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_placements_updated_at ON room_furniture_placements;
CREATE TRIGGER update_room_placements_updated_at
    BEFORE UPDATE ON room_furniture_placements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. View: shop catalog (convenience for queries)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW furniture_shop_catalog AS
SELECT
    p.id,
    p.category_id,
    c.name          AS category_name,
    c.display_name  AS category_display_name,
    p.name,
    p.description,
    p.price_coins,
    p.rarity,
    p.width,
    p.height,
    p.can_stack,
    p.sprite_url,
    p.thumbnail_url,
    p.is_available,
    p.stock_quantity,
    p.max_per_user,
    p.tags,
    p.metadata,
    p.created_at
FROM furniture_products p
JOIN furniture_categories c ON c.id = p.category_id
WHERE p.is_available = TRUE
  AND c.is_active = TRUE
  AND (p.available_from IS NULL OR p.available_from <= NOW())
  AND (p.available_until IS NULL OR p.available_until > NOW())
  AND (p.stock_quantity IS NULL OR p.stock_quantity > 0);

COMMENT ON VIEW furniture_shop_catalog IS 'Currently purchasable products with category info';

-- migrate:down

DROP VIEW IF EXISTS furniture_shop_catalog;

DROP TRIGGER IF EXISTS update_room_placements_updated_at ON room_furniture_placements;
DROP TRIGGER IF EXISTS update_furniture_products_updated_at ON furniture_products;
DROP TRIGGER IF EXISTS update_furniture_categories_updated_at ON furniture_categories;

DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS room_furniture_placements;
DROP TABLE IF EXISTS furniture_purchase_history;
DROP TABLE IF EXISTS user_furniture_inventory;
DROP TABLE IF EXISTS furniture_products;
DROP TABLE IF EXISTS furniture_categories;
