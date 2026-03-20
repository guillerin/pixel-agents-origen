# Admin Panel — Angular Dashboard

Angular 19+ standalone application for Token Town administration. Requires Microsoft SSO (MSAL) authentication with `role = 'admin'` in the database.

## Architecture

```
src/
  app/
    core/
      auth/
        auth.guard.ts          — Route guard, checks admin role
        auth.service.ts        — MSAL authentication, current user state
        msal.config.ts         — Azure AD client/tenant configuration
      interceptors/
        auth.interceptor.ts    — Attaches Bearer token to API requests
      services/
        admin-api.service.ts        — HTTP client for general admin endpoints
        shop-admin-api.service.ts   — HTTP client for furniture shop admin endpoints
    features/
      dashboard/               — Stats overview (users, coins, tokens)
      leaderboard/             — Top earners ranking
      login/                   — Microsoft SSO login page
      shop/                    — Legacy shop item management
      shop-admin/
        categories/            — Furniture category CRUD (list, create, edit, delete)
        products/              — Furniture product CRUD with filters and image upload
        analytics/             — Shop analytics dashboard (revenue, top products, trends)
      users/                   — User list with coin adjustment
    shared/
      components/
        navbar/                — Top navigation bar with user info
        data-table/            — Reusable paginated/sortable table component
      directives/
        click-outside/         — Click-outside directive for dropdowns/modals
      models/
        api.models.ts          — General API response interfaces
        shop.models.ts         — Furniture shop interfaces (FurnitureProduct, ProductCategory, SalesAnalytics, etc.)
  environments/                — Environment-specific API URLs
```

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/dashboard` | DashboardComponent | authGuard |
| `/users` | UsersListComponent | authGuard |
| `/shop` | ShopItemsComponent | authGuard |
| `/shop-admin/categories` | CategoriesComponent | authGuard |
| `/shop-admin/products` | ProductsComponent | authGuard |
| `/shop-admin/analytics` | AnalyticsComponent | authGuard |
| `/leaderboard` | LeaderboardComponent | authGuard |
| `/login` | LoginComponent | — |

## Key Patterns

- **Standalone components**: No NgModules. All components use `standalone: true` with direct imports
- **Signals**: Use Angular signals (`signal()`, `computed()`) for reactive state; internal component state uses `signal()`, not `input()`
- **Lazy loading**: Feature routes are lazy-loaded via `loadComponent` in `app.routes.ts`
- **Inject function**: Use `inject()` instead of constructor injection

## API Integration

`AdminApiService` — general game-server admin endpoints:
- `GET /api/admin/stats` — Dashboard statistics
- `GET /api/admin/users` — User management
- `POST /api/admin/users/:id/adjust-coins` — Manual coin adjustment
- `GET/POST/PUT/DELETE /api/admin/shop/items` — Legacy shop catalog CRUD
- `GET /api/leaderboard` — Leaderboard data

`ShopAdminApiService` — furniture shop admin endpoints:
- `GET/POST /api/admin/shop/categories` — Category list/create
- `PUT/DELETE /api/admin/shop/categories/:id` — Category update/delete
- `GET/POST /api/admin/shop/products` — Product list/create (paginated, filterable)
- `PUT/DELETE /api/admin/shop/products/:id` — Product update/delete
- `GET /api/admin/shop/analytics?period=7d|30d|90d|1y` — Shop analytics
- `GET /api/admin/shop/inventory` — Inventory overview
- `GET /api/admin/shop/transactions` — Purchase transaction history

## Build

```sh
yarn workspace @token-town/angular-app run build   # Production build
yarn workspace @token-town/angular-app run dev     # Dev server (ng serve)
```

## CLAUDE.md Maintenance

**Update this file when changing**: route structure, authentication flow, API endpoints consumed, shared component contracts, or Angular version/patterns used.
