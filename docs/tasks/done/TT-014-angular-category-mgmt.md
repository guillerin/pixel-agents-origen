---
id: TT-014
title: Angular Admin - Category management
status: done
priority: medium
phase: fase-4
assignee: angular-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-003, TT-009
---

# Descripcion

Crear la interfaz de gestion de categorias en el admin panel Angular. CRUD completo con tabla, formularios y confirmacion de borrado.

Componentes:
- CategoryListComponent - tabla con sort/filter
- CategoryFormComponent - formulario create/edit
- CategoryDeleteDialog - confirmacion de borrado

## Criterios de Aceptacion
- [ ] Listar categorias con sort_order, nombre, estado
- [ ] Crear nueva categoria con nombre, display_name, description, icon
- [ ] Editar categoria existente
- [ ] Eliminar categoria (con confirmacion)
- [ ] Reordenar categorias (drag & drop o sort_order manual)
- [ ] Toggle is_active
- [ ] Validaciones de formulario
- [ ] Integracion con API REST admin endpoints

## Estimacion
- Complejidad: M
- Tiempo estimado: 3h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a angular-dev. Depende de shared types y admin API.

### 2026-03-19 - project-manager
> Verified complete. CategoriesComponent created with HTML + TS.
