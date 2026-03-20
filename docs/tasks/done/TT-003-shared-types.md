---
id: TT-003
title: Add shared TypeScript types for furniture shop
status: done
priority: critical
phase: fase-1
assignee: shared-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by:
---

# Descripcion

Agregar todos los tipos TypeScript compartidos para el sistema de tienda de muebles en `packages/shared/src/index.ts`. Incluye interfaces, constantes de eventos y enums (as const).

Tipos a agregar segun design doc:
- FurnitureCategory, FurnitureProduct, FurnitureInventoryItem, FurniturePlacement
- ShopPurchaseRequest/Response, ShopCatalogQuery/Response
- ProductAnalytics, ShopAnalytics
- ShopClientEvent, ShopServerEvent, ShopEventType
- FurnitureRarity const
- Admin request types (CreateCategoryRequest, CreateProductRequest)

## Criterios de Aceptacion
- [ ] Todos los tipos del design doc exportados desde packages/shared
- [ ] Usar `as const` en lugar de enum (regla del proyecto)
- [ ] Tipos compilando correctamente con tsc
- [ ] Compatibles con los contratos de API definidos
- [ ] ShopClientEvent y ShopServerEvent con todos los eventos WS

## Estimacion
- Complejidad: M
- Tiempo estimado: 1h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a shared-dev. Fase 1 - bloquea React UI y Angular admin.

### 2026-03-19 - project-manager
> Verified complete. 20+ types/interfaces exported from packages/shared/src/index.ts.
