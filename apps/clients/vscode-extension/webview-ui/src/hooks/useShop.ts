/**
 * useShop — Shop state and WebSocket communication hook
 *
 * Thin re-export of useShopState so the canonical location matches the
 * requested file layout (hooks/useShop.ts).  The full implementation lives in
 * shop/useShopState.ts to keep shop logic co-located with shop types.
 */

export { useShopState as useShop } from '../shop/useShopState.js';
export type { ShopProduct, CartItem, UserInventoryItem, PurchaseResult, ShopState } from '../shop/types.js';
