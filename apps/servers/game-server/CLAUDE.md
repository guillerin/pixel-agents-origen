# Game Server — Go Backend

Go 1.22+ WebSocket + REST server for Token Town. Handles real-time multiplayer, economy (token-to-coin conversion), shop, inventory, and room management.

## Architecture

```
cmd/server/
  main.go                    — Entry point: HTTP server + WS upgrade
internal/
  api/
    routes.go                — chi router setup, middleware chain
    admin.go                 — Admin endpoints (users, stats, shop CRUD)
    auth.go                  — POST /api/auth/register, GET /api/auth/me
    economy.go               — POST /api/economy/report-tokens, GET /api/economy/balance
    inventory.go             — GET /api/inventory
    leaderboard.go           — GET /api/leaderboard
    rooms.go                 — GET /api/rooms/:userId, PUT /api/rooms/me
    shop.go                  — GET /api/shop/catalog, POST /api/shop/purchase
  auth/
    middleware.go            — Token validation middleware
    tokens.go                — HMAC-SHA256 session token generation/validation
  db/
    db.go                    — PostgreSQL connection (pgx/v5)
    schema.sql               — Source of truth for DB schema
    migrations/              — golang-migrate migration files
  economy/
    coins.go                 — Token-to-coin conversion formula (pure functions)
    shop.go                  — Purchase validation, price derivation
    wallet.go                — Atomic coin operations (earn/spend with ledger)
  rooms/
    manager.go               — Room lifecycle: create, join, leave
    state.go                 — Authoritative room state
  ws/
    hub.go                   — WebSocket hub: room-scoped broadcast, register/unregister
    client.go                — Per-connection read/write pumps (gorilla pattern)
    events.go                — Event type definitions (Go structs matching shared TS types)
```

## Key Patterns

- **Hub pattern**: Central `Hub` goroutine manages rooms as `map[string]map[*Client]bool`. Broadcast is room-scoped
- **Read/Write pumps**: Each WebSocket connection has two goroutines (gorilla standard pattern). Ping every 54s, pong timeout 60s
- **Atomic transactions**: All coin operations use database transactions with `balance_after` snapshots in the ledger
- **Request ID deduplication**: Token reports include Anthropic API `requestId` to prevent double-counting
- **sqlc**: Type-safe SQL queries generated from raw SQL. No ORM

## Economy Formula

```
weightedTokens = (input * 1.0) + (output * 3.0) + (cache_write * 1.25) + (cache_read * 0.1)
coins = floor(weightedTokens / 1000)
```

## Database (PostgreSQL)

Tables: `users`, `transactions` (append-only ledger), `shop_items`, `inventory`, `room_layouts`, `processed_requests` (deduplication).

Identity: `vscode.env.machineId` → `users.machine_id`. Session tokens via HMAC-SHA256.

## WebSocket Protocol

- **Client → Server**: `auth`, `agent:activity`, `agent:created/closed`, `subagent:created/closed`, `tokens:report`, `room:saveLayout`, `room:requestSnapshot`, `shop:purchase`
- **Server → Client**: `room:snapshot`, `remote:agentActivity`, `remote:agentCreated/Closed`, `remote:subagentCreated/Closed`, `economy:coinsUpdate`, `economy:purchaseResult`, `presence:joined/left`, `error`

## Build & Run

```sh
make build       # Compile binary
make dev         # Hot reload with air
make test        # Run tests
make migrate     # Run database migrations
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/tokentown?sslmode=disable` | PostgreSQL connection |
| `TOKEN_SIGNING_KEY` | `dev-signing-key-change-in-production` | HMAC key for sessions |

## CLAUDE.md Maintenance

**Update this file when changing**: API routes, WebSocket event types, database schema, economy formula, authentication flow, or Go module dependencies.
