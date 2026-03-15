# Token Town Admin Panel

Angular 19 SPA for administering the Token Town office game. Provides views for user management, shop catalog, leaderboard, and global stats.

## Requirements

- Node.js 18+
- An Azure AD app registration (for Microsoft SSO)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Azure AD credentials in `src/environments/environment.ts`:
   ```typescript
   msalConfig: {
     auth: {
       clientId: '<your-azure-app-client-id>',
       authority: 'https://login.microsoftonline.com/<your-tenant-id>',
       redirectUri: 'http://localhost:4200',
     }
   }
   ```

3. Start the dev server:
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:4200`.

## Build

```bash
npm run build
```
Output goes to `dist/admin-panel/`.

## Project structure

```
src/app/
  core/
    auth/          - MSAL auth service, guard, config
    services/      - AdminApiService (HTTP calls to backend)
    interceptors/  - Bearer token injection
  features/
    dashboard/     - Global stats overview
    users/         - User list with coin adjustment
    shop/          - Shop item catalog management
    leaderboard/   - Top earners table
    login/         - Microsoft SSO login page
  shared/
    components/    - Navbar
    models/        - Shared TypeScript interfaces
```

## Authentication

Uses `@azure/msal-angular` with popup flow. All routes except `/login` are protected by `authGuard`. The `authInterceptor` automatically attaches Bearer tokens to API requests.
