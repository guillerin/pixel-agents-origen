/**
 * Shop-related constants
 *
 * Event string values below mirror packages/shared/src/index.ts (ShopClientEvent /
 * ShopServerEvent). The webview is a standalone Vite project without access to the
 * yarn workspace, so we can't import from @token-town/shared directly. Keep these
 * strings in sync with the shared package manually.
 */

import type { FurnitureCategorySlug } from './types.js';

export const SHOP_CATEGORIES: FurnitureCategorySlug[] = [
  'desks',
  'chairs',
  'storage',
  'decor',
  'electronics',
  'wall',
  'misc',
];

export const CATEGORY_LABELS: Record<FurnitureCategorySlug | 'all', string> = {
  all: 'All Items',
  desks: 'Desks',
  chairs: 'Chairs',
  storage: 'Storage',
  decor: 'Decor',
  electronics: 'Electronics',
  wall: 'Wall Items',
  misc: 'Misc',
};

export const CATEGORY_ICONS: Record<FurnitureCategorySlug | 'all', string> = {
  all: '🏪',
  desks: '🪑',
  chairs: '💺',
  storage: '📦',
  decor: '🖼️',
  electronics: '💻',
  wall: '🪟',
  misc: '📌',
};

// Animation durations (ms)
export const SHOP_MODAL_ANIMATION_DURATION = 200;
export const PURCHASE_SUCCESS_DISPLAY_DURATION = 2000;
export const TOAST_NOTIFICATION_DURATION = 3000;

// Grid settings
export const PRODUCT_GRID_MIN_WIDTH = 180;
export const PRODUCT_GRID_MAX_WIDTH = 280;
export const PRODUCT_GRID_GAP = 12;

// Coin formatting
export const COIN_SYMBOL = '🪙';
export const LARGE_NUMBER_THRESHOLD = 10000;
export const LARGE_NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T'];

// ─── WebSocket event names ────────────────────────────────────────────────────
// Source of truth: packages/shared/src/index.ts — ShopClientEvent / ShopServerEvent
// These string values MUST stay in sync with that file and with Go ws/events.go.

// Client → Server
export const SHOP_CLIENT_EVENTS = {
  GET_CATALOG:        'shop:getCatalog',
  GET_INVENTORY:      'shop:getInventory',
  PURCHASE:           'shop:purchase',
  GET_PLACEMENTS:     'shop:getPlacements',
  UPDATE_PLACEMENTS:  'shop:updatePlacements',
  REMOVE_PLACEMENT:   'shop:removePlacement',
} as const;

// Server → Client
export const SHOP_SERVER_EVENTS = {
  CATALOG:            'shop:catalog',
  INVENTORY:          'shop:inventory',
  PURCHASE_RESULT:    'shop:purchaseResult',
  PLACEMENTS:         'shop:placements',
  PLACEMENTS_UPDATED: 'shop:placementsUpdated',
  BALANCE_UPDATE:     'shop:balanceUpdate',
  ERROR:              'shop:error',
} as const;
