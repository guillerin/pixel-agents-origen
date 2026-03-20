---
id: TT-002
title: Create seed data for furniture catalog
status: done
priority: high
phase: fase-1
assignee: db-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-001
---

# Descripcion

Crear datos de seed para el catalogo inicial de muebles. Incluir categorias base y productos de ejemplo con distintas rarezas y precios.

Categorias sugeridas: desks, chairs, shelves, decorations, plants, lighting, rugs, wall-art.

Productos: al menos 3-5 items por categoria con variedad de rarezas (common 10-50 coins, uncommon 50-200, rare 200-1000, legendary 1000+).

## Criterios de Aceptacion
- [ ] Seed SQL o script que inserte categorias y productos
- [ ] Al menos 8 categorias
- [ ] Al menos 25 productos totales
- [ ] Distribucion de rarezas: ~50% common, ~30% uncommon, ~15% rare, ~5% legendary
- [ ] Precios coherentes con el sistema de rarity
- [ ] Sprite URLs con paths validos (pueden ser placeholder)

## Estimacion
- Complejidad: M
- Tiempo estimado: 1h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a db-dev junto con TT-001. Depende de que la migracion este lista.

### 2026-03-19 - project-manager
> Verified complete. 5 seed SQL files created (categories + products by rarity) plus README.
