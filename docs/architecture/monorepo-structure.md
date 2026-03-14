# Token Town — Monorepo Structure

## 1. Overview

Token Town transforms the single-extension Pixel Agents project into a multiplayer office game. The current codebase has two build targets (VS Code extension backend + React webview) with no shared package boundary. The monorepo adds a WebSocket game server, an economy service, and extracts shared types/logic into reusable packages. The game-server and economy-engine are implemented in Go as a separate Go module under `server/`, colocated in the same monorepo repository.

## 2. Package Structure

```
token-town/
├── apps/
│   ├── clients/
│   │   ├── vscode-extension/     # @token-town/vscode-extension
│   │   │   ├── src/              # Extension backend (TypeScript)
│   │   │   ├── webview-ui/       # React webview (Vite)
│   │   │   ├── esbuild.js
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   └── admin-panel/          # @token-town/admin-panel
│   │       ├── src/              # Angular 19+ app
│   │       ├── angular.json
│   │       └── package.json
│   └── servers/
│       └── game-server/          # Go module: token-town/server
│           ├── cmd/server/       # Entry point
│           ├── internal/         # Go packages
│           ├── go.mod
│           └── Makefile
├── packages/
│   └── shared/                   # @token-town/shared
│       ├── src/
│       │   └── index.ts          # Shared TypeScript types
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── architecture/
│   │   ├── economy-backend.md
│   │   ├── monorepo-structure.md
│   │   └── realtime-websockets.md
│   └── project-summary.md
├── scripts/                      # Asset pipeline (dev tools)
├── package.json                  # Root workspace (pnpm)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .gitignore
```

### Why These Packages

| Package | Responsibility | Runs In |
|---------|---------------|---------|
| `packages/shared` | Types, events, constants, validation schemas | Everywhere (isomorphic) |
| `apps/servers/game-server` (Go module) | WebSocket hub, room management, economy logic, REST API, DB persistence | Go server process |
| `apps/clients/vscode-extension` | VS Code API integration, terminal management, asset loading, React webview (game engine, rendering, UI) | VS Code extension host (Node.js) + webview (Browser) |
| `apps/clients/admin-panel` | Admin dashboard, user/shop management, leaderboard | Browser (Angular 19+, Microsoft SSO) |

**Why Go for the server**: Goroutines are ~2KB each vs ~1MB for a Node.js async task under load. For a WebSocket server expected to handle hundreds of concurrent connections with low latency event fan-out, Go's concurrency model is a natural fit. The economy logic (pure math functions) is trivial to implement in Go and benefits from static typing and compilation.

**Why NOT a separate `asset-service`**: The asset pipeline (`scripts/`) is a dev-time tool, not a runtime service. Assets are static PNGs bundled into the extension's webview. No need for a runtime asset service unless we add user-generated content later.

**Why webview-ui stays inside vscode-extension**: The React webview is tightly coupled to the extension via `postMessage` protocol. Keeping it as a subdirectory (`webview-ui/`) inside the extension package avoids an extra package boundary while maintaining separate build configs (Vite for webview, esbuild for extension).

## 3. Monorepo Tooling: pnpm Workspaces + Turborepo

### Recommendation: **pnpm workspaces + Turborepo**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| npm workspaces | Zero new tooling, familiar | Slow installs, no build orchestration, phantom deps | Too limited |
| pnpm workspaces | Fast installs, strict dep isolation, disk efficient | One more tool to learn | Best fit |
| Nx | Powerful, great for large orgs | Heavy, complex config, overkill for 5 packages | Over-engineered |
| Turborepo | Simple pipeline config, caching, parallel builds | Needs a package manager underneath | Perfect complement to pnpm |

**Justification**:
- **pnpm**: Strict node_modules isolation prevents the phantom dependency bugs that plague npm workspaces. The VS Code extension build (esbuild) and the webview build (Vite) have very different dependency trees — pnpm keeps them cleanly separated. Symlinked `node_modules` saves ~40% disk vs npm.
- **Turborepo**: Adds build orchestration on top of pnpm. Understands package dependency graph, runs builds in correct order, caches results. Config is a single `turbo.json` — minimal overhead for the team.

**Go module management**: The `apps/servers/game-server/` directory is a standalone Go module (`go mod init token-town/server`). It is NOT managed by pnpm or Turborepo. Instead:
- `go build ./cmd/server` for production binary
- `go test ./...` for tests
- `make dev` for local development (uses `air` for hot reload)
- Turborepo can invoke `make build` as a task for unified CI builds

### Root `package.json`

```jsonc
{
  "name": "token-town",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev --parallel",
    "lint": "turbo lint",
    "check-types": "turbo check-types",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.9.3",
    "prettier": "^3.8.1"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "apps/clients/*"
```

### `turbo.json`

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "check-types": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

## 4. Shared Types (packages/shared)

### Core Entities

```typescript
// types/user.ts
export interface User {
  id: string;              // Unique user ID (from auth provider or local UUID)
  displayName: string;
  palette: number;         // Character skin palette (0-5)
  hueShift: number;        // Additional hue rotation for uniqueness
  createdAt: string;       // ISO date
}

// types/room.ts
export interface Room {
  id: string;
  name: string;
  ownerId: string;         // User who created the room
  layout: RoomLayout;
  maxPlayers: number;
  createdAt: string;
}

export interface RoomLayout {
  version: 1;
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
  tileColors?: Array<FloorColor | null>;
}

export interface RoomState {
  room: Room;
  players: PlayerPresence[];  // Currently connected players
  characters: CharacterState[];  // All characters (players + their agents)
}

export interface PlayerPresence {
  userId: string;
  displayName: string;
  joinedAt: string;
  agentCount: number;      // How many Claude agents they have active
}

// types/agent.ts
export interface Agent {
  id: number;              // Positive for agents, negative for sub-agents
  ownerId: string;         // User who owns this agent
  roomId: string;
  palette: number;
  hueShift: number;
  seatId: string | null;
  status: AgentStatus;
  currentTool: string | null;
  isSubagent: boolean;
  parentAgentId: number | null;
}

export const AgentStatus = {
  IDLE: 'idle',
  ACTIVE: 'active',
  WAITING: 'waiting',
  PERMISSION: 'permission',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

// types/economy.ts
export interface Wallet {
  userId: string;
  balance: number;         // Current coin balance
  totalEarned: number;     // Lifetime earnings
  totalSpent: number;      // Lifetime spending
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;          // Positive = credit, negative = debit
  description: string;
  timestamp: string;       // ISO date
  metadata?: Record<string, unknown>;
}

export const TransactionType = {
  TOKEN_REWARD: 'token_reward',    // Earned from Claude Code usage
  PURCHASE: 'purchase',            // Spent on furniture/cosmetics
  REFUND: 'refund',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export interface ShopItem {
  id: string;
  furnitureType: string;   // References FurnitureCatalogEntry.type
  price: number;
  category: string;
  unlockLevel?: number;    // Optional: require minimum total earned
}

// types/furniture.ts — re-exports/extends existing types
export type { FloorColor, PlacedFurniture, FurnitureCatalogEntry } from './room';
// (These are migrated from webview-ui/src/office/types.ts)

export interface FurnitureItem {
  id: string;
  type: string;            // Asset ID
  ownerId: string;         // User who purchased it
  purchasedAt: string;
  placedInRoom?: string;   // Room ID if currently placed
}

// types/events.ts — WebSocket event contracts
export const ClientEvent = {
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  AGENT_STATUS: 'agent_status',
  AGENT_CREATED: 'agent_created',
  AGENT_CLOSED: 'agent_closed',
  PLACE_FURNITURE: 'place_furniture',
  REMOVE_FURNITURE: 'remove_furniture',
  PURCHASE_ITEM: 'purchase_item',
  MOVE_CHARACTER: 'move_character',
  UPDATE_LAYOUT: 'update_layout',
  TOKEN_USAGE: 'token_usage',
} as const;
export type ClientEvent = (typeof ClientEvent)[keyof typeof ClientEvent];

export const ServerEvent = {
  ROOM_STATE: 'room_state',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  CHARACTER_UPDATE: 'character_update',
  FURNITURE_PLACED: 'furniture_placed',
  FURNITURE_REMOVED: 'furniture_removed',
  WALLET_UPDATE: 'wallet_update',
  PURCHASE_RESULT: 'purchase_result',
  LAYOUT_UPDATED: 'layout_updated',
  ERROR: 'error',
} as const;
export type ServerEvent = (typeof ServerEvent)[keyof typeof ServerEvent];

// Payload types for each event
export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  displayName: string;
}

export interface AgentStatusPayload {
  agentId: number;
  status: AgentStatus;
  currentTool: string | null;
}

export interface TokenUsagePayload {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  sessionId: string;
}

export interface PurchaseItemPayload {
  userId: string;
  shopItemId: string;
}

export interface PurchaseResultPayload {
  success: boolean;
  itemId?: string;
  newBalance?: number;
  error?: string;
}
```

### Constants (shared)

```typescript
// constants.ts
export const TILE_SIZE = 16;
export const DEFAULT_COLS = 20;
export const DEFAULT_ROWS = 11;
export const MAX_COLS = 64;
export const MAX_ROWS = 64;

// Economy
export const TOKENS_PER_COIN = 1000;    // 1000 Claude tokens = 1 coin
export const MAX_DAILY_EARNINGS = 500;   // Cap to prevent abuse

// Multiplayer
export const MAX_PLAYERS_PER_ROOM = 8;
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const RECONNECT_TIMEOUT_MS = 60_000;
```

### Type Sharing: TypeScript ↔ Go

Since the server is Go and clients are TypeScript, types must be defined in both languages. Strategy:

**Phase 1 (simple)**: Define types manually in both places. The JSON field names must match exactly. Use integration tests to catch drift.

**Phase 2 (schema-first, recommended for production)**: Define WebSocket event schemas in JSON Schema or OpenAPI. Generate:
- TypeScript types via `quicktype` or `json-schema-to-typescript`
- Go structs via `quicktype` or `oapi-codegen`

Example Go structs matching the TypeScript events:

```go
// internal/ws/events.go

type AgentActivityEvent struct {
    Event          string  `json:"event"`
    AgentLocalID   int     `json:"agentLocalId"`
    Status         string  `json:"status"`
    CurrentTool    *string `json:"currentTool,omitempty"`
    ToolStatus     *string `json:"toolStatus,omitempty"`
    HasPermission  bool    `json:"hasPermissionWait,omitempty"`
}

type TokenReportEvent struct {
    Event            string  `json:"event"`
    SessionID        string  `json:"sessionId"`
    InputTokens      int     `json:"inputTokens"`
    OutputTokens     int     `json:"outputTokens"`
    CacheReadTokens  int     `json:"cacheReadTokens,omitempty"`
    CacheWriteTokens int     `json:"cacheWriteTokens,omitempty"`
    Model            string  `json:"model"`
    Timestamp        int64   `json:"timestamp"`
}

type CoinsUpdateEvent struct {
    Event      string `json:"event"`
    UserID     string `json:"userId"`
    TotalCoins int    `json:"totalCoins"`
    Delta      int    `json:"delta"`
    Reason     string `json:"reason"`
}
```

## 5. Build Pipeline

### Dependency Graph

```
shared (no deps)
  ↓
vscode-extension (depends on shared; webview-ui built inline via Vite)
admin-panel (depends on shared)

game-server (Go module, independent of pnpm graph)
```

### Build Order (handled by Turborepo `^build`)

1. `@token-town/shared` — tsc → `dist/` (ESM + CJS dual output, `.d.ts` declarations)
2. `apps/servers/game-server` — `go build ./cmd/server` → `server` binary (parallel with step 1)
3. `@token-town/admin-panel` — ng build → `dist/`
4. `@token-town/vscode-extension` — esbuild (extension) + vite (webview-ui) → `dist/`

### Per-Package Build Tools

| Package | Build Tool | Output | Why |
|---------|-----------|--------|-----|
| shared | tsc (declarations + js) | `dist/` ESM | Consumed as dependency, needs .d.ts |
| game-server (Go) | `go build` | binary `server` | Single static binary, no runtime deps |
| vscode-extension | esbuild (extension) + Vite (webview-ui) | `dist/extension.js` + `dist/webview/` | VS Code requires single CJS bundle; webview is browser target |
| admin-panel | Angular CLI (ng build) | `dist/` (static files) | Browser target, standalone Angular app |

### Shared tsconfig

```jsonc
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "composite": true
  }
}
```

Each package extends this with its own `outDir`, `rootDir`, and `references`.

## 6. Migration Plan

### Phase 1: Scaffold monorepo (non-breaking)

1. Initialize pnpm workspace at root with `pnpm-workspace.yaml`
2. Add `turbo.json`
3. Create `tsconfig.base.json`
4. Create `packages/shared/` with extracted types from:
   - `webview-ui/src/office/types.ts` → room/furniture types
   - `src/types.ts` → agent state types
   - New multiplayer and economy types

**The existing code continues to work unchanged during this phase.**

### Phase 2: Move existing code into apps/

1. Move `src/` + `webview-ui/` → `apps/clients/vscode-extension/`
2. Update import paths to use `@token-town/shared`
3. Update `esbuild.js` to resolve workspace dependencies
4. Update Vite config for new location
5. Verify the extension builds and runs identically

**Key risk**: VS Code extension packaging (`.vsix`) must bundle all dependencies. The esbuild config already bundles everything into a single file, so workspace deps get inlined — no runtime resolution issues.

### Phase 3: Add Go game-server + Angular admin panel

1. `go mod init token-town/server` in `apps/servers/game-server/`
2. Implement WebSocket hub with `gorilla/websocket`
3. Add REST endpoints with `chi` router
4. Implement economy logic in `internal/economy/`
5. Set up `sqlc` with PostgreSQL schema
6. Scaffold Angular 19+ admin panel in `apps/clients/admin-panel/` with MSAL
7. Add `tokenReporter.ts` to vscode-extension to report usage to Go server

### Phase 4: Clean up

1. Remove old root `src/` and `webview-ui/` (now under `apps/clients/vscode-extension/`)
2. Update CI/CD for monorepo build
3. Update CLAUDE.md to reflect new structure
4. Keep `scripts/` asset pipeline at root

### What NOT to Migrate

- `~/.pixel-agents/layout.json` user data format — maintain backward compatibility
- The `postMessage` protocol between extension and webview — this stays internal to vscode-extension ↔ game-client
- Agent/terminal management logic — this is VS Code-specific and stays in vscode-extension
- Asset pipeline scripts — these are dev tools, not packages

## 7. Development Workflow

```bash
# Instalar todas las dependencias (TypeScript packages)
pnpm install

# Build de todos los paquetes TypeScript (respeta orden de dependencias)
pnpm build

# Dev mode: extensión VS Code
pnpm --filter @token-town/vscode-extension compile

# Dev mode: admin panel Angular
pnpm --filter @token-town/admin-panel start

# Build del servidor Go
cd apps/servers/game-server && make build

# Dev mode: servidor Go (con hot reload via air)
cd apps/servers/game-server && make dev

# Type-check todo
pnpm check-types

# Add a dependency to a specific package
pnpm --filter @token-town/vscode-extension add some-lib
```

## 8. Key Decisions

1. **pnpm over npm**: Strict isolation prevents phantom deps. The current project already has separate `node_modules` for root and webview-ui — pnpm formalizes this pattern.

2. **Turborepo over Nx**: Turbo is lighter, config-over-code, and purpose-built for the TS monorepo use case. Nx would be justified at 15+ packages with custom generators — overkill here.

3. **Economy logic colocated in game-server**: Economy rules (pricing, conversion rates, purchase validation) live in `apps/servers/game-server/internal/economy/` as pure functions with no I/O. This keeps them testable in isolation while avoiding a separate package boundary. Go's static typing provides the same safety guarantees as a separate TypeScript library.

4. **webview-ui stays inside vscode-extension**: The React webview (`webview-ui/`) is a subdirectory of the extension package, not a separate workspace package. It uses Vite for building and the extension copies the built output into its dist folder. This avoids an extra package boundary for tightly coupled code.

5. **shared uses tsc, not a bundler**: It's consumed by other packages at build time. Bundling a shared library is unnecessary and makes debugging harder. Type declarations (`.d.ts`) are essential.

6. **No lerna**: Lerna is effectively deprecated in favor of pnpm workspaces + turborepo. It adds complexity without benefits for this stack.

7. **apps/ directory with clients/ and servers/ subdivisions**: Separates deployable applications from shared libraries (`packages/`). The `clients/` vs `servers/` split makes deployment targets immediately obvious.
