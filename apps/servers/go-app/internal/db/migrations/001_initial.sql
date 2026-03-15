-- migrate:up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE TABLE IF NOT EXISTS processed_requests (
    request_id  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS inventory (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    item_id         TEXT NOT NULL REFERENCES shop_items(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);

CREATE TABLE IF NOT EXISTS room_layouts (
    user_id         TEXT PRIMARY KEY REFERENCES users(id),
    layout_data     JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:down
DROP TABLE IF EXISTS room_layouts;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS shop_items;
DROP TABLE IF EXISTS processed_requests;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS users;
