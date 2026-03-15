# Token Town — Project Summary

## Visión del Proyecto

Token Town es una extensión de VS Code que transforma el trabajo con Claude Code en una experiencia de juego de oficina multijugador. Cada usuario que trabaje con Claude Code aparece representado por un personaje pixel art en una oficina virtual compartida, junto con sus subagentes de IA.

## Concepto Core

- **Presencia en tiempo real**: Todos los usuarios conectados aparecen en el mismo mapa de oficina, cada uno con sus agentes Claude Code trabajando visualmente
- **Economía de tokens**: Los usuarios ganan monedas ("coins") en función de los tokens que consumen con Claude Code. La fórmula: `coins = floor((input×1 + output×3 + cache_write×1.25 + cache_read×0.1) / 1000)`
- **Tienda de assets**: Las monedas se usan para comprar muebles, paredes y habitaciones nuevas para personalizar el espacio de trabajo virtual
- **Gratuito en modo local**: La extensión funciona sin servidor (modo local), mostrando solo los agentes del usuario actual. El modo multijugador requiere conexión al servidor

## Arquitectura General

### Monorepo (pnpm workspaces + Turborepo)
- `apps/clients/vscode-extension/` — Extensión VS Code (TypeScript, Node.js)
- `apps/clients/admin-panel/` — Panel de administración web (Angular 19+, Microsoft SSO)
- `apps/servers/game-server/` — Servidor de juego (Go 1.22+, WebSocket, PostgreSQL)
- `packages/shared/` — Tipos TypeScript compartidos

### Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| Extensión VS Code | TypeScript, Node.js, esbuild |
| Webview del juego | React 19+, Vite, Canvas 2D |
| Admin Panel | Angular 19+, MSAL (Microsoft SSO) |
| Servidor | Go 1.22+, gorilla/websocket, chi |
| Base de datos | PostgreSQL (pgx/v5) |
| Query layer | sqlc |
| Migraciones | golang-migrate |
| Tiempo real | WebSocket nativo (RFC 6455) |
| Escalado | Redis pub/sub (go-redis) |
| Monorepo | pnpm workspaces + Turborepo |

## Features Planificadas

### v1.0 — Base (Monorepo + Estructura)
- [x] Monorepo pnpm + Turborepo
- [x] Extensión VS Code migrada a `apps/clients/vscode-extension/`
- [x] Skeleton Go game-server con WebSocket hub
- [x] Skeleton Angular admin panel con MSAL
- [x] Shared TypeScript types en `packages/shared/`
- [x] Esquema PostgreSQL completo

### v1.1 — Economía
- [x] Extracción de token usage desde JSONL de Claude Code (`tokenReporter.ts`)
- [x] Envío de token reports al servidor (REST batch 10s + offline queue)
- [x] Cálculo de coins server-side (`economy/coins.go`, `EarnCoinsWithDedup`)
- [ ] Coin counter en la webview del juego
- [x] Sistema de transacciones con ledger append-only (`transactions` table, `wallet.go`)

### v1.2 — Multijugador
- [x] Autenticación con machineId + sesión firmada (HMAC-SHA256) (`auth/tokens.go`)
- [x] WebSocket hub con rooms por usuario (`ws/hub.go`, `rooms/manager.go`)
- [x] Broadcast de estado de agentes a otros usuarios (`agentBroadcaster.ts`, `ws/client.go`)
- [x] Sincronización de layouts de sala (`room:saveLayout` WS handler)
- [x] Presencia: ver quién está conectado (room snapshots on connect)

### v1.3 — Tienda
- [x] Catálogo de items desde `furniture-catalog.json` existente (`api/shop.go`)
- [ ] Modal de tienda en la webview
- [x] Compra de items con deducción de coins (`economy/shop.go`, `shop:purchase` WS handler)
- [x] Inventario por usuario (`inventory` table, `api/inventory.go`)
- [x] Sistema de rareza (Common/Uncommon/Rare/Legendary) — en esquema DB

### v1.4 — Admin Panel
- [x] Dashboard con estadísticas globales (con datos en tiempo real vía WebSocket)
- [x] Gestión de usuarios y ajuste manual de coins (`api/admin.go`)
- [x] Gestión del catálogo de tienda (precios, disponibilidad)
- [x] Leaderboard global con ranking por usuario (`api/leaderboard.go`)
- [x] Autenticación Microsoft SSO (MSAL configurado en `app.config.ts`)

### v2.0 — Expansión de Espacios
- [ ] Sistema de habitaciones: cada usuario puede tener múltiples habitaciones
- [ ] Construcción de paredes y expansión del espacio
- [ ] Compra de nuevas habitaciones con coins
- [ ] Visitar la sala de otros usuarios
- [ ] Sala pública compartida (lobby) donde todos coinciden

## Autenticación

### Extensión VS Code
- Fase 1: `vscode.env.machineId` (sin login, automático)
- Fase 2: Microsoft SSO opcional para sincronizar perfil entre máquinas

### Admin Panel
- Microsoft SSO (MSAL) obligatorio
- Solo usuarios con `role = 'admin'` en la base de datos pueden acceder

## Seguridad Anti-Trampa

La economía de coins NO es un sistema financiero real. Las mitigaciones cubren abuso casual:
1. **Deduplicación por requestId**: Cada respuesta de Anthropic tiene un `requestId` único. El servidor deduplica con `EarnCoinsWithDedup()` — dedup check + coin credit + registro en una sola transacción DB (sin race condition).
2. **Rate limiting**: Token bucket per user en memoria — 30 req/s general, 5 req/s para token reports. Limpieza automática cada 5 minutos.
3. **Validación de rangos**: Los tokens reportados deben estar dentro de rangos razonables por modelo (max 100K output, 2M input, 2M cache).

## WebSocket Protocol

El servidor Go usa WS nativo (gorilla/websocket). La extensión VS Code actúa como proxy:
```
Webview React ↔ postMessage ↔ VS Code Extension ↔ WebSocket ↔ Go Server ↔ WebSocket ↔ Otras extensiones
```

### Optimizaciones de WS
- Throttle 500ms para eventos de actividad de agentes
- Batch 10s para reportes de tokens
- Debounce 2s para guardado de layouts
- Heartbeat: ping 54s, pong timeout 60s
- Reconexión con backoff exponencial (1s → 30s)
- Snapshot completo al reconectar

## Base de Datos (PostgreSQL)

Tablas principales:
- `users` — Perfil, coins, machineId, Microsoft SSO ID
- `transactions` — Ledger append-only de todas las operaciones de coins
- `shop_items` — Catálogo de la tienda (gestionado desde admin panel)
- `inventory` — Items comprados por usuario
- `room_layouts` — Layouts de sala guardados server-side
- `processed_requests` — Deduplicación de token reports (dedup atómico, sin race condition)
- `agents` — Estado de agentes activos por usuario (palette, hueShift, seat, status) — migración 002

## Investigaciones Realizadas

### Arquitectura WebSockets
Ver `docs/architecture/realtime-websockets.md` — análisis completo de Socket.IO vs WS nativo, optimizaciones de batching, protocolo de mensajes, y estrategia de escalado con Redis.

### Estructura del Monorepo
Ver `docs/architecture/monorepo-structure.md` — decisiones de pnpm vs npm vs Nx, Turborepo, build pipeline, y plan de migración del código existente.

### Economía y Backend
Ver `docs/architecture/economy-backend.md` — fórmula de tokens→coins, modelo de datos SQL, stack Go, seguridad anti-trampa, y precios de la tienda.

## Repositorio

- **Git**: fork de [nicknisi/pixel-agents](https://github.com/nicknisi/pixel-agents)
- **Bitbucket**: `https://bitbucket.org/origen-life/token-town.git`

## Módulos de la Extensión (Multiplayer)

Nuevos módulos en `apps/clients/vscode-extension/src/`:
- `wsClient.ts` — WebSocket client con reconexión exponencial (1s→30s) + jitter, auth via `SecretStorage`
- `tokenReporter.ts` — Extrae usage de JSONL, batch 10s, offline queue (1000 entries), drain on reconnect
- `economyClient.ts` — REST client para register, balance, shop, purchase, inventory
- `agentBroadcaster.ts` — Throttle 500ms para activity updates, inmediato para lifecycle events
- `serverUtils.ts` — `getServerBaseUrl()` compartido

## Pendiente de Implementar

- [ ] Coin counter en la webview del juego (postMessage `coinsUpdate` ya disponible desde extension)
- [ ] Modal de tienda en la webview
- [ ] Visitar la sala de otros usuarios (v2.0)
- [ ] Sistema de habitaciones múltiples (v2.0)
- [ ] Sala pública compartida / lobby (v2.0)

## Deuda Técnica Conocida

- 5 error handling gaps menores en Go (shop.go, inventory.go, admin.go — queries sin check de error)
- JSON injection risk en `admin.go` (`err.Error()` sin escapar en respuesta JSON)
- Auth WS usa `X-User-ID` header sin validar token — necesita fix antes de producción
- CORS `AllowedOrigins: ["*"]` y `CheckOrigin: true` — restringir en producción
- Signing key de tokens tiene fallback hardcodeado — requiere `TOKEN_SIGNING_KEY` env var en producción
- Credenciales Azure AD (`YOUR_AZURE_CLIENT_ID`) pendientes de configurar en `environment.prod.ts`

## Decisiones Pendientes

- [ ] Confirmar clientId y tenantId de Azure AD para Microsoft SSO
- [ ] Definir URL de producción del servidor Go
- [ ] Decidir si usar Docker Compose para desarrollo local (servidor + PostgreSQL + Redis)
- [ ] Precio de compra de nuevas habitaciones
