/**
 * Shop relay: bridges webview postMessage ↔ WebSocket server for all shop events.
 *
 * Webview → WS server: shop:getCatalog, shop:getInventory, shop:purchase,
 *   shop:getPlacements, shop:updatePlacements, shop:removePlacement
 *
 * WS server → Webview: shop:catalog, shop:inventory, shop:purchaseResult,
 *   shop:placements, shop:placementsUpdated, shop:balanceUpdate, shop:error
 */

import type { ClientEventType, ShopServerEvent } from '@token-town/shared';
import type * as vscode from 'vscode';

import type { TokenTownWsClient, WsServerEvent } from './wsClient.js';

// Event name constants — kept in sync with @token-town/shared ShopClientEvent / ShopServerEvent
export const SHOP_CLIENT_EVENTS = {
  GET_CATALOG: 'shop:getCatalog',
  GET_INVENTORY: 'shop:getInventory',
  PURCHASE: 'shop:purchase',
  GET_PLACEMENTS: 'shop:getPlacements',
  UPDATE_PLACEMENTS: 'shop:updatePlacements',
  REMOVE_PLACEMENT: 'shop:removePlacement',
} as const;

export const SHOP_SERVER_EVENTS = {
  CATALOG: 'shop:catalog',
  INVENTORY: 'shop:inventory',
  PURCHASE_RESULT: 'shop:purchaseResult',
  PLACEMENTS: 'shop:placements',
  PLACEMENTS_UPDATED: 'shop:placementsUpdated',
  BALANCE_UPDATE: 'shop:balanceUpdate',
  ERROR: 'shop:error',
} as const satisfies Record<string, ShopServerEvent>;

// ── ShopRelay ─────────────────────────────────────────────────

export class ShopRelay {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly wsClient: TokenTownWsClient,
    private readonly postToWebview: (message: unknown) => void,
  ) {}

  /**
   * Handle a message arriving from the webview.
   * Returns true if the message was a shop event (consumed), false otherwise.
   */
  handleWebviewMessage(message: { type: string; payload?: unknown; [key: string]: unknown }): boolean {
    const { type } = message;

    // WsClientEvent.event is typed as ClientEventType; shop events extend the protocol
    // but are not (yet) included in that union — cast to avoid the type mismatch.
    const asClientEvent = type as ClientEventType;

    switch (type) {
      case SHOP_CLIENT_EVENTS.GET_CATALOG:
        this.wsClient.send({ event: asClientEvent });
        return true;

      case SHOP_CLIENT_EVENTS.GET_INVENTORY:
        this.wsClient.send({ event: asClientEvent });
        return true;

      case SHOP_CLIENT_EVENTS.PURCHASE:
        this.wsClient.send({ event: asClientEvent, payload: message.payload ?? {} });
        return true;

      case SHOP_CLIENT_EVENTS.GET_PLACEMENTS:
        this.wsClient.send({ event: asClientEvent });
        return true;

      case SHOP_CLIENT_EVENTS.UPDATE_PLACEMENTS:
        this.wsClient.send({ event: asClientEvent, payload: message.payload ?? {} });
        return true;

      case SHOP_CLIENT_EVENTS.REMOVE_PLACEMENT:
        this.wsClient.send({ event: asClientEvent, payload: message.payload ?? {} });
        return true;

      default:
        return false;
    }
  }

  /**
   * Register WS → webview relay handlers.
   * Call once after construction. Returns disposables automatically tracked internally.
   */
  startListening(): void {
    const serverEvents: ShopServerEvent[] = [
      SHOP_SERVER_EVENTS.CATALOG,
      SHOP_SERVER_EVENTS.INVENTORY,
      SHOP_SERVER_EVENTS.PURCHASE_RESULT,
      SHOP_SERVER_EVENTS.PLACEMENTS,
      SHOP_SERVER_EVENTS.PLACEMENTS_UPDATED,
      SHOP_SERVER_EVENTS.BALANCE_UPDATE,
      SHOP_SERVER_EVENTS.ERROR,
    ];

    for (const eventName of serverEvents) {
      const disposable = this.wsClient.on(eventName, (data: WsServerEvent) => {
        // Forward to webview: strip the WS `event` field, use `type` instead
        const { event: _event, ...rest } = data;
        this.postToWebview({ type: eventName, ...rest });
      });
      this.disposables.push(disposable);
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }
}
