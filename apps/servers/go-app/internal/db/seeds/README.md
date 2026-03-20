# Database Seed Files

This directory contains seed data for the Token Town furniture shop.

## Structure

Seed files are numbered in execution order:

- `001_categories.sql` - Furniture categories (desks, chairs, plants, etc.)
- `002_products_common.sql` - Common rarity items (40-200 coins)
- `003_products_uncommon.sql` - Uncommon rarity items (50-250 coins)
- `004_products_rare.sql` - Rare rarity items (180-600 coins)
- `005_products_legendary.sql` - Legendary rarity items (650-1200 coins, limited stock)

## Applying Seeds

### Development

Run seeds directly with psql:

```bash
# From infrastructure/dockers/development/
docker exec -i tokentown-postgres psql -U postgres -d tokentown < apps/servers/go-app/internal/db/seeds/001_categories.sql
docker exec -i tokentown-postgres psql -U postgres -d tokentown < apps/servers/go-app/internal/db/seeds/002_products_common.sql
# ... etc
```

Or apply all seeds at once:

```bash
cat apps/servers/go-app/internal/db/seeds/*.sql | docker exec -i tokentown-postgres psql -U postgres -d tokentown
```

### Production

Use the migration runner scripts in `infrastructure/scripts/`:

```bash
yarn workspace @token-town/go-app run seed
```

## Product Pricing Strategy

- **Common** (40-200 coins): Starter items, affordable for new users
- **Uncommon** (50-250 coins): Mid-range upgrades, require level 2-5
- **Rare** (180-600 coins): Premium items, require level 6-10
- **Legendary** (650-1200 coins): Exclusive limited items, require level 11-20

## Stock Management

Legendary items have `is_limited = true` with `max_stock` and `current_stock`.
When stock reaches 0, items become unavailable for purchase.

## Adding New Products

1. Choose appropriate rarity tier
2. Set price according to tier guidelines
3. Set `require_level` based on item quality
4. Add sprite and thumbnail assets to `/assets/sprites/furniture/` and `/assets/thumbnails/`
5. Insert into appropriate seed file maintaining existing sort order
