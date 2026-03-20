/**
 * ShopModal - Main shop interface with product grid, cart, and inventory
 */

import { useEffect, useState } from 'react';

import type { ShopProduct, FurnitureCategorySlug } from '../types.js';
import { COIN_SYMBOL } from '../constants.js';
import { CategoryFilter } from './CategoryFilter.js';
import { ProductGrid } from './ProductGrid.js';
import { CartSidebar } from './CartSidebar.js';
import { PurchaseConfirmation } from './PurchaseConfirmation.js';
import { InventoryView } from './InventoryView.js';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ShopProduct[];
  selectedCategory: FurnitureCategorySlug | 'all';
  onSelectCategory: (category: FurnitureCategorySlug | 'all') => void;
  cart: any[];
  coins: number;
  isLoading: boolean;
  error: string | null;
  currentView: 'shop' | 'inventory';
  onSwitchView: (view: 'shop' | 'inventory') => void;
  inventory: any[];
  onAddToCart: (product: ShopProduct) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onPlaceInOffice: (productId: string) => void;
  isProcessingPurchase: boolean;
  purchaseResult: any;
  cartTotal: number;
  canAffordCart: boolean;
}

export function ShopModal({
  isOpen,
  onClose,
  products,
  selectedCategory,
  onSelectCategory,
  cart,
  coins,
  isLoading,
  error,
  currentView,
  onSwitchView,
  inventory,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartQuantity,
  onClearCart,
  onCheckout,
  onPlaceInOffice,
  isProcessingPurchase,
  purchaseResult,
  cartTotal,
  canAffordCart,
}: ShopModalProps) {
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPurchaseConfirm) {
          setShowPurchaseConfirm(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, showPurchaseConfirm, onClose]);

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    width: '90%',
    height: '85%',
    maxWidth: 1400,
    background: 'var(--pixel-bg)',
    border: '2px solid var(--pixel-border)',
    borderRadius: 0,
    boxShadow: 'var(--pixel-shadow)',
    overflow: 'hidden',
  };

  const mainAreaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '2px solid var(--pixel-border)',
    background: 'var(--pixel-bg)',
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const coinDisplayStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: '18px',
    color: 'var(--pixel-coin-text)',
    background: 'rgba(255, 215, 0, 0.1)',
    border: '2px solid var(--pixel-coin-border)',
    borderRadius: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '20px',
    color: 'var(--pixel-close-text)',
    background: 'transparent',
    border: '2px solid var(--pixel-border)',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  };

  const viewToggleStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
  };

  const viewButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    background: 'var(--pixel-btn-bg)',
    border: '2px solid transparent',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  };

  const activeViewButtonStyle: React.CSSProperties = {
    ...viewButtonStyle,
    background: 'var(--pixel-active-bg)',
    border: '2px solid var(--pixel-accent)',
    color: 'var(--pixel-accent)',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '20px',
    color: 'var(--pixel-text-dim)',
  };

  const errorStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    height: '100%',
    fontSize: '18px',
    color: 'var(--pixel-close-hover)',
  };

  const shopContentStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  };

  // Build cart items map for ProductGrid
  const cartItemsMap = new Map(cart.map((item) => [item.product.id, item.quantity]));

  // Build products map for InventoryView
  const productsMap = new Map(products.map((p) => [p.id, p]));

  const handleCheckout = () => {
    setShowPurchaseConfirm(true);
  };

  const handleConfirmPurchase = () => {
    setShowPurchaseConfirm(false);
    onCheckout();
  };

  const handleClosePurchaseConfirm = () => {
    setShowPurchaseConfirm(false);
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={mainAreaStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={headerLeftStyle}>
              <div style={titleStyle}>
                <span>🏪</span>
                <span>Furniture Shop</span>
              </div>
              <div style={coinDisplayStyle}>
                <span>{COIN_SYMBOL}</span>
                <span>{coins.toLocaleString()}</span>
              </div>
            </div>
            <div style={headerLeftStyle}>
              <div style={viewToggleStyle}>
                <button
                  style={currentView === 'shop' ? activeViewButtonStyle : viewButtonStyle}
                  onClick={() => onSwitchView('shop')}
                >
                  Shop
                </button>
                <button
                  style={currentView === 'inventory' ? activeViewButtonStyle : viewButtonStyle}
                  onClick={() => onSwitchView('inventory')}
                >
                  Inventory
                </button>
              </div>
              <button
                style={closeButtonStyle}
                onClick={onClose}
                title="Close shop (ESC)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div style={loadingStyle}>Loading shop...</div>
          ) : error ? (
            <div style={errorStyle}>
              <div>⚠️</div>
              <div>{error}</div>
            </div>
          ) : currentView === 'shop' ? (
            <>
              <CategoryFilter
                categories={['desks', 'chairs', 'storage', 'decor', 'electronics', 'wall', 'misc'] as FurnitureCategorySlug[]}
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
              />
              <div style={shopContentStyle}>
                <ProductGrid
                  products={products}
                  onAddToCart={onAddToCart}
                  cartItems={cartItemsMap}
                  coins={coins}
                />
                <CartSidebar
                  cart={cart}
                  cartTotal={cartTotal}
                  coins={coins}
                  canAffordCart={canAffordCart}
                  onRemoveItem={onRemoveFromCart}
                  onUpdateQuantity={onUpdateCartQuantity}
                  onCheckout={handleCheckout}
                  isProcessingPurchase={isProcessingPurchase}
                  onClearCart={onClearCart}
                />
              </div>
            </>
          ) : (
            <InventoryView
              inventory={inventory}
              productsMap={productsMap}
              onPlaceInOffice={onPlaceInOffice}
            />
          )}
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {showPurchaseConfirm && (
        <PurchaseConfirmation
          cart={cart}
          cartTotal={cartTotal}
          coins={coins}
          isProcessingPurchase={isProcessingPurchase}
          purchaseResult={purchaseResult}
          onConfirm={handleConfirmPurchase}
          onCancel={handleClosePurchaseConfirm}
        />
      )}
    </div>
  );
}
