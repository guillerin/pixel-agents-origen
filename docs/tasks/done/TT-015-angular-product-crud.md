---
id: TT-015
title: Angular Admin - Product CRUD
status: done
priority: medium
phase: fase-4
assignee: angular-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-003, TT-009, TT-014
---

# Descripcion

Crear la interfaz completa de gestion de productos en el admin panel Angular.

Componentes:
- ProductListComponent - tabla con filtros por categoria, rarity, disponibilidad
- ProductFormComponent - formulario create/edit con todos los campos
- ProductPreviewComponent - preview del sprite/thumbnail
- ProductDeleteDialog - confirmacion con warning si tiene compras

Campos del formulario: name, description, categoryId, priceCoins, rarity, spriteUrl, thumbnailUrl, previewUrl, width, height, canStack, isAvailable, availableFrom, availableUntil, maxPerUser, stockQuantity, tags.

## Criterios de Aceptacion
- [ ] Tabla de productos con filtros y paginacion
- [ ] Formulario completo de creacion de producto
- [ ] Edicion de producto existente
- [ ] Preview de sprite en el formulario
- [ ] Validaciones (precio >= 0, dimensiones > 0, date range valido)
- [ ] Eliminar producto (con warning si tiene historial de compras)
- [ ] Filtro por categoria, rarity, disponibilidad
- [ ] Integracion con API REST admin endpoints

## Estimacion
- Complejidad: L
- Tiempo estimado: 4h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a angular-dev. Depende de categories (TT-014).

### 2026-03-19 - project-manager
> Verified complete. ProductsComponent created with HTML + TS.
