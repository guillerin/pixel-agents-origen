---
id: TT-018
title: Collision detection UI for furniture placement
status: backlog
priority: low
phase: fase-5
assignee: react-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-017
---

# Descripcion

Implementar deteccion de colisiones visual en el editor de placement. Cuando el usuario arrastra un mueble, mostrar feedback visual si la posicion colisiona con otros muebles (respetando canStack).

## Criterios de Aceptacion
- [ ] Deteccion de overlap basada en width/height de productos
- [ ] Visual feedback rojo/verde durante drag
- [ ] Permitir stacking si canStack = true
- [ ] Snap-to-grid para posicionamiento preciso
- [ ] Validacion client-side antes de enviar al servidor

## Estimacion
- Complejidad: L
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Fase 5 - polish. Depende del editor de placement.
