# Token Town — Monorepo Reference

Multiplayer pixel art office game built on top of AI coding assistant usage. Users earn coins from token consumption and spend them in a virtual furniture shop.

## Architecture

```
token-town/
  apps/
    clients/
      vscode-extension/    — VS Code extension: pixel art office with animated AI agent characters
      angular-app/         — Angular 19+ admin dashboard (Microsoft SSO)
    servers/
      go-app/         — Go 1.22+ WebSocket + REST server (PostgreSQL, Redis)
  packages/
    shared/                — Shared TypeScript types (economy, agents, events, constants)
  infrastructure/
    dockers/
      development/         — Docker Compose: PostgreSQL + Redis for local dev
  docs/
    architecture/          — Architecture decision records
    project-summary.md     — Full project vision and roadmap
```

## Monorepo Setup

- **Package manager**: yarn workspaces (yarn v1 classic)
- **Workspace file**: `token-town.code-workspace` (required for Extension Dev Host debugging)
- **Root tsconfig.json**: shared base config extended by all TS packages

### Commands

```sh
yarn install                                          # Install all TS dependencies
cd apps/clients/vscode-extension/webview-ui && npm install  # Webview has its own node_modules

yarn workspace @token-town/vscode-extension run build  # Build extension
yarn workspace @token-town/angular-app run build       # Build admin panel
yarn workspace @token-town/shared run build            # Build shared types
yarn dev:server                                        # Run Go game server
yarn test:server                                       # Test Go game server

yarn docker:up                                         # Start PostgreSQL + Redis
yarn docker:down                                       # Stop services
yarn docker:reset                                      # Reset volumes and restart
```

### VS Code Tasks

- **Extension: Build** — default build task (Ctrl+Shift+B)
- **Extension: Watch** — background watch mode for development
- **Admin Panel: Dev** — ng serve for admin panel
- **Game Server: Dev** — go run the game server
- **Docker: Up** — start development services (PostgreSQL + Redis)
- **Docker: Down** — stop development services
- **Install All Dependencies** — yarn install for workspace
- **Install Webview Dependencies** — npm install for webview-ui

### Infrastructure

Development services live in `infrastructure/dockers/development/`:
- **PostgreSQL 16** on port 5432 (auto-initializes schema on first run)
- **Redis 7** on port 6379 (pub/sub for WebSocket scaling)

Per-service configuration in `infrastructure/dockers/development/services/<service>/`.

### Debugging

Press **F5** to launch Extension Development Host. Uses `token-town.code-workspace` to open the project folder (required for JSONL session detection).

## Stack

| Layer | Technology |
|-------|-----------|
| VS Code Extension backend | TypeScript, Node.js, esbuild |
| Extension webview (game) | React 19+, Vite, Canvas 2D |
| Admin Panel | Angular 19+, MSAL (Microsoft SSO) |
| Game Server | Go 1.22+, gorilla/websocket, chi router |
| Database | PostgreSQL (pgx/v5), sqlc |
| Real-time | WebSocket (RFC 6455), Redis pub/sub for scaling |
| Shared types | TypeScript (packages/shared) |

## Key Concepts

- **Economy**: Users earn coins from AI token consumption. Formula: `floor((input*1 + output*3 + cache_write*1.25 + cache_read*0.1) / 1000)`
- **Local mode**: Extension works offline without server (shows only local agents)
- **Multiplayer mode**: WebSocket connection to game-server for shared office, economy, shop
- **Authentication**: `vscode.env.machineId` (automatic, no login), Microsoft SSO for admin panel

## TypeScript Constraints

- No `enum` — use `as const` objects
- `import type` for type-only imports where `verbatimModuleSyntax` is enabled
- Each app has its own tsconfig extending root `tsconfig.json`

## CLAUDE.md Maintenance

Each application has its own CLAUDE.md with specific architecture details. **When making architectural changes to an application, update its CLAUDE.md accordingly.** The per-app CLAUDE.md files are:

- `apps/clients/vscode-extension/CLAUDE.md` — Extension architecture, sprite system, editor, rendering
- `apps/clients/angular-app/CLAUDE.md` — Angular app structure, auth, API integration
- `apps/servers/go-app/CLAUDE.md` — Go server architecture, WebSocket, economy, database
- `packages/shared/CLAUDE.md` — Shared types contract and guidelines

## Repository

- **Origin**: Fork of [nicknisi/pixel-agents](https://github.com/nicknisi/pixel-agents) (VS Code extension)
- **Bitbucket**: `https://bitbucket.org/origen-life/token-town.git`
