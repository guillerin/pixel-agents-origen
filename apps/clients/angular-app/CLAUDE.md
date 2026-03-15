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
        admin-api.service.ts   — HTTP client for game-server admin endpoints
    features/
      dashboard/               — Stats overview (users, coins, tokens)
      leaderboard/             — Top earners ranking
      login/                   — Microsoft SSO login page
      shop/                    — Shop item management (prices, availability, rarity)
      users/                   — User list with coin adjustment
    shared/
      components/navbar/       — Top navigation bar with user info
      models/api.models.ts     — TypeScript interfaces for API responses
  environments/                — Environment-specific API URLs
```

## Key Patterns

- **Standalone components**: No NgModules. All components use `standalone: true` with direct imports
- **Signals**: Use Angular signals (`signal()`, `computed()`) for reactive state
- **Lazy loading**: Feature routes are lazy-loaded via `loadComponent` in `app.routes.ts`
- **Inject function**: Use `inject()` instead of constructor injection

## API Integration

All API calls go through `AdminApiService` which targets the game-server REST endpoints:
- `GET /api/admin/stats` — Dashboard statistics
- `GET /api/admin/users` — User management
- `POST /api/admin/users/:id/adjust-coins` — Manual coin adjustment
- `GET/POST/PUT/DELETE /api/admin/shop/items` — Shop catalog CRUD
- `GET /api/leaderboard` — Leaderboard data

## Build

```sh
yarn workspace @token-town/angular-app run build   # Production build
yarn workspace @token-town/angular-app run dev     # Dev server (ng serve)
```

## CLAUDE.md Maintenance

**Update this file when changing**: route structure, authentication flow, API endpoints consumed, shared component contracts, or Angular version/patterns used.
