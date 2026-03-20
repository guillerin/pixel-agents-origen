---
id: TT-008
title: Implement PlacementService (Go)
status: done
priority: high
phase: fase-2
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-001
---

# Descripcion

Implementar servicio de colocacion de muebles en Go. Maneja las posiciones de muebles en las salas de los usuarios.

Funcionalidades:
- Obtener placements de una sala
- Actualizar placements en batch
- Eliminar placement individual
- Validar posiciones dentro de los limites de la sala
- Detectar colisiones (si canStack = false)
- Verificar que el usuario posee el item

## Criterios de Aceptacion
- [ ] PlacementService con metodos GetPlacements, UpdatePlacements, RemovePlacement
- [ ] HTTP handlers GET/PUT /api/shop/placements y DELETE /api/shop/placements/:id
- [ ] WebSocket handlers para shop:getPlacements, shop:updatePlacements, shop:removePlacement
- [ ] Validacion de ownership del inventory item
- [ ] Broadcast de room:layoutUpdate al actualizar
- [ ] Tests unitarios

## Estimacion
- Complejidad: L
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a go-dev. Incluye logica de validacion de posiciones.

### 2026-03-19 - project-manager
> Verified complete. shop/placement.go (227 lines) with room placement CRUD.
