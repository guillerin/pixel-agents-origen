---
id: TT-006
title: Implement PurchaseService (Go)
status: done
priority: high
phase: fase-2
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-001
---

# Descripcion

Implementar el servicio de compras transaccional en Go. Toda la operacion de compra debe ejecutarse en una sola transaccion DB (ADR-001).

Flujo de compra:
1. Validar producto existe y esta disponible
2. Verificar balance del usuario (WalletService)
3. Verificar max_per_user limit
4. BEGIN TRANSACTION
   - Lock user row (SELECT FOR UPDATE)
   - Deducir coins
   - Insert transaction record
   - Insert/update inventory
   - Insert purchase_history
5. COMMIT
6. Broadcast via WebSocket

## Criterios de Aceptacion
- [ ] PurchaseService.Purchase() transaccional
- [ ] Validaciones de balance, stock, max_per_user
- [ ] SELECT FOR UPDATE para prevenir race conditions
- [ ] HTTP handler POST /api/shop/products/:id/purchase
- [ ] WebSocket handler para shop:purchase
- [ ] Broadcast de purchase result, inventory update y balance update
- [ ] Tests unitarios con escenarios de error

## Estimacion
- Complejidad: XL
- Tiempo estimado: 4h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a go-dev. Servicio critico - requiere atomicidad total.

### 2026-03-19 - project-manager
> Verified complete. shop/purchase.go (179 lines) with transactional purchase flow.
