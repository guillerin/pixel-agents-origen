# Game Server — Go Backend

Go 1.22+ WebSocket + REST server for Token Town. Handles real-time multiplayer, economy (token-to-coin conversion), shop, inventory, and room management.

## Current Architecture

```
cmd/server/
  main.go                    — Entry point: HTTP server + WS upgrade
internal/
  api/
    routes.go                — chi router setup, middleware chain
    ratelimit.go             — Per-user token bucket rate limiter
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

## Hexagonal Architecture Refactoring Plan

The current codebase has these architectural issues that should be addressed:

### Problems Identified

1. **No domain layer**: No proper entities, business logic scattered across handlers and services
2. **No repository pattern**: Handlers execute raw SQL directly via `*sql.DB`
3. **Service layer mixed with HTTP**: `api/` handlers contain business logic alongside request parsing
4. **WebSocket client is a god object**: `ws/client.go` handles parsing, validation, DB operations, and broadcasting
5. **Duplicate logic**: Token reporting implemented separately in REST and WebSocket paths
6. **Bug**: `economy/shop.go` — inventory insert is NOT in the same transaction as coin deduction (data integrity risk)

### Target Structure

```
internal/
  domain/                    — Pure business logic, no dependencies
    user.go                  — User entity
    agent.go                 — Agent entity, status FSM
    room.go                  — Room entity, layout
    economy.go               — Token→coin conversion, wallet rules
    shop.go                  — Purchase validation, pricing
    errors.go                — Domain errors (InsufficientBalance, ItemNotFound, etc.)

  ports/                     — Interfaces (dependency inversion boundaries)
    repositories.go          — UserRepository, TransactionRepository, ShopItemRepository,
                               InventoryRepository, AgentRepository, RoomRepository
    services.go              — CoinService, PurchaseService, RoomService (use case interfaces)
    events.go                — EventBus interface (outbound notifications)

  application/               — Use cases, orchestrate domain + ports
    coin_service.go          — ReportTokens use case
    purchase_service.go      — PurchaseItem use case (fixes transaction bug)
    room_service.go          — BuildSnapshot, SaveLayout use cases
    agent_service.go         — UpdateAgentStatus use case

  adapters/                  — Infrastructure implementations
    http/                    — REST handlers (thin, delegate to application layer)
      routes.go
      handlers/
    ws/                      — WebSocket hub + client (delegates to application layer)
      hub.go
      client.go
      events.go
    persistence/             — Repository implementations (PostgreSQL)
      user_repository.go
      transaction_repository.go
      shop_repository.go
      inventory_repository.go
      agent_repository.go
      room_repository.go
    auth/                    — Token generation/validation
      tokens.go
      middleware.go

  db/                        — Database connection + migrations (unchanged)
    db.go
    schema.sql
    migrations/
```

### Key Principles

- **Domain** has zero imports from other internal packages
- **Ports** define interfaces that adapters implement
- **Application** orchestrates domain logic through port interfaces
- **Adapters** are the only layer that imports external libraries (pgx, gorilla, chi)
- **main.go** wires everything together (dependency injection)

## Economy Formula

```
weightedTokens = (input * 1.0) + (output * 3.0) + (cache_write * 1.25) + (cache_read * 0.1)
coins = floor(weightedTokens / 1000)
```

## Database (PostgreSQL)

Tables: `users`, `transactions` (append-only ledger), `shop_items`, `inventory`, `room_layouts`, `agents`, `processed_requests` (deduplication).

Identity: `vscode.env.machineId` → `users.machine_id`. Session tokens via HMAC-SHA256.

## WebSocket Protocol

- **Client → Server**: `auth`, `agent:activity`, `agent:created/closed`, `subagent:created/closed`, `tokens:report`, `room:saveLayout`, `room:requestSnapshot`, `shop:purchase`
- **Server → Client**: `room:snapshot`, `remote:agentActivity`, `remote:agentCreated/Closed`, `remote:subagentCreated/Closed`, `economy:coinsUpdate`, `economy:purchaseResult`, `presence:joined/left`, `error`

## Build & Run

```sh
# Via yarn (from monorepo root):
yarn dev:server              # go run ./cmd/server
yarn build:server            # go build -o bin/server
yarn test:server             # go test ./...

# Via yarn workspace:
yarn workspace @token-town/go-app run dev
yarn workspace @token-town/go-app run build
yarn workspace @token-town/go-app run test
yarn workspace @token-town/go-app run lint
yarn workspace @token-town/go-app run tidy
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `30000` | HTTP server port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:30001/tokentown?sslmode=disable` | PostgreSQL connection |
| `TOKEN_SIGNING_KEY` | `dev-signing-key-change-in-production` | HMAC key for sessions |

## CLAUDE.md Maintenance

**Update this file when changing**: API routes, WebSocket event types, database schema, economy formula, authentication flow, Go module dependencies, or hexagonal layer boundaries.
