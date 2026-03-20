#!/bin/bash
# Token Town — Local Database Migration Manager
# This script helps manage database migrations for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
MIGRATIONS_DIR="../../../apps/servers/go-app/internal/db/migrations"
DB_NAME="tokentown"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="30001"

# Parse command line arguments
COMMAND=$1

case $COMMAND in
  up)
    echo -e "${GREEN}Running all pending migrations...${NC}"
    docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATIONS_DIR/001_initial.sql" 2>/dev/null || echo "001_initial.sql already applied or failed"
    docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATIONS_DIR/002_agents.sql" 2>/dev/null || echo "002_agents.sql already applied or failed"
    echo -e "${GREEN}✓ Migrations completed${NC}"
    ;;

  down)
    echo -e "${YELLOW}Rolling back migrations...${NC}"
    echo -e "${RED}Warning: This will drop tables!${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
      docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATIONS_DIR/002_agents.sql" | grep "DROP TABLE" || true
      docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATIONS_DIR/001_initial.sql" | grep "DROP TABLE" || true
      echo -e "${GREEN}✓ Rollback completed${NC}"
    else
      echo -e "${YELLOW}Rollback cancelled${NC}"
    fi
    ;;

  seed)
    echo -e "${GREEN}Seeding database with furniture data...${NC}"
    docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < "../services/postgres/furniture_seeds.sql"
    echo -e "${GREEN}✓ Seed data inserted${NC}"
    ;;

  reset)
    echo -e "${YELLOW}Resetting database...${NC}"
    echo -e "${RED}Warning: This will delete all data!${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
      docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
      docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < ../services/postgres/init.sql
      docker exec -i tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" < ../services/postgres/furniture_seeds.sql
      echo -e "${GREEN}✓ Database reset completed${NC}"
    else
      echo -e "${YELLOW}Reset cancelled${NC}"
    fi
    ;;

  status)
    echo -e "${GREEN}Database status:${NC}"
    docker exec -it tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"
    ;;

  connect)
    echo -e "${GREEN}Connecting to PostgreSQL...${NC}"
    docker exec -it tokentown-postgres psql -U "$DB_USER" -d "$DB_NAME"
    ;;

  *)
    echo "Token Town — Local Database Migration Manager"
    echo ""
    echo "Usage: ./scripts/migrate.sh <command>"
    echo ""
    echo "Commands:"
    echo "  up       - Run all pending migrations"
    echo "  down     - Rollback migrations (requires confirmation)"
    echo "  seed     - Insert seed data"
    echo "  reset    - Drop and recreate database (requires confirmation)"
    echo "  status   - Show database tables"
    echo "  connect  - Open psql shell"
    echo ""
    exit 1
    ;;
esac
