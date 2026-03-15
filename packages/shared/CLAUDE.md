# Shared Package — TypeScript Types & Constants

Isomorphic TypeScript package consumed by `vscode-extension` and `admin-panel`. Contains type definitions, event contracts, and shared constants for the Token Town ecosystem.

## Structure

```
src/
  index.ts    — All exports (types, constants, event enums)
```

## Exported Types

- **Economy**: `TokenUsage`, `Wallet`, `Transaction`, `TransactionType`, `ShopItem`
- **Users**: `User` (id, machineId, displayName, palette, hueShift, coins, role)
- **Agents**: `AgentStatus`, `RemoteAgent`, `PlayerPresence`
- **WebSocket Events**: `ClientEventType`, `ServerEventType` (as const objects)
- **Constants**: `TOKENS_PER_COIN`, `MAX_PLAYERS_PER_ROOM`, timing constants, token weight multipliers

## Type-Safety Contract

These types define the contract between TypeScript clients and the Go server. JSON field names must match exactly between this package and Go struct tags in `game-server/internal/ws/events.go`.

When adding or modifying types here, verify the corresponding Go structs are updated in the game server.

## Build

```sh
yarn workspace @token-town/shared run build        # tsc → dist/
yarn workspace @token-town/shared run check-types   # Type check only
```

## tsconfig

Extends root `tsconfig.json`. Uses `module: "Node16"` with `verbatimModuleSyntax: false` (CommonJS compatibility for consumers).

## CLAUDE.md Maintenance

**Update this file when changing**: exported type interfaces, event type enums, shared constants, or the package's module format/build configuration.
