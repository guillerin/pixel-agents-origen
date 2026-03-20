---
id: TT-009
title: Implement Admin API endpoints (Go)
status: done
priority: medium
phase: fase-2
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-001
---

# Descripcion

Implementar los endpoints REST de administracion para gestion de categorias, productos y analytics.

Endpoints:
- POST/PUT/DELETE /api/admin/shop/categories
- POST/PUT/DELETE /api/admin/shop/products
- GET /api/admin/shop/products/:id/analytics
- GET /api/admin/shop/analytics (con filtro de fechas)

Todos requieren rol admin.

## Criterios de Aceptacion
- [ ] CRUD completo de categorias
- [ ] CRUD completo de productos
- [ ] Analytics por producto (ventas, revenue, unique buyers)
- [ ] Analytics globales de la tienda (revenue by category, top products, over time)
- [ ] Middleware de admin role verificado
- [ ] Tests unitarios

## Estimacion
- Complejidad: L
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a go-dev. Necesario para que Angular admin panel funcione.

### 2026-03-19 - project-manager
> Verified complete. api/furniture_shop.go (302 lines) with full admin HTTP handlers.
