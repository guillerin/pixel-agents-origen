# Token Town Game Server

WebSocket + REST server for Token Town, a multiplayer office game built on top of Claude Code usage.

## Requirements

- Go 1.22+
- PostgreSQL 15+

## Quick Start

```bash
# Start dev infrastructure (PostgreSQL + Redis)
yarn docker:up

# Start the server
yarn dev:server
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `30000` | HTTP server port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:30001/tokentown?sslmode=disable` | PostgreSQL connection string |
| `TOKEN_SIGNING_KEY` | `dev-signing-key-change-in-production` | HMAC key for session tokens |

## API Endpoints

### Public
- `POST /api/auth/register` — Register/login via machineId

### Authenticated
- `GET /api/auth/me` — Current user profile
- `POST /api/economy/report-tokens` — Report token usage, earn coins
- `GET /api/economy/balance` — Get coin balance
- `GET /api/shop/catalog` — Browse shop items
- `POST /api/shop/purchase` — Buy an item
- `GET /api/inventory` — View owned items
- `GET /api/leaderboard` — Top earners
- `GET /api/rooms/{userId}` — Get room layout
- `PUT /api/rooms/me` — Save room layout

### Admin
- `GET /api/admin/users` — List users
- `POST /api/admin/users/{userId}/adjust-coins` — Adjust balance
- `GET/POST/PUT/DELETE /api/admin/shop/items` — Manage shop catalog
- `GET /api/admin/stats` — Server statistics

### WebSocket
- `GET /ws` — WebSocket connection for real-time events
