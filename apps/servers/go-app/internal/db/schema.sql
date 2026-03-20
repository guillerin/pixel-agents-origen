-- Users
CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id          TEXT UNIQUE,
    microsoft_id        TEXT UNIQUE,
    display_name        TEXT NOT NULL DEFAULT 'Agent',
    email               TEXT,
    coins               INTEGER NOT NULL DEFAULT 0,
    total_tokens_used   BIGINT NOT NULL DEFAULT 0,
    total_coins_earned  INTEGER NOT NULL DEFAULT 0,
    palette             INTEGER NOT NULL DEFAULT 0,
    hue_shift           INTEGER NOT NULL DEFAULT 0,
    role                TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coin transactions (append-only ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    type            TEXT NOT NULL CHECK(type IN ('earn', 'spend')),
    amount          INTEGER NOT NULL,
    balance_after   INTEGER NOT NULL,
    reason          TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);

-- Deduplication of token reports
CREATE TABLE IF NOT EXISTS processed_requests (
    request_id  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shop catalog
CREATE TABLE IF NOT EXISTS shop_items (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    price           INTEGER NOT NULL,
    rarity          TEXT NOT NULL DEFAULT 'common' CHECK(rarity IN ('common', 'uncommon', 'rare', 'legendary')),
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    max_per_user    INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User inventory
CREATE TABLE IF NOT EXISTS inventory (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    item_id         TEXT NOT NULL REFERENCES shop_items(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);

-- Room layouts (server-side persistence for multiplayer)
CREATE TABLE IF NOT EXISTS room_layouts (
    user_id         TEXT PRIMARY KEY REFERENCES users(id),
    layout_data     JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Furniture shop categories
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

-- Furniture products catalog
CREATE TABLE IF NOT EXISTS furniture_products (
    id              TEXT PRIMARY KEY,
    category_id     TEXT NOT NULL REFERENCES furniture_categories(id) ON DELETE RESTRICT,
    name            TEXT NOT NULL,
    description     TEXT,
    price_coins     INTEGER NOT NULL CHECK (price_coins >= 0),
    rarity          TEXT NOT NULL DEFAULT 'common'
                        CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
    width           INTEGER NOT NULL DEFAULT 1 CHECK (width > 0),
    height          INTEGER NOT NULL DEFAULT 1 CHECK (height > 0),
    can_stack       BOOLEAN NOT NULL DEFAULT FALSE,
    sprite_url      TEXT NOT NULL,
    thumbnail_url   TEXT,
    preview_url     TEXT,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    available_from  TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    stock_quantity  INTEGER CHECK (stock_quantity >= 0),
    max_per_user    INTEGER CHECK (max_per_user > 0),
    tags            TEXT[] NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (
        available_from IS NULL
        OR available_until IS NULL
        OR available_from < available_until
    )
);

-- User furniture inventory
CREATE TABLE IF NOT EXISTS user_furniture_inventory (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id          TEXT NOT NULL REFERENCES furniture_products(id) ON DELETE CASCADE,
    quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    first_purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_purchased_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_furniture_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_product ON user_furniture_inventory(product_id);

-- Furniture purchase audit log
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
CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON furniture_purchase_history(user_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_product ON furniture_purchase_history(product_id, purchased_at DESC);

-- Room furniture placements (positioned furniture per user/room)
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
CREATE INDEX IF NOT EXISTS idx_room_placements_user_room ON room_furniture_placements(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_room_placements_position ON room_furniture_placements(user_id, room_id, x, y);

-- Active agents per user (multiplayer visibility)
CREATE TABLE IF NOT EXISTS agents (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_local_id  INTEGER NOT NULL,
    palette         INTEGER NOT NULL DEFAULT 0,
    hue_shift       INTEGER NOT NULL DEFAULT 0,
    seat_id         TEXT,
    status          TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('active', 'waiting', 'idle')),
    current_tool    TEXT,
    is_subagent     BOOLEAN NOT NULL DEFAULT FALSE,
    parent_agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, agent_local_id)
);
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
