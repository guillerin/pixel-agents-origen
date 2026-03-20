/**
 * ProductCard component for displaying shop items
 */

import { useState } from 'react';

import type { ShopProduct } from '../types.js';
import { COIN_SYMBOL, CATEGORY_ICONS } from '../constants.js';

interface ProductCardProps {
  product: ShopProduct;
  onAddToCart: (product: ShopProduct) => void;
  isInCart: boolean;
  cartQuantity: number;
  canAfford: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  isInCart,
  cartQuantity,
  canAfford,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minWidth: PRODUCT_GRID_MIN_WIDTH,
    maxWidth: PRODUCT_GRID_MAX_WIDTH,
    background: 'var(--pixel-bg)',
    border: '2px solid var(--pixel-border)',
    borderRadius: 0,
    padding: 12,
    boxShadow: isHovered ? '3px 3px 0px #0a0a14' : 'var(--pixel-shadow)',
    transition: 'all 0.15s ease-out',
    cursor: canAfford ? 'pointer' : 'not-allowed',
    opacity: canAfford ? 1 : 0.6,
  };

  const imageContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--pixel-border-light)',
    borderRadius: 0,
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const priceStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '18px',
    fontWeight: 'bold',
    color: canAfford ? 'var(--pixel-coin-text)' : 'var(--pixel-close-hover)',
    marginBottom: 8,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    marginBottom: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const categoryStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--pixel-text-dim)',
    marginBottom: 8,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--pixel-text-dim)',
    lineHeight: 1.4,
    marginBottom: 10,
    flex: 1,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: canAfford ? 'var(--pixel-agent-text)' : 'var(--pixel-text-dim)',
    background: canAfford
      ? isHovered
        ? 'var(--pixel-agent-hover-bg)'
        : 'var(--pixel-agent-bg)'
      : 'var(--pixel-btn-bg)',
    border: `2px solid ${canAfford ? 'var(--pixel-agent-border)' : 'var(--pixel-border)'}`,
    borderRadius: 0,
    cursor: canAfford ? 'pointer' : 'not-allowed',
    transition: 'all 0.15s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };

  const cartBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: -6,
    right: -6,
    background: 'var(--pixel-accent)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: 0,
    border: '1px solid var(--pixel-accent)',
    boxShadow: '1px 1px 0px #0a0a14',
  };

  const categoryIcon = CATEGORY_ICONS[product.category] || '📦';

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => canAfford && onAddToCart(product)}
      title={canAfford ? 'Click to add to cart' : 'Not enough coins'}
    >
      <div style={imageContainerStyle}>
        {typeof product.sprite === 'string' && product.sprite ? (
          <img
            src={product.sprite}
            alt={product.name}
            style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }}
          />
        ) : (
          <div
            style={{
              fontSize: '48px',
              opacity: 0.5,
              textAlign: 'center',
            }}
          >
            {categoryIcon}
          </div>
        )}
      </div>

      <div style={priceStyle}>
        <span>{COIN_SYMBOL}</span>
        <span>{product.price.toLocaleString()}</span>
      </div>

      <div style={titleStyle} title={product.name}>
        {product.name}
      </div>

      <div style={categoryStyle}>
        {categoryIcon} {product.category}
      </div>

      <div style={descriptionStyle} title={product.description}>
        {product.description}
      </div>

      <div style={{ position: 'relative' }}>
        <button style={buttonStyle} disabled={!canAfford}>
          {isInCart ? (
            <>
              <span>In Cart</span>
              {cartQuantity > 1 && <span>({cartQuantity})</span>}
            </>
          ) : (
            <>
              <span>Add to Cart</span>
            </>
          )}
        </button>
        {isInCart && (
          <div style={cartBadgeStyle}>{cartQuantity}</div>
        )}
      </div>
    </div>
  );
}

// Constants from constants.ts
const PRODUCT_GRID_MIN_WIDTH = 180;
const PRODUCT_GRID_MAX_WIDTH = 280;
