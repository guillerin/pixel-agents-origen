---
id: TT-012
title: React Shop UI - Inventory display
status: done
priority: medium
phase: fase-3
assignee: react-dev
created: 2026-03-19
updated: 2026-03-20
blocked_by: TT-003
---

# Descripcion

Crear componentes React para mostrar el inventario del usuario y su historial de compras.

Componentes:
- InventoryPanel - lista de items owned
- InventoryItem - item con cantidad, valor, sprite
- PurchaseHistory - tabla de historial de compras
- InventoryStats - resumen (total items, valor total)

## Criterios de Aceptacion
- [ ] Lista de items del inventario con cantidades
- [ ] Filtro por categoria y busqueda
- [ ] Valor total del inventario mostrado
- [ ] Historial de compras con fecha, item, coins gastados
- [ ] Integracion con WebSocket shop:getInventory
- [ ] Actualizacion en tiempo real tras compras

## Estimacion
- Complejidad: M
- Tiempo estimado: 2h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a react-dev.

### 2026-03-20 - project-manager
> Verified complete. InventoryView component and useInventory hook created. QA fixes applied.
