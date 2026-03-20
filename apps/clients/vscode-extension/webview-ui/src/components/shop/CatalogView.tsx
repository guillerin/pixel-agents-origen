/**
 * CatalogView — catalog tab: category filter bar + scrollable product grid.
 *
 * Wraps CategoryFilter and ProductGrid into one cohesive view used by ShopModal.
 */

import type { ShopProduct, CartItem } from '../../shop/types.js';
import type { FurnitureCategorySlug } from '../../shop/types.js';
import { SHOP_CATEGORIES } from '../../shop/constants.js';
import { CategoryFilter } from '../../shop/components/CategoryFilter.js';
import { ProductGrid } from '../../shop/components/ProductGrid.js';

interface CatalogViewProps {
  products: ShopProduct[];
  cart: CartItem[];
  coins: number;
  selectedCategory: FurnitureCategorySlug | 'all';
  onSelectCategory: (category: FurnitureCategorySlug | 'all') => void;
  onAddToCart: (product: ShopProduct) => void;
}

export function CatalogView({
  products,
  cart,
  coins,
  selectedCategory,
  onSelectCategory,
  onAddToCart,
}: CatalogViewProps) {
  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const cartItemsMap = new Map(cart.map((item) => [item.product.id, item.quantity]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <CategoryFilter
        categories={SHOP_CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ProductGrid
          products={filteredProducts}
          onAddToCart={onAddToCart}
          cartItems={cartItemsMap}
          coins={coins}
        />
      </div>
    </div>
  );
}
