---
id: TT-005
title: Implement CatalogService (Go)
status: done
priority: high
phase: fase-2
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-001
---

# Descripcion

Implementar el servicio de catalogo en Go con soporte para filtrado, ordenamiento y paginacion de productos.

Funcionalidades:
- Listar categorias activas
- Listar productos con filtros (categoria, rarity, precio min/max, search)
- Ordenamiento (price_asc, price_desc, name, rarity, newest)
- Paginacion (limit/offset)
- Detalle de producto con categoria y cantidad owned

## Criterios de Aceptacion
- [ ] CatalogService con metodos GetCategories, GetProducts, GetProductDetail
- [ ] Filtros de busqueda funcionales
- [ ] Paginacion con total count
- [ ] HTTP handlers GET /api/shop/categories y GET /api/shop/products
- [ ] WebSocket handler para shop:getCatalog
- [ ] Tests unitarios

## Estimacion
- Complejidad: L
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a go-dev. Depende de la migracion DB.

### 2026-03-19 - project-manager
> Verified complete. shop/catalog.go (283 lines) + SQLC queries in queries/shop.sql.
