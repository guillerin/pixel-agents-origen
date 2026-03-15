import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface WsServerEvent {
  event: string;
  [key: string]: unknown;
}

export interface CoinsUpdateEvent extends WsServerEvent {
  event: 'economy:coinsUpdate';
  userId: string;
  newBalance: number;
  totalEarned: number;
}

export interface PresenceEvent extends WsServerEvent {
  event: 'presence:joined' | 'presence:left';
  userId: string;
  displayName: string;
}

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private auth = inject(AuthService);
  private ws: WebSocket | null = null;
  private reconnectDelay = RECONNECT_BASE_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private handlers = new Map<string, Set<(data: WsServerEvent) => void>>();

  readonly connected = signal(false);
  readonly onlineUsers = signal<Map<string, string>>(new Map());

  connect(): void {
    if (this.ws) return;
    this.intentionalClose = false;
    this.doConnect();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close(1000, 'client disconnect');
      this.ws = null;
    }
    this.connected.set(false);
    this.onlineUsers.set(new Map());
  }

  on(eventType: string, handler: (data: WsServerEvent) => void): () => void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.handlers.delete(eventType);
    };
  }

  send(event: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(event));
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.handlers.clear();
  }

  private doConnect(): void {
    if (!this.auth.isLoggedIn) {
      this.connectWithUrl(environment.wsUrl);
      return;
    }
    this.auth.getAccessToken().subscribe({
      next: (token) => {
        this.connectWithUrl(`${environment.wsUrl}?token=${encodeURIComponent(token)}`);
      },
      error: () => {
        this.connectWithUrl(environment.wsUrl);
      },
    });
  }

  private connectWithUrl(url: string): void {

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = RECONNECT_BASE_MS;
      this.connected.set(true);
    };

    this.ws.onmessage = (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data as string) as WsServerEvent;
        if (!data.event) return;

        if (data.event === 'presence:joined') {
          const e = data as PresenceEvent;
          this.onlineUsers.update(m => {
            const next = new Map(m);
            next.set(e.userId, e.displayName);
            return next;
          });
        } else if (data.event === 'presence:left') {
          const e = data as PresenceEvent;
          this.onlineUsers.update(m => {
            const next = new Map(m);
            next.delete(e.userId);
            return next;
          });
        }

        this.emit(data.event, data);
      } catch {
        // ignore non-JSON
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.connected.set(false);
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will follow
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const jittered = this.reconnectDelay * (0.5 + Math.random());
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
      this.doConnect();
    }, jittered);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emit(eventType: string, data: WsServerEvent): void {
    const specific = this.handlers.get(eventType);
    if (specific) {
      for (const handler of specific) {
        try { handler(data); } catch { /* ignore */ }
      }
    }
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) {
        try { handler(data); } catch { /* ignore */ }
      }
    }
  }
}
