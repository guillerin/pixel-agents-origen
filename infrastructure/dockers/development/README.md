# Local Development Infrastructure

This directory contains the Docker Compose setup for local development of Token Town, including PostgreSQL database with furniture shop seed data.

## Overview

The local development environment includes:
- **PostgreSQL 16** - Database server on port `30001`
- **Redis 7** - Cache and pub/sub on port `30002`

## Quick Start

### 1. Start the services

```bash
# From monorepo root
yarn docker:up

# Or directly
cd infrastructure/dockers/development
docker-compose up -d
```

### 2. Verify services are running

```bash
# Check containers
docker ps

# Should show:
# - tokentown-postgres (port 30001)
# - tokentown-redis (port 30002)
```

### 3. Start the game server

```bash
# From monorepo root
yarn dev:server
```

The server will automatically connect to the local PostgreSQL and Redis instances.

## Database Setup

### Initial Setup

On first startup, PostgreSQL automatically runs:
1. **init.sql** - Creates database schema (tables, indexes, extensions)
2. **furniture_seeds.sql** - Populates shop with 27 furniture items across 6 categories

### Furniture Categories

The shop includes these categories:
- **Desks** (5 items) - From basic wooden desks to hacker battlestations
- **Chairs** (5 items) - From basic chairs to developer thrones
- **Plants** (5 items) - From succulents to ancient bonsai
- **Decorations** (6 items) - From framed prints to quantum computers
- **Lighting** (5 items) - From desk lamps to holographic projectors
- **Rugs** (5 items) - From basic rugs to RGB smart carpets

### Item Rarity

Items have four rarity levels affecting price:
- **Common** - Basic items (25-100 coins)
- **Uncommon** - Better quality (60-250 coins)
- **Rare** - Premium items (200-750 coins)
- **Legendary** - Unique items (1500-3000 coins)

## Migration Management

### Using Migration Scripts

```bash
# Linux/Mac
cd infrastructure/dockers/development/scripts
./migrate.sh up          # Run migrations
./migrate.sh status      # Check tables
./migrate.sh connect     # Open psql shell
./migrate.sh seed        # Insert seed data
./migrate.sh reset       # Reset database (destructive)

# Windows
cd infrastructure\dockers\development\scripts
migrate.bat up
migrate.bat status
migrate.bat connect
migrate.bat seed
migrate.bat reset
```

### Manual SQL Operations

```bash
# Connect to PostgreSQL
docker exec -it tokentown-postgres psql -U postgres -d tokentown

# Check shop items
SELECT id, name, category, price, rarity FROM shop_items ORDER BY category, price;

# View items by category
SELECT category, COUNT(*) as count, MIN(price) as min_price, MAX(price) as max_price
FROM shop_items GROUP BY category;

# Add custom item
INSERT INTO shop_items (id, name, category, price, rarity)
VALUES ('custom_item', 'My Custom Item', 'decorations', 999, 'legendary');
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with coins and authentication |
| `transactions` | Append-only ledger for coin transactions |
| `shop_items` | Furniture shop catalog |
| `inventory` | User-owned furniture items |
| `room_layouts` | Office room layouts |
| `agents` | Active AI agents per user |
| `processed_requests` | Deduplication for token reports |

### Shop Items Schema

```sql
CREATE TABLE shop_items (
    id              TEXT PRIMARY KEY,          -- Unique item ID
    name            TEXT NOT NULL,             -- Display name
    category        TEXT NOT NULL,             -- Category (desks, chairs, etc.)
    price           INTEGER NOT NULL,          -- Cost in coins
    rarity          TEXT NOT NULL,             -- common/uncommon/rare/legendary
    is_available    BOOLEAN NOT NULL,          -- Can be purchased
    max_per_user    INTEGER,                   -- Purchase limit per user
    created_at      TIMESTAMPTZ NOT NULL
);
```

## Common Workflows

### Adding New Furniture Items

1. **Create a new seed file** (optional):
```bash
# Create custom seeds
cat > services/postgres/custom_seeds.sql << EOF
INSERT INTO shop_items (id, name, category, price, rarity) VALUES
('item_1', 'Item Name', 'category', 100, 'common');
EOF
```

2. **Apply to database**:
```bash
docker exec -i tokentown-postgres psql -U postgres -d tokentown < services/postgres/custom_seeds.sql
```

### Resetting Database

```bash
# Option 1: Using migration script
./scripts/migrate.sh reset

# Option 2: Docker Compose (hard reset)
yarn docker:reset
# This deletes all data volumes and recreates the database
```

### Viewing Shop Data

```bash
# Connect to database
docker exec -it tokentown-postgres psql -U postgres -d tokentown

# Run queries
\t on  # Toggle output alignment
\x on  # Expanded display

SELECT * FROM shop_items WHERE category = 'desks';
SELECT * FROM shop_items WHERE rarity = 'legendary';
```

## Troubleshooting

### PostgreSQL not starting

```bash
# Check logs
docker logs tokentown-postgres

# Restart container
docker restart tokentown-postgres

# Rebuild (hard reset)
yarn docker:reset
```

### Connection refused errors

1. Verify services are running: `docker ps`
2. Check ports: `netstat -an | grep 30001`
3. Verify connection string in Go server config

### Seed data not appearing

```bash
# Check if seeds ran
docker exec -it tokentown-postgres psql -U postgres -d tokentown -c "SELECT COUNT(*) FROM shop_items;"

# Should return 27 for full furniture catalog

# If 0, manually run seeds
docker exec -i tokentown-postgres psql -U postgres -d tokentown < services/postgres/furniture_seeds.sql
```

## Environment Variables

The Go server uses these defaults for local development:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:30001/tokentown?sslmode=disable` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:30002` | Redis connection |
| `TOKEN_SIGNING_KEY` | `dev-signing-key-change-in-production` | Session token HMAC key |

## Production Deployment Notes

This is **LOCAL DEVELOPMENT INFRASTRUCTURE ONLY**. For production:

1. **Cloud Services**: Use managed PostgreSQL (AWS RDS, Azure Database, etc.)
2. **Migrations**: Use proper migration tool (golang-migrate, Flyway)
3. **Secrets**: Use secret management (AWS Secrets Manager, Azure Key Vault)
4. **Backups**: Implement automated database backups
5. **Monitoring**: Set up health checks and monitoring

**DO NOT** use docker-compose or these scripts for production deployment.

## Stopping Services

```bash
# Stop containers (keeps data)
yarn docker:down
# or
docker-compose down

# Stop and remove data (hard reset)
yarn docker:reset
# or
docker-compose down -v
```

## File Structure

```
infrastructure/dockers/development/
├── docker-compose.yml           # Main Docker Compose configuration
├── services/
│   ├── postgres/
│   │   ├── init.sql            # Database schema
│   │   └── furniture_seeds.sql # Furniture shop seed data
│   └── redis/
│       └── redis.conf          # Redis configuration
└── scripts/
    ├── migrate.sh              # Migration manager (Linux/Mac)
    └── migrate.bat             # Migration manager (Windows)
```

## Additional Resources

- [Go Server Documentation](../../../apps/servers/go-app/CLAUDE.md)
- [Monorepo Reference](../../../docs/project-summary.md)
- [Database Schema](../../../apps/servers/go-app/internal/db/schema.sql)
