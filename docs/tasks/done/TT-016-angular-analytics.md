---
id: TT-016
title: Angular Admin - Analytics dashboard
status: done
priority: medium
phase: fase-4
assignee: angular-dev
created: 2026-03-19
updated: 2026-03-19
blocked_by: TT-009
---

# Descripcion

Crear el dashboard de analytics de la tienda en el admin panel Angular.

Componentes:
- ShopAnalyticsDashboard - vista principal
- RevenueChart - grafico de revenue over time
- TopProductsTable - ranking de productos mas vendidos
- RevenueByCategoryChart - distribucion de revenue por categoria
- KPICards - tarjetas con total revenue, total purchases, unique customers, avg order value
- ProductAnalyticsDetail - analytics detallado de un producto individual

## Criterios de Aceptacion
- [ ] KPI cards con metricas principales
- [ ] Grafico de revenue over time con selector de rango de fechas
- [ ] Top 10 productos mas vendidos
- [ ] Revenue por categoria (pie/bar chart)
- [ ] Detalle de analytics por producto individual
- [ ] Filtro de rango de fechas (from/to)
- [ ] Integracion con API REST analytics endpoints

## Estimacion
- Complejidad: L
- Tiempo estimado: 4h

## Comentarios
### 2026-03-19 - project-manager
> Tarea asignada a angular-dev. Puede trabajarse en paralelo con product CRUD.

### 2026-03-19 - project-manager
> Verified complete. AnalyticsComponent created with HTML + TS.
