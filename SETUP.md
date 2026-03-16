# Token Town — Setup Guide

Pixel art office where your Claude Code agents come to life as animated characters. Supports local solo use and multiplayer mode where teammates share the same office.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Yarn](https://classic.yarnpkg.com/) v1 (`npm install -g yarn`)
- [Go](https://go.dev/dl/) 1.22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [ngrok](https://ngrok.com/) (only for multiplayer with external teammates)
- VS Code 1.105+

---

## 1. Clone & Install

```bash
git clone https://bitbucket.org/origen-life/token-town.git
cd token-town

# Install all TypeScript dependencies
yarn install

# Install webview dependencies (separate node_modules)
cd apps/clients/vscode-extension/webview-ui && npm install && cd ../../../..
```

---

## 2. Build

```bash
# Build shared types first
yarn workspace @token-town/shared run build

# Build the VS Code extension
yarn workspace @token-town/vscode-extension run build
```

---

## 3. Run the Extension (solo mode)

Press **F5** in VS Code with the `token-town` repo open.

A new **Extension Development Host** window opens. Your Claude Code agents (any session modified in the last 24h across all projects in `~/.claude/projects/`) will appear automatically as pixel characters in the office.

> No server needed for solo mode — the extension reads JSONL transcripts directly from disk.

---

## 4. Multiplayer Setup

Multiplayer requires the Go server, PostgreSQL and Redis running, and a way for teammates to reach your server.

### 4.1 Start infrastructure

```bash
yarn docker:up
```

This starts:
- **PostgreSQL 16** on port `30001`
- **Redis 7** on port `30002`

### 4.2 Start the Go server

```bash
yarn dev:server
```

Server starts on `http://localhost:30000`. You should see:
```
Token Town server starting on :30000
```

### 4.3 Expose the server with ngrok

From any terminal, in any directory:

```bash
ngrok http 30000
```

ngrok will show a public URL like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:30000
```

Copy that URL — you'll need it for teammates.

### 4.4 Teammate setup

Your teammate needs to:

1. Clone and set up the repo (steps 1–2 above)
2. Add the server URL to their VS Code **User Settings** (`Ctrl+,` → search "pixelAgents"):

```json
"pixelAgents.serverUrl": "wss://abc123.ngrok-free.app/ws"
```

Or edit `settings.json` directly:

```json
{
  "pixelAgents.serverUrl": "wss://abc123.ngrok-free.app/ws"
}
```

3. Press **F5** → Extension Development Host opens → their agents appear in the shared office

> **Your own settings**: You don't need to set `serverUrl` — your extension connects to `ws://localhost:30000/ws` by default.

---

## 5. How It Works

- Each VS Code instance scans `~/.claude/projects/` for JSONL session files modified in the last 24h
- Each active session becomes an animated character in the pixel office
- Characters show speech bubbles for tool use, permissions, and idle/waiting states
- In multiplayer mode, the Go server broadcasts agent activity between connected clients so everyone sees each other's agents

---

## 6. Environment Variables (Go server)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `30000` | HTTP/WS server port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:30001/tokentown?sslmode=disable` | PostgreSQL connection |
| `TOKEN_SIGNING_KEY` | `dev-signing-key-change-in-production` | HMAC key for session tokens |

---

## 7. Useful Commands

```bash
yarn docker:up          # Start PostgreSQL + Redis
yarn docker:down        # Stop services
yarn docker:reset       # Wipe volumes and restart
yarn dev:server         # Run Go server (requires docker:up)
yarn build:extension    # Build VS Code extension
yarn watch:extension    # Watch mode for extension development
```

---

## Troubleshooting

**Office is empty / agents not appearing**
- Make sure you are in the Extension Development Host window (opened by F5), not your main VS Code
- Check `Help > Toggle Developer Tools > Console` for errors
- Verify `~/.claude/projects/` contains JSONL files modified recently

**WebSocket connection fails (error 1006)**
- Confirm the Go server is running: `curl http://localhost:30000/health`
- Confirm Docker is up: `yarn docker:up`
- Check the server URL setting matches the ngrok URL (use `wss://` not `ws://` for ngrok)

**Build errors: cannot find module '@token-town/shared'**
```bash
yarn workspace @token-town/shared run build
```

**Go not found after install**
Open a new terminal — Go requires a fresh shell to pick up the PATH.
