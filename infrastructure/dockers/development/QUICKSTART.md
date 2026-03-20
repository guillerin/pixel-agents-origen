# Local Development Quick Start

Get the Token Town furniture shop running locally in 5 minutes.

## Prerequisites

- Docker Desktop installed and running
- Yarn package manager
- Go 1.22+ (for game server)

## 1. Start Services (30 seconds)

```bash
yarn docker:up
```

This starts PostgreSQL on port 30001 and Redis on port 30002.

**Verify**: Run `docker ps` - you should see `tokentown-postgres` and `tokentown-redis`.

## 2. Start Game Server (10 seconds)

```bash
yarn dev:server
```

The server will:
- Connect to local PostgreSQL
- Automatically apply migrations
- Seed furniture shop data
- Start listening on port 30000

**Verify**: You should see `Server listening on :30000` in the output.

## 3. Test the Shop (1 minute)

Connect to the database and verify seed data:

```bash
# Option A: Use the convenience script
yarn db:status

# Option B: Direct psql
docker exec -it tokentown-postgres psql -U postgres -d tokentown -c "SELECT COUNT(*) FROM shop_items;"
```

**Expected output**: `27` (total furniture items)

## 4. View Shop Data

```bash
yarn db:connect
```

Then run:
```sql
-- View all items
SELECT id, name, category, price, rarity FROM shop_items ORDER BY category, price;

-- View by category
SELECT category, COUNT(*) as items FROM shop_items GROUP BY category;

-- View legendary items
SELECT * FROM shop_items WHERE rarity = 'legendary';
```

## Common Commands

```bash
# Start services
yarn docker:up

# Stop services
yarn docker:down

# View logs
yarn docker:logs

# Reset database (hard reset)
yarn db:reset

# Check database status
yarn db:status

# Open SQL shell
yarn db:connect
```

## Furniture Shop Categories

- **Desks** - 5 items (100-2000 coins)
- **Chairs** - 5 items (80-1500 coins)
- **Plants** - 5 items (25-500 coins)
- **Decorations** - 6 items (30-3000 coins)
- **Lighting** - 5 items (35-2500 coins)
- **Rugs** - 5 items (60-1800 coins)

## Troubleshooting

**Problem**: `docker: up` fails
```bash
# Check Docker Desktop is running
docker ps

# Restart Docker Desktop if needed
```

**Problem**: Can't connect to database
```bash
# Verify container is running
docker ps | grep tokentown-postgres

# Check logs
docker logs tokentown-postgres
```

**Problem**: Shop items not showing
```bash
# Re-seed database
yarn db:seed

# Or hard reset
yarn db:reset
```

## Next Steps

- [Read full documentation](./README.md)
- [Game server docs](../../../apps/servers/go-app/CLAUDE.md)
- [Monorepo reference](../../../docs/project-summary.md)

## Remember

This is **local development only**. Production deployment uses separate infrastructure.
