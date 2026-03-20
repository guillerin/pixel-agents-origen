/**
 * CartSidebar component for displaying cart items and checkout
 */

import type { CartItem } from '../types.js';
import { COIN_SYMBOL } from '../constants.js';

interface CartSidebarProps {
  cart: CartItem[];
  cartTotal: number;
  coins: number;
  canAffordCart: boolean;
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onCheckout: () => void;
  isProcessingPurchase: boolean;
  onClearCart: () => void;
}

export function CartSidebar({
  cart,
  cartTotal,
  coins,
  canAffordCart,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  isProcessingPurchase,
  onClearCart,
}: CartSidebarProps) {
  const sidebarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: 320,
    background: 'var(--pixel-bg)',
    borderLeft: '2px solid var(--pixel-border)',
    boxShadow: '-2px 0 0px #0a0a14',
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '2px solid var(--pixel-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
  };

  const clearButtonStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '14px',
    color: 'var(--pixel-close-hover)',
    background: 'transparent',
    border: '1px solid var(--pixel-close-hover)',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  };

  const itemsContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  };

  const cartItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: 12,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--pixel-border-light)',
    borderRadius: 0,
    marginBottom: 12,
  };

  const itemImageStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--pixel-border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  };

  const itemDetailsStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const itemNameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const itemPriceStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--pixel-coin-text)',
  };

  const itemControlsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const quantityButtonStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    padding: 0,
    fontSize: '16px',
    color: 'var(--pixel-text)',
    background: 'var(--pixel-btn-bg)',
    border: '1px solid var(--pixel-border)',
    borderRadius: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const quantityStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--pixel-text)',
    minWidth: 20,
    textAlign: 'center',
  };

  const removeButtonStyle: React.CSSProperties = {
    padding: '2px 6px',
    fontSize: '12px',
    color: 'var(--pixel-close-hover)',
    background: 'transparent',
    border: '1px solid var(--pixel-close-hover)',
    borderRadius: 0,
    cursor: 'pointer',
    marginLeft: 'auto',
  };

  const footerStyle: React.CSSProperties = {
    padding: '16px',
    borderTop: '2px solid var(--pixel-border)',
    background: 'rgba(255, 255, 255, 0.02)',
  };

  const balanceStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: '14px',
    color: 'var(--pixel-text-dim)',
  };

  const totalStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
  };

  const checkoutButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: canAffordCart ? 'var(--pixel-agent-text)' : 'var(--pixel-text-dim)',
    background: canAffordCart ? 'var(--pixel-agent-bg)' : 'var(--pixel-btn-bg)',
    border: `2px solid ${canAffordCart ? 'var(--pixel-agent-border)' : 'var(--pixel-border)'}`,
    borderRadius: 0,
    cursor: canAffordCart && !isProcessingPurchase ? 'pointer' : 'not-allowed',
    opacity: isProcessingPurchase ? 0.6 : 1,
    transition: 'all 0.15s ease-out',
  };

  const emptyCartStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
    color: 'var(--pixel-text-dim)',
    textAlign: 'center',
    height: '100%',
  };

  const emptyCartIconStyle: React.CSSProperties = {
    fontSize: '48px',
    opacity: 0.5,
  };

  if (cart.length === 0) {
    return (
      <div style={sidebarStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Cart</div>
        </div>
        <div style={emptyCartStyle}>
          <div style={emptyCartIconStyle}>🛒</div>
          <div style={{ fontSize: '16px' }}>Your cart is empty</div>
        </div>
      </div>
    );
  }

  return (
    <div style={sidebarStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</div>
        <button
          style={clearButtonStyle}
          onClick={onClearCart}
          title="Clear cart"
        >
          Clear
        </button>
      </div>

      <div style={itemsContainerStyle}>
        {cart.map((item) => (
          <div key={item.product.id} style={cartItemStyle}>
            <div style={itemImageStyle}>
              📦
            </div>
            <div style={itemDetailsStyle}>
              <div style={itemNameStyle} title={item.product.name}>
                {item.product.name}
              </div>
              <div style={itemPriceStyle}>
                {COIN_SYMBOL} {item.product.price.toLocaleString()}
              </div>
              <div style={itemControlsStyle}>
                <button
                  style={quantityButtonStyle}
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <div style={quantityStyle}>{item.quantity}</div>
                <button
                  style={quantityButtonStyle}
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= 99}
                >
                  +
                </button>
                <button
                  style={removeButtonStyle}
                  onClick={() => onRemoveItem(item.product.id)}
                  title="Remove from cart"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={footerStyle}>
        <div style={balanceStyle}>
          <span>Your balance:</span>
          <span>
            {COIN_SYMBOL} {coins.toLocaleString()}
          </span>
        </div>
        <div style={totalStyle}>
          <span>Total:</span>
          <span style={{ color: canAffordCart ? 'var(--pixel-coin-text)' : 'var(--pixel-close-hover)' }}>
            {COIN_SYMBOL} {cartTotal.toLocaleString()}
          </span>
        </div>
        <button
          style={checkoutButtonStyle}
          onClick={onCheckout}
          disabled={!canAffordCart || isProcessingPurchase}
        >
          {isProcessingPurchase ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    </div>
  );
}
