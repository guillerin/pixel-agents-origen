/**
 * CoinCounter — compact coin balance display for the main office toolbar.
 *
 * Shows the user's current coin balance with a shop button.
 * Clicking opens the furniture shop.
 */

import { useState } from 'react';

import { COIN_SYMBOL } from '../../shop/constants.js';

interface CoinCounterProps {
  coins: number | null;
  onOpenShop: () => void;
}

export function CoinCounter({ coins, onOpenShop }: CoinCounterProps) {
  const [hovered, setHovered] = useState(false);

  if (coins === null) return null;

  return (
    <button
      onClick={onOpenShop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${coins.toLocaleString()} coins — click to open shop`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        fontSize: '24px',
        color: 'var(--pixel-coin-text, #ffd700)',
        background: hovered ? 'rgba(255, 215, 0, 0.15)' : 'var(--pixel-btn-bg)',
        border: '2px solid var(--pixel-coin-border, #b8860b)',
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'background 0.15s ease-out',
      }}
    >
      <span style={{ fontSize: '20px' }}>{COIN_SYMBOL}</span>
      <span>{coins.toLocaleString()}</span>
    </button>
  );
}
