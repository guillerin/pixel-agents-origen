---
id: TT-007
title: Implement InventoryService (Go)
status: done
priority: high
phase: fase-2
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-001
---

# Descripcion

Implementar servicio de inventario en Go para consultar los items que posee un usuario.

Funcionalidades:
- Obtener inventario completo del usuario
- Filtrar por categoria o busqueda
- Calcular valor total del inventario
- Historial de compras con paginacion

## Criterios de Aceptacion
- [ ] InventoryService con metodos GetInventory, GetPurchaseHistory
- [ ] HTTP handlers GET /api/shop/inventory y GET /api/shop/purchase-history
- [ ] WebSocket handler para shop:getInventory
- [ ] Respuesta incluye totalValue calculado
- [ ] Tests unitarios

## Estimacion
- Complejidad: M
- Tiempo estimado: 2h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a go-dev. Parte del bloque de backend services.

### 2026-03-19 - project-manager
> Verified complete. shop/inventory.go (150 lines).
