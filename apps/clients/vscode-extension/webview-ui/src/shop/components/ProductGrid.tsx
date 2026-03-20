/**
 * ProductGrid component for displaying products in a responsive grid
 */

import type { ShopProduct } from '../types.js';
import { PRODUCT_GRID_GAP } from '../constants.js';
import { ProductCard } from './ProductCard.js';

interface ProductGridProps {
  products: ShopProduct[];
  onAddToCart: (product: ShopProduct) => void;
  cartItems: Map<string, number>;
  coins: number;
}

export function ProductGrid({
  products,
  onAddToCart,
  cartItems,
  coins,
}: ProductGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: PRODUCT_GRID_GAP,
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
    color: 'var(--pixel-text-dim)',
    textAlign: 'center',
    height: '100%',
  };

  const emptyIconStyle: React.CSSProperties = {
    fontSize: '64px',
    opacity: 0.5,
  };

  const emptyTextStyle: React.CSSProperties = {
    fontSize: '20px',
  };

  if (products.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <div style={emptyIconStyle}>🔍</div>
        <div style={emptyTextStyle}>No products found</div>
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {products.map((product) => {
        const cartQuantity = cartItems.get(product.id) || 0;
        const isInCart = cartQuantity > 0;
        const canAfford = coins >= product.price;

        return (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            isInCart={isInCart}
            cartQuantity={cartQuantity}
            canAfford={canAfford}
          />
        );
      })}
    </div>
  );
}
