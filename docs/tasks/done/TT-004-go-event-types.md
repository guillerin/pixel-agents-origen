---
id: TT-004
title: Add Go event types and WebSocket handlers for shop
status: done
priority: critical
phase: fase-2
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by:
---

# Descripcion

Agregar los tipos de eventos Go para WebSocket y las estructuras de payload en `internal/ws/events.go`. Registrar los nuevos event handlers en el WebSocket hub.

Structs a crear:
- ShopGetCatalogPayload, ShopCatalogPayload, ShopProductItem
- ShopPurchasePayload, ShopPurchaseResultPayload
- ShopInventoryPayload, ShopInventoryItem
- ShopGetPlacementsPayload, ShopPlacementsPayload, ShopPlacementItem
- ShopUpdatePlacementsPayload, PlacementUpdate
- ShopPlacementsUpdatedPayload, PlacementError
- ShopBalanceUpdatePayload

## Criterios de Aceptacion
- [ ] Structs Go con tags JSON correctos
- [ ] Event constants registrados (shop:getCatalog, shop:purchase, etc.)
- [ ] Handlers conectados al WebSocket hub
- [ ] Compilacion exitosa

## Estimacion
- Complejidad: M
- Tiempo estimado: 1.5h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a go-dev. Parte de Fase 2 backend services.

### 2026-03-19 - project-manager
> Verified complete. Client and server WS event constants added to events.go. Payload structs in shop/types.go.
