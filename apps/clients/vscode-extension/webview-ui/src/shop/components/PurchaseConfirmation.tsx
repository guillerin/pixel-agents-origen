/**
 * PurchaseConfirmation component for confirming purchases
 */

import type { CartItem, PurchaseResult } from '../types.js';
import { COIN_SYMBOL } from '../constants.js';

interface PurchaseConfirmationProps {
  cart: CartItem[];
  cartTotal: number;
  coins: number;
  isProcessingPurchase: boolean;
  purchaseResult: PurchaseResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PurchaseConfirmation({
  cart,
  cartTotal,
  coins,
  isProcessingPurchase,
  purchaseResult,
  onConfirm,
  onCancel,
}: PurchaseConfirmationProps) {
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--pixel-bg)',
    border: '2px solid var(--pixel-border)',
    borderRadius: 0,
    padding: '24px',
    maxWidth: 480,
    width: '90%',
    boxShadow: 'var(--pixel-shadow)',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    marginBottom: 16,
    textAlign: 'center',
  };

  const itemsListStyle: React.CSSProperties = {
    maxHeight: 200,
    overflowY: 'auto',
    marginBottom: 16,
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--pixel-border-light)',
    borderRadius: 0,
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--pixel-border-light)',
  };

  const itemStyleLast: React.CSSProperties = {
    ...itemStyle,
    borderBottom: 'none',
  };

  const itemNameStyle: React.CSSProperties = {
    fontSize: '16px',
    color: 'var(--pixel-text)',
  };

  const itemPriceStyle: React.CSSProperties = {
    fontSize: '16px',
    color: 'var(--pixel-coin-text)',
    fontWeight: 'bold',
  };

  const summaryStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: '16px',
    color: 'var(--pixel-text-dim)',
  };

  const totalStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
  };

  const balanceStyle: React.CSSProperties = {
    ...summaryStyle,
    marginBottom: 20,
    fontSize: '14px',
    color: coins >= cartTotal ? 'var(--pixel-green)' : 'var(--pixel-close-hover)',
  };

  const buttonsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
  };

  const buttonBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    fontSize: '18px',
    fontWeight: 'bold',
    border: '2px solid',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  };

  const confirmButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    color: 'var(--pixel-agent-text)',
    background: 'var(--pixel-agent-bg)',
    border: '2px solid var(--pixel-agent-border)',
    opacity: isProcessingPurchase ? 0.6 : 1,
  };

  const cancelButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    color: 'var(--pixel-text)',
    background: 'var(--pixel-btn-bg)',
    border: '2px solid var(--pixel-border)',
  };

  const successMessageStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 16,
  };

  const successIconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: 12,
  };

  const successTextStyle: React.CSSProperties = {
    fontSize: '18px',
    color: 'var(--pixel-green)',
    fontWeight: 'bold',
    marginBottom: 8,
  };

  const errorIconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: 12,
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: '18px',
    color: 'var(--pixel-close-hover)',
    fontWeight: 'bold',
    marginBottom: 8,
  };

  if (purchaseResult?.success) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={successMessageStyle}>
            <div style={successIconStyle}>✅</div>
            <div style={successTextStyle}>Purchase Successful!</div>
            <div style={{ fontSize: '14px', color: 'var(--pixel-text-dim)' }}>
              {purchaseResult.message}
            </div>
          </div>
          <button
            style={confirmButtonStyle}
            onClick={onCancel}
            disabled={isProcessingPurchase}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (purchaseResult && !purchaseResult.success) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={errorIconStyle}>❌</div>
            <div style={errorTextStyle}>Purchase Failed</div>
            <div style={{ fontSize: '14px', color: 'var(--pixel-text-dim)' }}>
              {purchaseResult.message}
            </div>
          </div>
          <button
            style={confirmButtonStyle}
            onClick={onCancel}
            disabled={isProcessingPurchase}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>Confirm Purchase</div>

        <div style={itemsListStyle}>
          {cart.map((item, index) => (
            <div
              key={item.product.id}
              style={index === cart.length - 1 ? itemStyleLast : itemStyle}
            >
              <div style={itemNameStyle}>
                {item.product.name}
                {item.quantity > 1 && <span> × {item.quantity}</span>}
              </div>
              <div style={itemPriceStyle}>
                {COIN_SYMBOL} {(item.product.price * item.quantity).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div style={summaryStyle}>
          <span>Items:</span>
          <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </div>

        <div style={totalStyle}>
          <span>Total:</span>
          <span style={{ color: 'var(--pixel-coin-text)' }}>
            {COIN_SYMBOL} {cartTotal.toLocaleString()}
          </span>
        </div>

        <div style={balanceStyle}>
          <span>Your balance:</span>
          <span>
            {COIN_SYMBOL} {coins.toLocaleString()}
          </span>
        </div>

        <div style={buttonsContainerStyle}>
          <button
            style={cancelButtonStyle}
            onClick={onCancel}
            disabled={isProcessingPurchase}
          >
            Cancel
          </button>
          <button
            style={confirmButtonStyle}
            onClick={onConfirm}
            disabled={isProcessingPurchase}
          >
            {isProcessingPurchase ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
