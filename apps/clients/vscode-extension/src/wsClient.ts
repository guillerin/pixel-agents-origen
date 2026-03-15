import type { ClientEventType, ServerEventType } from '@token-town/shared';
import * as vscode from 'vscode';
import WebSocket from 'ws';

import {
  WS_AUTH_SECRET_KEY,
  WS_DEFAULT_SERVER_URL,
  WS_RECONNECT_BASE_DELAY_MS,
  WS_RECONNECT_MAX_DELAY_MS,
} from './constants.js';

// ── Types ────────────────────────────────────────────────────

export interface WsClientEvent {
  event: ClientEventType;
  [key: string]: unknown;
}

export interface WsServerEvent {
  event: ServerEventType;
  [key: string]: unknown;
}

export type ServerEventHandler = (data: WsServerEvent) => void;

const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
} as const;
type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

// ── Client ───────────────────────────────────────────────────

export class TokenTownWsClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectDelay = WS_RECONNECT_BASE_DELAY_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private handlers = new Map<string, Set<ServerEventHandler>>();
  private sessionToken: string | null = null;
  private serverUrl: string;

  private readonly onStateChange = new vscode.EventEmitter<ConnectionState>();
  /** Fires when the connection state changes. */
  readonly onDidChangeState = this.onStateChange.event;

  constructor(private readonly secrets: vscode.SecretStorage) {
    this.serverUrl = this.getServerUrl();
  }

  // ── Public API ───────────────────────────────────────────

  /** Start connecting to the game server. */
  async connect(): Promise<void> {
    if (this.state !== ConnectionState.DISCONNECTED) return;

    // Restore persisted session token
    this.sessionToken = (await this.secrets.get(WS_AUTH_SECRET_KEY)) ?? null;

    this.intentionalClose = false;
    this.doConnect();
  }

  /** Gracefully disconnect and stop reconnection attempts. */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close(1000, 'client disconnect');
      this.ws = null;
    }
    this.setState(ConnectionState.DISCONNECTED);
  }

  /** Send a typed event to the server. Silently drops if not connected. */
  send(event: WsClientEvent): void {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) return;
    try {
      this.ws.send(JSON.stringify(event));
    } catch (err) {
      console.error('[WsClient] send error:', err);
    }
  }

  /** Register a handler for a specific server event type. Returns a disposable. */
  on(eventType: string, handler: ServerEventHandler): vscode.Disposable {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
    return new vscode.Disposable(() => {
      set!.delete(handler);
      if (set!.size === 0) this.handlers.delete(eventType);
    });
  }

  /** Store/update the session token (e.g. after auth registration). */
  async setSessionToken(token: string): Promise<void> {
    this.sessionToken = token;
    await this.secrets.store(WS_AUTH_SECRET_KEY, token);
  }

  /** Whether the client is currently connected. */
  get isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /** Clean up all resources. */
  dispose(): void {
    this.disconnect();
    this.handlers.clear();
    this.onStateChange.dispose();
  }

  // ── Private ──────────────────────────────────────────────

  private getServerUrl(): string {
    const config = vscode.workspace.getConfiguration('pixelAgents');
    return config.get<string>('serverUrl') || WS_DEFAULT_SERVER_URL;
  }

  private doConnect(): void {
    this.setState(ConnectionState.CONNECTING);
    this.serverUrl = this.getServerUrl();

    const headers: Record<string, string> = {};
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    try {
      this.ws = new WebSocket(this.serverUrl, { headers });
    } catch (err) {
      console.error('[WsClient] WebSocket constructor error:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log('[WsClient] connected to', this.serverUrl);
      this.reconnectDelay = WS_RECONNECT_BASE_DELAY_MS;
      this.setState(ConnectionState.CONNECTED);
      this.emitLocal('_connected', { event: '_connected' as ServerEventType });
    });

    this.ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString()) as WsServerEvent;
        if (data.event) {
          this.emitLocal(data.event, data);
        }
      } catch {
        // Ignore non-JSON messages
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[WsClient] closed: ${code} ${reason.toString()}`);
      this.ws = null;
      this.setState(ConnectionState.DISCONNECTED);
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[WsClient] error:', err.message);
      // 'close' event will follow, triggering reconnect
    });

    // The server sends pings; we just need the ws library to auto-respond with pong
    // (which it does by default). No manual ping needed from client side.
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    // Jitter: delay * (0.5 + random) gives range [delay*0.5, delay*1.5]
    const jitteredDelay = this.reconnectDelay * (0.5 + Math.random());
    console.log(`[WsClient] reconnecting in ${Math.round(jitteredDelay)}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_RECONNECT_MAX_DELAY_MS);
      this.doConnect();
    }, jitteredDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange.fire(newState);
  }

  private emitLocal(eventType: string, data: WsServerEvent): void {
    // Fire specific handlers
    const specific = this.handlers.get(eventType);
    if (specific) {
      for (const handler of specific) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[WsClient] handler error for '${eventType}':`, err);
        }
      }
    }
    // Fire wildcard handlers
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[WsClient] wildcard handler error:`, err);
        }
      }
    }
  }
}
