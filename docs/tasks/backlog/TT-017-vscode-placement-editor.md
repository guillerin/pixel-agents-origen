---
id: TT-017
title: VS Code Extension - Furniture placement editor
status: backlog
priority: low
phase: fase-5
assignee: react-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-008, TT-010, TT-013
---

# Descripcion

Actualizar el webview de la extension VS Code para permitir drag & drop de muebles del inventario a la sala. Mostrar los muebles colocados en el canvas del juego.

Funcionalidades:
- Mostrar muebles colocados en el canvas (sprites en posiciones correctas)
- Drag & drop desde inventario a sala
- Rotacion de muebles (0, 90, 180, 270)
- Indicador visual de posicion valida/invalida
- Guardar cambios via WebSocket shop:updatePlacements
- Eliminar placement

## Criterios de Aceptacion
- [ ] Renderizado de muebles colocados en el canvas
- [ ] Drag & drop funcional
- [ ] Rotacion con click derecho o boton
- [ ] Visual feedback de posicion valida
- [ ] Guardado automatico (debounce 2s)
- [ ] Broadcast a otros usuarios en la sala

## Estimacion
- Complejidad: XL
- Tiempo estimado: 6h

## Comentarios
### 2026-03-19 - project-manager
> Fase 5 - integracion. Requiere backend de placements y React UI base completos.
