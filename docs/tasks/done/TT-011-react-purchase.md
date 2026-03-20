---
id: TT-011
title: React Shop UI - Purchase flow
status: done
priority: high
phase: fase-3
assignee: react-dev
created: 2026-03-19
updated: 2026-03-20
blocked_by: TT-003, TT-010
---

# Descripcion

Implementar el flujo completo de compra en la UI React del webview.

Componentes:
- PurchaseModal - confirmacion de compra con detalle del item
- PurchaseButton - boton de compra con estado (loading, disabled si no hay balance)
- BalanceDisplay - mostrar balance actual de coins
- PurchaseResult - feedback de exito/error post-compra
- TransactionToast - notificacion temporal de compra exitosa

## Criterios de Aceptacion
- [ ] Modal de confirmacion antes de comprar
- [ ] Muestra precio, balance actual y balance despues de compra
- [ ] Deshabilitar compra si balance insuficiente
- [ ] Feedback visual de compra exitosa
- [ ] Manejo de errores (stock agotado, max per user, etc.)
- [ ] Integracion con WebSocket shop:purchase y shop:purchaseResult
- [ ] Actualizacion reactiva del balance tras compra

## Estimacion
- Complejidad: M
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a react-dev. Depende del catalogo (TT-010).

### 2026-03-20 - project-manager
> Verified complete. PurchaseConfirmation, CartSidebar, ShopModal components created. QA fixes applied.
