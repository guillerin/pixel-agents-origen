/**
 * CategoryFilter component for filtering products by category
 */

import type { FurnitureCategorySlug } from '../types.js';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../constants.js';

interface CategoryFilterProps {
  categories: FurnitureCategorySlug[];
  selectedCategory: FurnitureCategorySlug | 'all';
  onSelectCategory: (category: FurnitureCategorySlug | 'all') => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    padding: '12px 16px',
    background: 'var(--pixel-bg)',
    borderBottom: '2px solid var(--pixel-border)',
    overflowX: 'auto',
    overflowY: 'hidden',
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    background: 'var(--pixel-btn-bg)',
    border: '2px solid transparent',
    borderRadius: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s ease-out',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'var(--pixel-active-bg)',
    border: '2px solid var(--pixel-accent)',
    color: 'var(--pixel-accent)',
  };

  const allCategories: (FurnitureCategorySlug | 'all')[] = ['all', ...categories];

  return (
    <div style={containerStyle}>
      {allCategories.map((category) => {
        const isActive = selectedCategory === category;
        const label = CATEGORY_LABELS[category];
        const icon = CATEGORY_ICONS[category];

        return (
          <button
            key={category}
            style={isActive ? activeButtonStyle : buttonBaseStyle}
            onClick={() => onSelectCategory(category)}
            title={`Filter by ${label}`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
