/**
 * InventoryView component for displaying user's purchased items
 */

import type { UserInventoryItem, ShopProduct } from '../types.js';
import { CATEGORY_ICONS } from '../constants.js';

interface InventoryViewProps {
  inventory: UserInventoryItem[];
  productsMap: Map<string, ShopProduct>;
  onPlaceInOffice: (productId: string) => void;
}

export function InventoryView({
  inventory,
  productsMap,
  onPlaceInOffice,
}: InventoryViewProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '2px solid var(--pixel-border)',
    background: 'var(--pixel-bg)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    marginBottom: 4,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--pixel-text-dim)',
  };

  const itemsContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  };

  const itemCardStyle: React.CSSProperties = {
    background: 'var(--pixel-bg)',
    border: '2px solid var(--pixel-border)',
    borderRadius: 0,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'all 0.15s ease-out',
    cursor: 'pointer',
  };

  const itemImageStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '1',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--pixel-border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  };

  const itemNameStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const itemMetaStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--pixel-text-dim)',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const placeButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--pixel-agent-text)',
    background: 'var(--pixel-agent-bg)',
    border: '2px solid var(--pixel-agent-border)',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
    marginTop: 'auto',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 60,
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

  const emptySubtextStyle: React.CSSProperties = {
    fontSize: '14px',
    marginTop: 8,
  };

  // Sort inventory by purchase date (newest first)
  const sortedInventory = [...inventory].sort(
    (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );

  if (inventory.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>My Inventory</div>
          <div style={subtitleStyle}>Items you've purchased</div>
        </div>
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>📦</div>
          <div style={emptyTextStyle}>Your inventory is empty</div>
          <div style={emptySubtextStyle}>
            Purchase items from the shop to see them here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>My Inventory</div>
        <div style={subtitleStyle}>
          {inventory.length} item{inventory.length !== 1 ? 's' : ''} owned
        </div>
      </div>

      <div style={itemsContainerStyle}>
        {sortedInventory.map((item) => {
          const product = productsMap.get(item.productId);
          if (!product) return null;

          const categoryIcon = CATEGORY_ICONS[product.category] || '📦';
          const purchaseDate = new Date(item.purchaseDate);
          const timeAgo = getTimeAgo(purchaseDate);

          return (
            <div
              key={item.productId}
              style={itemCardStyle}
              onClick={() => onPlaceInOffice(item.productId)}
              title="Click to place in office"
            >
              <div style={itemImageStyle}>{categoryIcon}</div>
              <div style={itemNameStyle} title={product.name}>
                {product.name}
              </div>
              <div style={itemMetaStyle}>
                <span>{categoryIcon} {product.category}</span>
                <span>×{item.timesUsed}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--pixel-text-dim)' }}>
                Purchased {timeAgo}
              </div>
              <button style={placeButtonStyle}>
                Place in Office
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
