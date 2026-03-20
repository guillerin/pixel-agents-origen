# PostgreSQL Service Configuration

## Overview

This directory contains PostgreSQL configuration and initialization scripts for the Token Town development environment.

## Directory Structure

```
postgres/
├── init.sql                    # Base schema initialization
├── backups/                    # Database backups (gitignored)
├── .gitkeep                    # Keep directory in git
└── README.md                   # This file
```

## Initialization Order

On container startup, scripts are executed in this order:

1. `01-init.sql` - Base schema (users, transactions, shop_items, inventory, agents)
2. `02-migrations/*.sql` - Database migrations (applied in filename order)
3. `03-seeds/*.sql` - Seed data (categories, products)

## Connection Details

- **Host**: localhost
- **Port**: 30001 (mapped from container's 5432)
- **Database**: tokentown
- **User**: postgres
- **Password**: postgres

**Connection String**:
```
postgres://postgres:postgres@localhost:30001/tokentown?sslmode=disable
```

## Common Commands

### Connect to Database
```bash
docker exec -it tokentown-postgres psql -U postgres -d tokentown
```

### Run SQL File
```bash
docker exec -i tokentown-postgres psql -U postgres -d tokentown < /path/to/file.sql
```

### Backup Database
```bash
docker exec tokentown-postgres pg_dump -U postgres tokentown > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
docker exec -i tokentown-postgres psql -U postgres tokentown < backup_file.sql
```

### Reset Database
```bash
# From monorepo root
yarn docker:reset
```

## Extensions

The database initializes with these PostgreSQL extensions:

- **pgcrypto** - For UUID generation and cryptographic functions

## Schema Version

Current schema version: **3.0** (Furniture Shop)

### Migration History

1. `001_initial.sql` - Base schema (users, transactions, shop, inventory)
2. `002_agents.sql` - Agents table for multiplayer
3. `003_furniture_shop.sql` - Furniture categories, assets, placed furniture

## Performance Notes

### Connection Pooling

- Max open connections: 25
- Max idle connections: 5

### Indexes

Key indexes for performance:
- `idx_transactions_user` - Transaction history queries
- `idx_inventory_user` - User inventory lookups
- `idx_agents_user` - Agent visibility queries
- `idx_placed_furniture_room` - Room furniture loading
- `idx_placed_furniture_position` - Spatial queries

## Backup Strategy

### Automated Backups (Recommended for Production)

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * docker exec tokentown-postgres pg_dump -U postgres tokentown > /backups/tokentown_$(date +\%Y\%m\%d).sql
```

### Retention Policy

- Keep daily backups for 7 days
- Keep weekly backups for 4 weeks
- Keep monthly backups for 12 months

## Monitoring

### Check Disk Usage
```bash
docker exec tokentown-postgres df -h /var/lib/postgresql/data
```

### Check Database Size
```bash
docker exec -it tokentown-postgres psql -U postgres -d tokentown -c "\l+"
```

### Check Table Sizes
```bash
docker exec -it tokentown-postgres psql -U postgres -d tokentown -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## Troubleshooting

### Database Locks
```bash
docker exec -it tokentown-postgres psql -U postgres -d tokentown -c "
SELECT
  pid,
  usename,
  pg_blocking_pids(pid) as blocked_by,
  query as blocked_query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
"
```

### Long-Running Queries
```bash
docker exec -it tokentown-postgres psql -U postgres -d tokentown -c "
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

## Security Notes

⚠️ **Development Configuration**

Current settings are for development only:
- `POSTGRES_HOST_AUTH_METHOD: trust` - No password checking
- Default credentials (postgres/postgres)

**Before deploying to production**, ensure:
1. Change default passwords
2. Enable SSL/TLS
3. Restrict network access
4. Enable proper authentication
5. Set up firewall rules
6. Enable audit logging
