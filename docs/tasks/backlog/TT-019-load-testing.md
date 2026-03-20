---
id: TT-019
title: Load testing for concurrent purchases
status: backlog
priority: low
phase: fase-5
assignee: go-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-006
---

# Descripcion

Crear tests de carga para validar que el sistema de compras maneja correctamente la concurrencia alta. Verificar que SELECT FOR UPDATE previene race conditions.

Escenarios:
- 100 compras simultaneas del mismo usuario
- 100 usuarios comprando el mismo item con stock limitado
- Compras concurrentes con balance justo al limite

## Criterios de Aceptacion
- [ ] Script de load test (Go test o k6)
- [ ] No hay race conditions en balance
- [ ] Stock no baja a negativos
- [ ] Todas las transacciones son atomicas
- [ ] Resultados documentados

## Estimacion
- Complejidad: M
- Tiempo estimado: 2h

## Comentarios
### 2026-03-19 - project-manager
> Fase 5 - quality assurance. Critico antes de produccion.
