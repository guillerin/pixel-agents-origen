/**
 * useInventory — User inventory state hook
 *
 * Manages the user's owned furniture items, fetching inventory from the server
 * via postMessage and exposing filtered/sorted views.
 */

import { useCallback, useEffect, useState } from 'react';

import type { UserInventoryItem, ShopProduct } from '../shop/types.js';
import { SHOP_CLIENT_EVENTS, SHOP_SERVER_EVENTS } from '../shop/constants.js';
import { vscode } from '../vscodeApi.js';

interface UseInventoryReturn {
  inventory: UserInventoryItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  getProductForItem: (item: UserInventoryItem, products: ShopProduct[]) => ShopProduct | undefined;
}

export function useInventory(): UseInventoryReturn {
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    vscode.postMessage({ type: SHOP_CLIENT_EVENTS.GET_INVENTORY });
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === SHOP_SERVER_EVENTS.INVENTORY) {
        setInventory(msg.payload?.items ?? msg.inventory ?? []);
        setIsLoading(false);
      } else if (msg.type === SHOP_SERVER_EVENTS.ERROR) {
        setError(msg.payload?.message ?? msg.error ?? 'Unknown error');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const getProductForItem = useCallback(
    (item: UserInventoryItem, products: ShopProduct[]) =>
      products.find((p) => p.id === item.productId),
    [],
  );

  return { inventory, isLoading, error, refresh, getProductForItem };
}
