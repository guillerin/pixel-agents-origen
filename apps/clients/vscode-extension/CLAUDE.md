# VS Code Extension — Pixel Agents

VS Code extension with embedded React webview: pixel art office where AI agents (terminals) are animated characters.

## Architecture

```
src/                          — Extension backend (Node.js, VS Code API)
  constants.ts                — All backend magic numbers/strings
  extension.ts                — Entry: activate(), deactivate()
  PixelAgentsViewProvider.ts  — WebviewViewProvider, message dispatch, asset loading
  assetLoader.ts              — PNG parsing, sprite conversion, catalog building
  agentManager.ts             — Terminal lifecycle: launch, remove, restore, persist
  layoutPersistence.ts        — Layout file I/O (~/.pixel-agents/layout.json), cross-window sync
  fileWatcher.ts              — fs.watch + polling, readNewLines, /clear detection, terminal adoption
  transcriptParser.ts         — JSONL parsing: tool_use/tool_result → webview messages
  timerManager.ts             — Waiting/permission timer logic
  types.ts                    — Shared interfaces (AgentState, PersistedAgent)

webview-ui/src/               — React + TypeScript (Vite)
  constants.ts                — All webview magic numbers/strings
  notificationSound.ts        — Web Audio API chime on agent turn completion
  App.tsx                     — Composition root, hooks + components + EditActionBar
  hooks/
    useExtensionMessages.ts   — Message handler + agent/tool state
    useEditorActions.ts       — Editor state + callbacks
    useEditorKeyboard.ts      — Keyboard shortcut effect
  components/
    BottomToolbar.tsx          — + Agent, Layout toggle, Settings button
    ZoomControls.tsx           — +/- zoom (top-right)
    SettingsModal.tsx          — Settings, export/import layout, sound toggle
    DebugView.tsx              — Debug overlay
  office/
    types.ts                  — Interfaces (OfficeLayout, FloorColor, Character, etc.)
    toolUtils.ts              — STATUS_TO_TOOL mapping, extractToolName()
    colorize.ts               — Dual-mode color: Colorize (grayscale→HSL) + Adjust (HSL shift)
    floorTiles.ts             — Floor sprite storage + colorized cache
    wallTiles.ts              — Wall auto-tile: 16 bitmask sprites
    sprites/
      spriteData.ts           — Pixel data: characters, furniture, tiles, bubbles
      spriteCache.ts          — SpriteData → offscreen canvas, per-zoom WeakMap cache
    editor/
      editorActions.ts        — Pure layout ops: paint, place, remove, move, rotate
      editorState.ts          — Imperative state: tools, ghost, selection, undo/redo
      EditorToolbar.tsx        — React toolbar/palette for edit mode
    layout/
      furnitureCatalog.ts     — Dynamic catalog from loaded assets
      layoutSerializer.ts     — OfficeLayout ↔ runtime conversion
      tileMap.ts              — Walkability, BFS pathfinding
    engine/
      characters.ts           — Character FSM: idle/walk/type + wander AI
      officeState.ts          — Game world: layout, characters, seats, selection
      gameLoop.ts             — rAF loop with delta time
      renderer.ts             — Canvas: tiles, z-sorted entities, overlays, edit UI
      matrixEffect.ts         — Matrix-style spawn/despawn digital rain
    components/
      OfficeCanvas.tsx        — Canvas, resize, DPR, mouse hit-testing, edit interactions
      ToolOverlay.tsx         — Activity status label above character + close button
```

## Core Concepts

**Vocabulary**: Terminal = VS Code terminal running AI CLI. Session = JSONL conversation file. Agent = webview character bound 1:1 to a terminal.

**Extension ↔ Webview**: `postMessage` protocol. Key messages: `openClaude`, `agentCreated/Closed`, `focusAgent`, `agentToolStart/Done/Clear`, `agentStatus`, `existingAgents`, `layoutLoaded`, `furnitureAssetsLoaded`, `floorTilesLoaded`, `wallTilesLoaded`, `saveLayout`, `saveAgentSeats`, `exportLayout`, `importLayout`, `settingsLoaded`, `setSoundEnabled`.

**One-agent-per-terminal**: Each "+ Agent" click → new terminal → immediate agent creation → 1s poll for JSONL → file watching starts.

**Terminal adoption**: Project-level 1s scan detects unknown JSONL files. If active terminal has no agent → adopt.

## Agent Status Tracking

JSONL transcripts at `~/.claude/projects/<project-hash>/<session-id>.jsonl`. Project hash = workspace path with special chars → `-`.

**JSONL record types**: `assistant` (tool_use or thinking), `user` (tool_result or text prompt), `system` with `subtype: "turn_duration"` (reliable turn-end signal), `progress` with `data.type`: `agent_progress`, `bash_progress`, `mcp_progress`.

**File watching**: Hybrid `fs.watch` + 2s polling backup. Partial line buffering for mid-write reads. Tool done messages delayed 300ms to prevent flicker.

**Idle detection**: Two signals: (1) `system` + `subtype: "turn_duration"` (~98% reliable for tool-using turns). (2) Text-idle timer (5s) for text-only turns.

## Persistence

- **Agents**: `workspaceState` key `'pixel-agents.agents'` (palette/hueShift/seatId)
- **Layout**: `~/.pixel-agents/layout.json` (user-level, shared across windows). Atomic writes via `.tmp` + rename. Cross-window sync via `watchLayoutFile()`
- **Default layout**: `assets/default-layout.json`. Update via "Pixel Agents: Export Layout as Default" command

## Office UI

**Rendering**: Imperative `OfficeState` class. Pixel-perfect integer zoom (1x–10x). Z-sort all entities by Y. Pan via middle-mouse drag. Camera follow on agent click.

**Characters**: FSM states — active (pathfind to seat, typing/reading animation), idle (wander randomly). 4-directional sprites, left = flipped right. Diverse palette assignment: first 6 agents get unique skins; beyond 6, hue shift rotation.

**Spawn/despawn**: Matrix-style digital rain animation (0.3s). Restored agents skip spawn effect.

**Sub-agents**: Negative IDs. Same palette as parent. Click focuses parent terminal. Spawn at closest free seat to parent.

**Speech bubbles**: Permission ("..." amber) stays until clicked. Waiting (green checkmark) auto-fades 2s.

**Sound**: Two-note chime (E5→E6) via Web Audio API on waiting bubble. Toggle in Settings.

## Layout Editor

Toggle via "Layout" button. Tools: SELECT, Floor paint, Wall paint, Erase (VOID), Furniture place, Eyedropper. HSBC color sliders for floors/walls/furniture. 50-level undo/redo. Grid expansion up to 64×64.

## Asset System

**Loading**: esbuild copies `webview-ui/public/assets/` → `dist/assets/`. PNG → pngjs → SpriteData. Load order: characters → floors → walls → furniture catalog → layout.

**Catalog**: `furniture-catalog.json` — id, name, category, footprint, isDesk, canPlaceOnWalls, groupId, orientation, state, canPlaceOnSurfaces, backgroundTiles. Rotation groups and state groups (on/off toggle) built dynamically.

**Character sprites**: 6 PNGs (`char_0.png`–`char_5.png`), 7 frames × 3 directions × 16×32px. Hue shift via `adjustSprite()` for uniqueness beyond 6 agents.

## Build

```sh
# From monorepo root:
yarn workspace @token-town/vscode-extension run build    # Full build
yarn workspace @token-town/vscode-extension run watch    # Watch mode

# Inside this directory:
npm run compile     # check-types + lint + esbuild + vite
cd webview-ui && npm install  # Webview needs its own node_modules
```

## TypeScript Constraints

- No `enum` (`erasableSyntaxOnly` disabled but prefer `as const` objects)
- `noUnusedLocals` / `noUnusedParameters` disabled in this package
- Constants centralized in `src/constants.ts` (backend) and `webview-ui/src/constants.ts` (frontend)

## Key Patterns

- `crypto.randomUUID()` for session IDs
- `fs.watch` unreliable on Windows — always pair with polling backup
- Partial line buffering essential for append-only JSONL reads
- `WebviewViewProvider` (panel area alongside terminal), not `WebviewPanel`
- Webview is separate Vite project with own `node_modules`/`tsconfig`

## CLAUDE.md Maintenance

**Update this file when changing**: message protocol between extension and webview, JSONL parsing logic, asset loading pipeline, editor tools, character animation system, rendering architecture, or build configuration.
