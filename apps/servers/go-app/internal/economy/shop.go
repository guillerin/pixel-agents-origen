package economy

import (
	"context"
	"database/sql"
	"fmt"
)

// ShopService handles item purchases
type ShopService struct {
	db     *sql.DB
	wallet *WalletService
}

// NewShopService creates a new ShopService
func NewShopService(db *sql.DB, wallet *WalletService) *ShopService {
	return &ShopService{db: db, wallet: wallet}
}

// PurchaseResult contains the result of a purchase attempt
type PurchaseResult struct {
	Success        bool   `json:"success"`
	ItemID         string `json:"itemId"`
	RemainingCoins int    `json:"remainingCoins"`
	Error          string `json:"error,omitempty"`
}

// Purchase attempts to buy an item for a user
func (s *ShopService) Purchase(ctx context.Context, userID, itemID string) PurchaseResult {
	// Get item details
	var price int
	var isAvailable bool
	var maxPerUser sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		"SELECT price, is_available, max_per_user FROM shop_items WHERE id = $1",
		itemID,
	).Scan(&price, &isAvailable, &maxPerUser)
	if err != nil {
		return PurchaseResult{Error: "item not found"}
	}
	if !isAvailable {
		return PurchaseResult{Error: "item not available"}
	}

	// Check max_per_user limit
	if maxPerUser.Valid {
		var owned int
		s.db.QueryRowContext(ctx,
			"SELECT COALESCE(quantity, 0) FROM inventory WHERE user_id = $1 AND item_id = $2",
			userID, itemID,
		).Scan(&owned)
		if owned >= int(maxPerUser.Int64) {
			return PurchaseResult{Error: "maximum quantity reached"}
		}
	}

	// Deduct coins
	newBalance, err := s.wallet.SpendCoins(ctx, userID, price, fmt.Sprintf("purchase:%s", itemID), map[string]any{
		"item_id": itemID,
		"price":   price,
	})
	if err != nil {
		return PurchaseResult{Error: err.Error()}
	}

	// Add to inventory
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO inventory (user_id, item_id, quantity)
		 VALUES ($1, $2, 1)
		 ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = inventory.quantity + 1`,
		userID, itemID,
	)
	if err != nil {
		// TODO: compensating transaction (refund)
		return PurchaseResult{Error: "failed to update inventory"}
	}

	return PurchaseResult{Success: true, ItemID: itemID, RemainingCoins: newBalance}
}
