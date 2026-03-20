---
id: TT-001
title: Create DB migration 003_furniture_shop.sql
status: done
priority: critical
phase: fase-1
assignee: db-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by:
---

# Descripcion

Crear el archivo de migracion SQL `003_furniture_shop.sql` con todas las tablas del sistema de tienda de muebles, siguiendo el esquema definido en `docs/architecture/furniture-shop-design.md`.

Tablas a crear:
- `furniture_categories` - Categorias de muebles
- `furniture_products` - Productos/muebles con pricing, rarity, sprites
- `user_furniture_inventory` - Inventario de items por usuario
- `furniture_purchase_history` - Historial de compras
- `room_furniture_placements` - Posiciones de muebles en salas

## Criterios de Aceptacion
- [ ] Archivo de migracion creado en `apps/servers/go-app/db/migrations/`
- [ ] Todas las 5 tablas con constraints, checks e indices
- [ ] Triggers para updated_at automatico
- [ ] Migracion reversible (migrate:down incluido)
- [ ] Foreign keys a tablas existentes (users, transactions)
- [ ] Indices de performance segun el design doc

## Estimacion
- Complejidad: M
- Tiempo estimado: 1h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a db-dev. Fase 1 - prioridad critica, bloquea backend services.

### 2026-03-19 - project-manager
> Verified complete. Migration 003_furniture_shop.sql created with all 5 tables, indices, triggers, catalog view, and migrate:down.
