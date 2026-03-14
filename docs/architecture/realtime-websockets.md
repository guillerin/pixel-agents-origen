# Token Town - Arquitectura de Tiempo Real y WebSockets

## 1. Analisis del Estado Actual

### Comunicacion actual (Extension <-> Webview)

El sistema actual usa `postMessage` como protocolo IPC entre la extension VS Code y el webview React. Es **unidireccional local**: la extension lee archivos JSONL del disco (transcripciones de Claude Code), los parsea en `transcriptParser.ts`, y emite mensajes tipados al webview via `webview.postMessage()`.

**Flujo actual:**
```
JSONL files (disco) --> fileWatcher.ts --> transcriptParser.ts --> postMessage --> webview React
                                                                                     |
                                                                              useExtensionMessages.ts
```

**Mensajes existentes (Extension -> Webview):**
- `agentCreated`, `agentClosed`, `agentSelected` - ciclo de vida de agentes
- `agentToolStart`, `agentToolDone`, `agentToolsClear` - actividad de herramientas
- `agentStatus` (active/waiting) - estado del agente
- `agentToolPermission`, `agentToolPermissionClear` - deteccion de permisos
- `subagentToolStart`, `subagentToolDone`, `subagentClear`, `subagentToolPermission` - subagentes
- `existingAgents` - restauracion de agentes al reconectar
- `layoutLoaded`, `furnitureAssetsLoaded`, `settingsLoaded` - assets y configuracion

**Mensajes existentes (Webview -> Extension):**
- `openClaude`, `focusAgent`, `closeAgent` - acciones de usuario
- `saveLayout`, `saveAgentSeats` - persistencia
- `webviewReady` - handshake inicial

### Observaciones clave para el diseno WS

1. **El fileWatcher ya produce un flujo de eventos** -- la transicion a WS es natural: en vez de `webview.postMessage()` local, emitimos al servidor central.
2. **Los datos de JSONL son pesados** (tool_use completo con inputs). Para WS solo necesitamos metadatos ligeros (tool name, status, agent id).
3. **El estado del agente es una FSM simple**: idle -> active -> waiting, con herramientas como transiciones. Esto se mapea bien a eventos discretos.
4. **Sub-agentes ya tienen IDs negativos** y relacion parent-child -- esto se traduce directamente al modelo multiplayer.

---

## 2. Diseno de la Conexion WebSocket

### Arquitectura propuesta

```
+-----------------+     +-----------------+     +-----------------+
| VS Code Ext A   |     | VS Code Ext B   |     | VS Code Ext C   |
| (fileWatcher +  |     | (fileWatcher +  |     | (fileWatcher +  |
|  transcriptParser)     |  transcriptParser)     |  transcriptParser)
+--------+--------+     +--------+--------+     +--------+--------+
         |                        |                        |
         | WebSocket              | WebSocket              | WebSocket
         |                        |                        |
+--------v------------------------v------------------------v--------+
|                     Token Town Server                              |
|  +------------+  +-------------+  +-----------+  +--------------+ |
|  | Auth/Users |  | Room Manager|  | Economy   |  | Event Router | |
|  +------------+  +-------------+  +-----------+  +--------------+ |
|                          |                                         |
|                    +-----v------+                                  |
|                    | Redis      |                                  |
|                    | (pub/sub + |                                  |
|                    |  state)    |                                  |
|                    +------------+                                  |
+--------------------------------------------------------------------+
         |                        |                        |
         | WebSocket              | WebSocket              | WebSocket
         |                        |                        |
+--------v--------+     +--------v--------+     +--------v--------+
| Webview Game A  |     | Webview Game B  |     | Webview Game C  |
| (React canvas)  |     | (React canvas)  |     | (React canvas)  |
+-----------------+     +-----------------+     +-----------------+
```

### Libreria WebSocket: gorilla/websocket (servidor Go) + Socket.IO client (extension TS)

**En el servidor Go**: `gorilla/websocket` (https://github.com/gorilla/websocket)
- La libreria WS mas usada en Go (~22K estrellas, probada en produccion)
- Implementa el protocolo RFC 6455 completo
- Control explicito de read/write pumps por conexion (patron estandar Go)
- Rooms implementadas manualmente con un Hub central (`sync.RWMutex` + `map`)

**En el cliente (extension VS Code)**: `ws` npm package o `WebSocket` nativo de Node.js 21+
- El servidor Go habla WS nativo (RFC 6455), no Socket.IO protocol
- La extension usa `WebSocket` de Node.js con reconexion manual (simple loop con backoff)
- El webview React puede conectar directamente al servidor via `WebSocket` nativo del browser si se decide hacer una vista web standalone en el futuro

**Por que no Socket.IO en el servidor?**
- Los adaptadores Go para Socket.IO (como `googollee/go-socket.io`) estan desactualizados y no soportan Socket.IO v4
- WS nativo en Go es mas simple, mas rapido, y mas mantenible
- Las features de Socket.IO que necesitamos (rooms, reconexion, heartbeat) se implementan facilmente en Go con ~100 lineas de codigo

### Configuracion del Hub y Client Go

```go
// internal/ws/hub.go
type Hub struct {
    rooms      map[string]map[*Client]bool  // roomID -> set of clients
    register   chan *Client
    unregister chan *Client
    broadcast  chan RoomMessage
    mu         sync.RWMutex
}

type RoomMessage struct {
    RoomID  string
    Payload []byte
    Exclude *Client  // nil = broadcast to all in room
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            if h.rooms[client.RoomID] == nil {
                h.rooms[client.RoomID] = make(map[*Client]bool)
            }
            h.rooms[client.RoomID][client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            h.mu.Lock()
            if room, ok := h.rooms[client.RoomID]; ok {
                delete(room, client)
                if len(room) == 0 {
                    delete(h.rooms, client.RoomID)
                }
            }
            h.mu.Unlock()

        case msg := <-h.broadcast:
            h.mu.RLock()
            for client := range h.rooms[msg.RoomID] {
                if client != msg.Exclude {
                    select {
                    case client.send <- msg.Payload:
                    default:
                        // Buffer full: client too slow, disconnect
                        close(client.send)
                    }
                }
            }
            h.mu.RUnlock()
        }
    }
}
```

```go
// internal/ws/client.go
const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10  // ~54s
    maxMessageSize = 4096                  // bytes
)

type Client struct {
    hub    *Hub
    conn   *websocket.Conn
    send   chan []byte
    UserID string
    RoomID string
}

func (c *Client) ReadPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()
    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })
    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            break
        }
        // handle incoming event...
    }
}

func (c *Client) WritePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()
    for {
        select {
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            c.conn.WriteMessage(websocket.TextMessage, message)
        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

### Flujo de conexion

```
1. Extension arranca -> lee token de autenticacion de globalState
2. Si no hay token -> flujo OAuth/API key -> almacena en SecretStorage
3. Crea WebSocket client (ws npm package) con:
   - URL: wss://server/ws
   - Headers: Authorization: Bearer <token>
   - Reconexion manual con backoff exponencial (1s -> 30s)
   - Ping/pong handler para detectar conexion muerta
4. Servidor valida token en middleware
5. Servidor une al cliente a su room personal + room de sala
6. Servidor envia snapshot del estado actual de la sala
7. Cliente reconcilia estado local con snapshot
```

---

## 3. Protocolo de Mensajes

### 3.1 Eventos: Cliente VS Code -> Servidor

```typescript
// ── Autenticacion y presencia ───────────────────────────────
interface ClientAuth {
  event: 'auth';
  token: string;
  userId: string;
  workspaceId: string;  // hash del workspace (mismo que usa Claude para projectDir)
}

// ── Actividad de agentes (derivada del transcriptParser existente) ──
interface AgentActivityUpdate {
  event: 'agent:activity';
  agentLocalId: number;       // ID local del agente
  status: 'active' | 'waiting' | 'idle';
  currentTool?: string;       // nombre de la herramienta activa (Read, Edit, Bash, etc.)
  toolStatus?: string;        // descripcion corta (ej: "Editing main.ts")
  hasPermissionWait?: boolean; // true si el agente espera permiso del usuario
}

interface AgentLifecycle {
  event: 'agent:created' | 'agent:closed';
  agentLocalId: number;
  palette?: number;      // indice de skin (0-5)
  hueShift?: number;     // rotacion de tono
}

interface SubagentLifecycle {
  event: 'subagent:created' | 'subagent:closed';
  parentAgentLocalId: number;
  parentToolId: string;
  label?: string;
}

// ── Tokens y economia ────────────────────────────────────────
interface TokenReport {
  event: 'tokens:report';
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model: string;
  timestamp: number;       // epoch ms
}

// ── Sala y decoracion ────────────────────────────────────────
interface RoomAction {
  event: 'room:placeFurniture' | 'room:removeFurniture' | 'room:moveFurniture';
  furnitureType: string;
  position: { col: number; row: number };
  orientation?: string;
  color?: { h: number; s: number; b: number; c: number };
  uid?: string;             // para mover/remover
}

interface RoomLayoutSave {
  event: 'room:saveLayout';
  layout: object;           // OfficeLayout completo (solo para la sala propia)
}
```

### 3.2 Eventos: Servidor -> Cliente(s)

```typescript
// ── Estado de sala (al conectar o al unirse a una sala) ─────
interface RoomSnapshot {
  event: 'room:snapshot';
  roomId: string;
  owner: { userId: string; displayName: string };
  layout: object;             // OfficeLayout de la sala
  occupants: OccupantState[]; // todos los usuarios presentes con sus agentes
  economy: {
    ownerCoins: number;
    shopUnlocks: string[];    // IDs de muebles desbloqueados
  };
}

interface OccupantState {
  userId: string;
  displayName: string;
  agents: RemoteAgentState[];
}

interface RemoteAgentState {
  agentLocalId: number;
  palette: number;
  hueShift: number;
  seatId: string | null;
  status: 'active' | 'waiting' | 'idle';
  currentTool?: string;
  toolStatus?: string;
  hasPermissionWait?: boolean;
  subagents?: {
    parentToolId: string;
    label: string;
  }[];
}

// ── Eventos en tiempo real ──────────────────────────────────
interface RemoteAgentActivity {
  event: 'remote:agentActivity';
  userId: string;
  agentLocalId: number;
  status: 'active' | 'waiting' | 'idle';
  currentTool?: string;
  toolStatus?: string;
  hasPermissionWait?: boolean;
}

interface RemoteAgentLifecycle {
  event: 'remote:agentCreated' | 'remote:agentClosed';
  userId: string;
  agentLocalId: number;
  palette?: number;
  hueShift?: number;
}

interface RemoteSubagentLifecycle {
  event: 'remote:subagentCreated' | 'remote:subagentClosed';
  userId: string;
  parentAgentLocalId: number;
  parentToolId: string;
  label?: string;
}

// ── Economia ─────────────────────────────────────────────────
interface CoinsUpdate {
  event: 'economy:coinsUpdate';
  userId: string;
  totalCoins: number;
  delta: number;
  reason: string;  // "token_usage", "daily_bonus", "purchase"
}

interface PurchaseResult {
  event: 'economy:purchaseResult';
  success: boolean;
  itemId?: string;
  error?: string;
  remainingCoins?: number;
}

// ── Presencia ────────────────────────────────────────────────
interface UserPresence {
  event: 'presence:joined' | 'presence:left';
  userId: string;
  displayName: string;
  roomId: string;
}

// ── Sala ─────────────────────────────────────────────────────
interface RoomLayoutUpdate {
  event: 'room:layoutUpdate';
  userId: string;        // quien hizo el cambio
  layout: object;        // layout actualizado
}
```

### 3.3 Eventos: Webview del Juego (internos, via postMessage existente)

El webview sigue comunicandose con la extension via `postMessage`. La extension actua como **proxy bidireccional**:

```
Webview <--postMessage--> Extension <--WebSocket (gorilla)--> Servidor <--WebSocket--> Otras extensiones
```

Nuevos mensajes postMessage para el webview:

```typescript
// Extension -> Webview (nuevos)
{ type: 'remoteAgentCreated', userId: string, agentId: number, palette: number, hueShift: number }
{ type: 'remoteAgentClosed', userId: string, agentId: number }
{ type: 'remoteAgentActivity', userId: string, agentId: number, status: string, tool?: string }
{ type: 'roomSnapshot', roomId: string, occupants: OccupantState[], layout: object }
{ type: 'coinsUpdate', totalCoins: number, delta: number }
{ type: 'userJoined', userId: string, displayName: string }
{ type: 'userLeft', userId: string }

// Webview -> Extension (nuevos)
{ type: 'visitRoom', roomId: string }       // ir a ver la sala de otro usuario
{ type: 'returnToMyRoom' }                  // volver a la sala propia
{ type: 'purchaseItem', itemId: string }    // comprar mueble en la tienda
```

---

## 4. Optimizacion de WebSockets

### 4.1 Batching vs envio inmediato

**Estrategia hibrida:**

| Tipo de evento | Estrategia | Razon |
|---|---|---|
| `agent:activity` | **Throttle 500ms** | El transcriptParser emite muchos tool_use/tool_result por segundo. El receptor solo necesita el estado mas reciente |
| `agent:created/closed` | **Inmediato** | Eventos infrecuentes y criticos para la UI |
| `tokens:report` | **Batch cada 10s** | Los reportes de tokens son frecuentes y no necesitan ser en tiempo real |
| `room:saveLayout` | **Debounce 2s** | Ya se hace debounce en el codigo actual. Mantener la misma logica |
| `presence:joined/left` | **Inmediato** | Critico para la experiencia multiplayer |

Implementacion del throttle para actividad de agentes:

```typescript
// En el cliente (extension)
class AgentActivityThrottle {
  private pending = new Map<number, AgentActivityUpdate>();
  private timer: NodeJS.Timeout | null = null;

  queue(update: AgentActivityUpdate): void {
    // Siempre guardar el estado mas reciente por agente
    this.pending.set(update.agentLocalId, update);
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 500);
    }
  }

  private flush(): void {
    this.timer = null;
    for (const update of this.pending.values()) {
      socket.emit('agent:activity', update);
    }
    this.pending.clear();
  }
}
```

### 4.2 Compresion (permessage-deflate)

**No recomendada** para este caso de uso:

- Los mensajes son pequenos (< 500 bytes tipicamente). El overhead de compresion/descompresion supera el ahorro.
- `permessage-deflate` consume ~300KB de memoria por conexion (ventana de deflate). Con 100 usuarios = 30MB solo en compresion.
- Si en el futuro los mensajes crecen (ej: layouts completos), se puede activar selectivamente para esos eventos usando HTTP para transferencias grandes.

### 4.3 Heartbeat y reconexion

El servidor Go gestiona heartbeat via ping/pong nativo de RFC 6455 (patron gorilla estandar):
- Servidor envia ping cada ~54s (`pingPeriod = pongWait * 9 / 10`)
- Espera pong hasta 60s (`pongWait`)
- Si no llega pong, cierra la conexion (buffer full o cliente muerto)

Ver snippet `WritePump` / `ReadPump` en la seccion anterior.

### 4.4 Reconexion sin perder estado

**Estrategia de 2 capas** (sin Connection State Recovery de Socket.IO):

1. **Snapshot on reconnect**: Al reconectar, el servidor envia un `room:snapshot` completo. El cliente descarta su estado remoto y reconstruye desde el snapshot.

2. **Estado local siempre autoritativo**: El estado de los agentes **locales** del usuario (tool activity, waiting status) se mantiene en la extension independientemente del WS. Solo se re-emite al servidor al reconectar para que los demas lo vean.

```typescript
// En el cliente TS (extension VS Code) - reconexion manual
class TokenTownWsClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;

  connect() {
    this.ws = new WebSocket('wss://server/ws', {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    this.ws.on('open', () => {
      this.reconnectDelay = 1000; // reset backoff
      this.onConnected();
    });

    this.ws.on('close', () => {
      setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
        this.connect(); // reconnect with backoff
      }, this.reconnectDelay * (0.5 + Math.random())); // jitter
    });

    this.ws.on('message', (data) => this.handleMessage(JSON.parse(data.toString())));
  }

  private onConnected() {
    // Request full room snapshot since we can't rely on Connection State Recovery
    this.send({ event: 'room:requestSnapshot' });
    // Re-emit state of all local agents
    for (const [id, agent] of this.agents) {
      this.send(buildActivityUpdate(id, agent));
    }
  }
}
```

---

## 5. Escalabilidad (100+ usuarios)

### 5.1 Arquitectura de un solo servidor (< 500 usuarios)

Para la fase inicial, un solo proceso Go con `gorilla/websocket` es suficiente:

- Go maneja ~50K+ conexiones concurrentes en un servidor modesto (2 CPU, 4GB RAM) gracias a goroutines (~2KB cada una)
- Los mensajes son pequenos y la frecuencia es baja (throttled)
- El estado en memoria es ligero (~1KB por usuario)

### 5.2 Escalado horizontal (500+ usuarios)

```
                    +------------------+
                    |   Load Balancer  |
                    | (sticky sessions)|
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----v----+  +-----v----+  +-----v----+
        | Server 1 |  | Server 2 |  | Server 3 |
        | Go/gorilla|  | Go/gorilla|  | Go/gorilla|
        +-----+----+  +-----+----+  +-----+----+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v---------+
                    |   Redis Cluster   |
                    | (pub/sub + state) |
                    +------------------+
```

**Componentes:**

1. **Redis pub/sub con `go-redis`**: En lugar del hub in-memory, publicar eventos a Redis channel. Cada instancia suscribe al channel y reenvía a sus clientes locales:

```go
// En lugar del hub in-memory, publicar eventos a Redis channel
// Cada instancia suscribe al channel y reenvía a sus clientes locales
redisClient.Publish(ctx, "room:"+roomID, eventJSON)

// Suscriptor en cada instancia:
pubsub := redisClient.Subscribe(ctx, "room:"+roomID)
for msg := range pubsub.Channel() {
    hub.BroadcastLocal(roomID, []byte(msg.Payload))
}
```

2. **Sticky Sessions** (requerido para WS nativo):
   - El load balancer debe enviar todas las requests de un cliente al mismo servidor
   - Opciones: cookie-based (nginx `ip_hash` o `sticky` module), o usar solo WebSocket transport

3. **Redis para estado compartido**:
   ```
   tokentown:user:{userId}        -> hash { displayName, coins, roomId, ... }
   tokentown:room:{roomId}        -> hash { ownerId, layout (JSON), ... }
   tokentown:room:{roomId}:members -> set { userId1, userId2, ... }
   tokentown:economy:transactions  -> sorted set (auditoría)
   ```

4. **Base de datos persistente** (PostgreSQL):
   - Usuarios, inventarios, layouts guardados, historial de transacciones
   - Redis es cache/pub/sub, no fuente de verdad para datos duraderos

### 5.3 Optimizaciones para escala

| Tecnica | Detalle |
|---|---|
| **Room-scoped broadcast** | Solo emitir a la room donde ocurre el evento. Si un usuario esta en su sala y nadie lo visita, los eventos no viajan por la red |
| **Lazy room loading** | No cargar el layout de una sala hasta que alguien la visite |
| **Activity coalescing** | En el servidor, agrupar multiples `agent:activity` del mismo usuario en un solo broadcast por tick (100ms) |
| **Delta updates para layouts** | En vez de enviar el layout completo en `room:layoutUpdate`, enviar solo el diff (furniture added/removed/moved). Layout completo solo en snapshots |
| **Event filtering** | El webview solo necesita datos de los agentes visibles en pantalla. El servidor puede filtrar por room |

### 5.4 Limites y protecciones

```typescript
// Rate limiting por socket
const rateLimiter = {
  'agent:activity': { max: 10, windowMs: 1000 },  // 10 updates/s (post-throttle)
  'tokens:report': { max: 5, windowMs: 10000 },   // 5 reports/10s
  'room:saveLayout': { max: 2, windowMs: 5000 },  // 2 saves/5s
  'room:placeFurniture': { max: 10, windowMs: 1000 }, // 10 placements/s
};

// Maximo de conexiones por usuario: 5 (multi-window VS Code)
// Maximo de agentes por usuario: 20 (limite ya existente en la extension)
// Maximo de ocupantes por sala: 50 (para rendimiento del canvas)
```

---

## 6. Integracion con la Arquitectura Actual

### Donde conectar en el codigo existente

**1. Punto de emision de eventos (Extension backend):**

El lugar natural es `transcriptParser.ts` y `timerManager.ts`. Actualmente hacen:
```typescript
webview?.postMessage({ type: 'agentToolStart', id: agentId, toolId, status });
```

Se anade una capa de emision WS en paralelo:
```typescript
// En transcriptParser.ts, despues de cada webview?.postMessage(...)
wsClient?.emit('agent:activity', {
  agentLocalId: agentId,
  status: 'active',
  currentTool: toolName,
  toolStatus: status,
});
```

**2. Punto de recepcion de eventos remotos (Extension backend):**

El `PixelAgentsViewProvider` recibe eventos WS del servidor y los traduce a postMessage para el webview:
```typescript
// En PixelAgentsViewProvider.ts, despues de establecer conexion WS
wsClient.on('remote:agentActivity', (data) => {
  this.webview?.postMessage({
    type: 'remoteAgentActivity',
    userId: data.userId,
    agentId: data.agentLocalId,
    status: data.status,
    tool: data.currentTool,
  });
});
```

**3. Recepcion en el Webview:**

`useExtensionMessages.ts` se extiende con handlers para los nuevos mensajes `remote:*`:
```typescript
} else if (msg.type === 'remoteAgentActivity') {
  os.updateRemoteAgent(msg.userId, msg.agentId, msg.status, msg.tool);
}
```

### Compatibilidad hacia atras

- El sistema local (JSONL -> fileWatcher -> postMessage) sigue funcionando identico sin servidor
- WS es una capa **aditiva**: si no hay conexion al servidor, la extension funciona igual que ahora
- Feature flag: `tokentown.enableMultiplayer` en la configuracion de VS Code

---

## 7. Resumen de Decisiones

| Decision | Eleccion | Razon |
|---|---|---|
| Servidor | Go 1.22+ | Goroutines ligeras, alto throughput para WebSockets concurrentes |
| Libreria WS servidor | `gorilla/websocket` | Mas madura en Go, WS nativo RFC 6455, control explicito |
| Libreria WS cliente TS | `ws` npm o Node.js WebSocket nativo | El servidor Go habla WS nativo, no Socket.IO protocol |
| Rooms | Hub in-memory (Go `sync.RWMutex` + map) | Trivial en Go, sin dependencias externas en fase inicial |
| Reconexion cliente | Backoff exponencial manual (TS) | Sin Connection State Recovery, pero mas simple y Go-compatible |
| Snapshot on reconnect | Si, siempre al reconectar | Compensa la ausencia de Connection State Recovery |
| Compresion | No (permessage-deflate off) | Mensajes pequenos, overhead de memoria no justificado |
| Heartbeat | Ping 54s, pong timeout 60s (patron gorilla estandar) | Balance entre deteccion rapida y bajo overhead |
| Batching | Throttle 500ms actividad, debounce 2s layouts, batch 10s tokens | Mismo criterio: adaptar frecuencia a importancia del dato |
| Escalado | Redis pub/sub con `go-redis` | Mismo concepto que Socket.IO redis-adapter pero Go nativo |
| Protocolo | JSON sobre WS (no binario/protobuf) | Simplicidad y debuggabilidad en fase inicial |
