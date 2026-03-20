---
id: TT-013
title: React Shop UI - WebSocket event integration
status: done
priority: high
phase: fase-3
assignee: react-dev
created: 2026-03-19
updated: 2026-03-20
blocked_by: TT-003, TT-010
---

# Descripcion

Integrar todos los eventos WebSocket de la tienda con el estado React del webview. Los mensajes pasan por postMessage (Webview <-> Extension <-> WS Server).

Eventos a manejar:
- shop:catalog (recibir catalogo)
- shop:inventory (recibir inventario)
- shop:purchaseResult (resultado de compra)
- shop:placements (placements actuales)
- shop:placementsUpdated (confirmacion de update)
- shop:balanceUpdate (cambio de balance broadcast)
- shop:error (errores)

## Criterios de Aceptacion
- [ ] Hook useShopWebSocket o similar para centralizar manejo de eventos
- [ ] Estado global de la tienda (catalogo, inventario, balance) sincronizado
- [ ] Manejo de errores de WS mostrado en UI
- [ ] Reconexion automatica refresca datos de tienda
- [ ] Optimistic updates donde tenga sentido

## Estimacion
- Complejidad: L
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a react-dev. Pieza central de integracion frontend-backend.

### 2026-03-20 - project-manager
> Verified complete. useShop, useShopState, useInventory hooks with WS integration. QA fixes applied.
