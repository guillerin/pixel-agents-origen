---
id: TT-010
title: React Shop UI - Catalog and product browsing
status: done
priority: high
phase: fase-3
assignee: react-dev
created: 2026-03-19
updated: 2026-03-20
blocked_by: TT-003
---

# Descripcion

Crear los componentes React para navegar el catalogo de la tienda en el webview del juego.

Componentes:
- ShopModal/ShopPanel - contenedor principal de la tienda
- CategoryList - lista de categorias con iconos
- ProductGrid - grid de productos filtrable
- ProductCard - tarjeta individual con sprite, nombre, precio, rarity badge
- RarityBadge - indicador visual de rareza (common/uncommon/rare/legendary)
- PriceTag - display de precio en coins
- SearchBar - busqueda por nombre/descripcion
- Filters - filtros de categoria, rarity, precio

## Criterios de Aceptacion
- [ ] Navegacion por categorias funcional
- [ ] Grid de productos con thumbnails/sprites
- [ ] Filtros de busqueda, rarity y rango de precios
- [ ] Ordenamiento (precio, nombre, rarity, newest)
- [ ] Indicadores visuales de rarity (colores/badges)
- [ ] Paginacion o infinite scroll
- [ ] Integracion con WebSocket shop:getCatalog
- [ ] Responsive dentro del webview

## Estimacion
- Complejidad: L
- Tiempo estimado: 4h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a react-dev. Depende de shared types (TT-003).

### 2026-03-20 - project-manager
> Verified complete. CatalogView, ProductCard, ProductGrid, CategoryFilter, CoinCounter components created. QA fixes applied.
