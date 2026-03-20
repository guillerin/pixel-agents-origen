/**
 * Shop state management hook
 * Handles shop data, cart, inventory, and WebSocket communication
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  FurnitureCategorySlug,
  ShopProduct,
  ShopState,
  PurchaseResult,
} from './types.js';
import { SHOP_CLIENT_EVENTS, SHOP_SERVER_EVENTS } from './constants.js';
import { vscode } from '../vscodeApi.js';

// Raw shape from the Go server (ShopProductItem) — field names differ from local ShopProduct
interface RawServerProduct {
  id: string;
  name: string;
  description?: string;
  priceCoins?: number;
  price?: number;        // fallback if server ever normalizes
  categoryId?: string;
  category?: string;     // fallback
  spriteUrl?: string;
  sprite?: string;       // fallback
  width?: number;
  height?: number;
  footprintW?: number;   // fallback
  footprintH?: number;   // fallback
  isDesk?: boolean;
  canPlaceOnWalls?: boolean;
}

interface UseShopStateOptions {
  initialCoins: number | null;
  onPlaceInOffice?: (productId: string) => void;
}

export function useShopState({ initialCoins, onPlaceInOffice }: UseShopStateOptions) {
  const [shopState, setShopState] = useState<ShopState>({
    isOpen: false,
    products: [],
    categories: ['desks', 'chairs', 'storage', 'decor', 'electronics', 'wall', 'misc'],
    selectedCategory: 'all',
    cart: [],
    inventory: [],
    coins: initialCoins ?? 0,
    isLoading: false,
    error: null,
    currentView: 'shop',
    selectedInventoryItem: null,
  });

  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

  // Open shop
  const openShop = useCallback(() => {
    setShopState((prev) => ({ ...prev, isOpen: true, currentView: 'shop', isLoading: true }));
    vscode.postMessage({ type: SHOP_CLIENT_EVENTS.GET_CATALOG });
    vscode.postMessage({ type: SHOP_CLIENT_EVENTS.GET_INVENTORY });
  }, []);

  // Close shop
  const closeShop = useCallback(() => {
    setShopState((prev) => ({ ...prev, isOpen: false }));
    setPurchaseResult(null);
  }, []);

  // Switch view
  const switchView = useCallback((view: 'shop' | 'inventory') => {
    setShopState((prev) => ({ ...prev, currentView: view }));
  }, []);

  // Select category
  const selectCategory = useCallback((category: typeof shopState.selectedCategory) => {
    setShopState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  // Add to cart
  const addToCart = useCallback((product: ShopProduct) => {
    setShopState((prev) => {
      const existingItem = prev.cart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return {
          ...prev,
          cart: prev.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { ...prev, cart: [...prev.cart, { product, quantity: 1 }] };
    });
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((productId: string) => {
    setShopState((prev) => ({
      ...prev,
      cart: prev.cart.filter((item) => item.product.id !== productId),
    }));
  }, []);

  // Update cart quantity
  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setShopState((prev) => ({
      ...prev,
      cart: prev.cart
        .map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0),
    }));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setShopState((prev) => ({ ...prev, cart: [] }));
  }, []);

  // Calculate cart total
  const cartTotal = shopState.cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Purchase items — server expects one shop:purchase message per product
  const purchaseItems = useCallback(async () => {
    if (shopState.cart.length === 0) return;
    if (cartTotal > shopState.coins) {
      setPurchaseResult({
        success: false,
        message: 'Insufficient coins',
      });
      return;
    }

    setIsProcessingPurchase(true);
    // Send one purchase event per cart item (server protocol: productId + quantity)
    for (const item of shopState.cart) {
      vscode.postMessage({
        type: SHOP_CLIENT_EVENTS.PURCHASE,
        payload: {
          productId: item.product.id,
          quantity: item.quantity,
        },
      });
    }
  }, [shopState.cart, shopState.coins, cartTotal]);

  // Place item in office — local VS Code action (not a server event)
  const placeInOffice = useCallback(
    (productId: string) => {
      if (onPlaceInOffice) {
        onPlaceInOffice(productId);
      } else {
        vscode.postMessage({ type: 'placeInOffice', productId });
      }
      closeShop();
    },
    [onPlaceInOffice, closeShop]
  );

  // Handle messages from the extension backend (relayed from Go WebSocket server)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;

      switch (msg.type) {
        // shop:catalog — server sends { products: ShopProductItem[], total: number }
        // ShopProductItem uses priceCoins/width/height; map to local ShopProduct shape
        case SHOP_SERVER_EVENTS.CATALOG: {
          const rawProducts: RawServerProduct[] = msg.payload?.products ?? msg.products ?? [];
          const products: ShopProduct[] = rawProducts.map((raw) => ({
            id: raw.id,
            name: raw.name,
            description: raw.description ?? '',
            price: raw.priceCoins ?? raw.price ?? 0,
            category: (raw.categoryId ?? raw.category ?? 'misc') as FurnitureCategorySlug,
            sprite: raw.spriteUrl ?? raw.sprite ?? '',
            footprintW: raw.width ?? raw.footprintW ?? 1,
            footprintH: raw.height ?? raw.footprintH ?? 1,
            isDesk: raw.isDesk ?? false,
            canPlaceOnWalls: raw.canPlaceOnWalls ?? false,
          }));
          setShopState((prev) => ({ ...prev, products, isLoading: false }));
          break;
        }

        // shop:inventory — server sends { items: ShopInventoryItem[], total, totalValue }
        case SHOP_SERVER_EVENTS.INVENTORY: {
          const items = msg.payload?.items ?? msg.inventory ?? [];
          setShopState((prev) => ({ ...prev, inventory: items }));
          break;
        }

        // shop:purchaseResult — server sends ShopPurchaseResultPayload
        case SHOP_SERVER_EVENTS.PURCHASE_RESULT: {
          const payload = msg.payload ?? msg.result ?? msg;
          const result: PurchaseResult = {
            success: payload.success ?? false,
            message: payload.error ?? (payload.success ? 'Purchase successful!' : 'Purchase failed'),
            newCoinBalance: payload.remainingBalance,
            purchasedItems: (payload.items ?? []).map((i: { productId: string }) => i.productId),
          };
          setPurchaseResult(result);
          setIsProcessingPurchase(false);

          if (result.success) {
            setShopState((prev) => ({
              ...prev,
              cart: [],
              coins: result.newCoinBalance ?? prev.coins,
            }));
            // Refresh inventory after successful purchase
            vscode.postMessage({ type: SHOP_CLIENT_EVENTS.GET_INVENTORY });
          }
          break;
        }

        // shop:balanceUpdate — broadcast after purchase (balance: number)
        case SHOP_SERVER_EVENTS.BALANCE_UPDATE: {
          const balance = msg.payload?.balance ?? msg.payload?.totalCoins ?? msg.coins;
          if (typeof balance === 'number') {
            setShopState((prev) => ({ ...prev, coins: balance }));
          }
          break;
        }

        // shop:error — server sends { code, message }
        case SHOP_SERVER_EVENTS.ERROR: {
          const errorMsg = msg.payload?.message ?? msg.error ?? 'An error occurred';
          setShopState((prev) => ({ ...prev, error: errorMsg, isLoading: false }));
          setIsProcessingPurchase(false);
          break;
        }

        // coinsUpdate — legacy event from useExtensionMessages (economy:coinsUpdate relay)
        case 'coinsUpdate': {
          const coins = msg.coins as number;
          if (typeof coins === 'number') {
            setShopState((prev) => ({ ...prev, coins }));
          }
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Filter products by category
  const filteredProducts = shopState.products.filter((product) => {
    if (shopState.selectedCategory === 'all') return true;
    return product.category === shopState.selectedCategory;
  });

  return {
    // State
    shopState,
    filteredProducts,
    purchaseResult,
    isProcessingPurchase,
    cartTotal,

    // Actions
    openShop,
    closeShop,
    switchView,
    selectCategory,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    purchaseItems,
    placeInOffice,

    // Computed
    canAffordCart: cartTotal <= shopState.coins,
    cartItemCount: shopState.cart.reduce((sum, item) => sum + item.quantity, 0),
  };
}
