-- migrate:up
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

-- migrate:down
DROP TABLE IF EXISTS agents;
