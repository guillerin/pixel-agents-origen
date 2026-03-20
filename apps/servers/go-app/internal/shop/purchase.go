package shop

import (
	"context"
	"database/sql"
	"fmt"
)

// PurchasedItem describes one item in a purchase result
type PurchasedItem struct {
	ProductID  string `json:"productId"`
	Quantity   int    `json:"quantity"`
	CoinsSpent int    `json:"coinsSpent"`
}

// PurchaseResult is the outcome of a purchase operation
type PurchaseResult struct {
	Success          bool            `json:"success"`
	OrderID          string          `json:"orderId,omitempty"`
	Items            []PurchasedItem `json:"items"`
	TotalCoinsSpent  int             `json:"totalCoinsSpent"`
	RemainingBalance int             `json:"remainingBalance"`
	Error            string          `json:"error,omitempty"`
	ErrorCode        string          `json:"code,omitempty"`
}

// PurchaseService handles transactional furniture purchases
type PurchaseService struct {
	db *sql.DB
}

// NewPurchaseService creates a new PurchaseService
func NewPurchaseService(db *sql.DB) *PurchaseService {
	return &PurchaseService{db: db}
}

// maxPurchaseQty is the upper bound on quantity per purchase request.
const maxPurchaseQty = 100

// Purchase atomically purchases qty units of productID for userID.
// All validation (stock, balance, limits) happens inside a single transaction
// with FOR UPDATE locks to prevent TOCTOU races.
func (s *PurchaseService) Purchase(ctx context.Context, userID, productID string, qty int) PurchaseResult {
	if qty <= 0 {
		qty = 1
	}
	// Bug fix #3: guard against integer overflow on totalCost = price * qty
	if qty > maxPurchaseQty {
		return PurchaseResult{
			Error:     fmt.Sprintf("quantity too large (max %d per purchase)", maxPurchaseQty),
			ErrorCode: "QUANTITY_TOO_LARGE",
		}
	}

	// Begin transaction before any product reads so all checks are atomic
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return PurchaseResult{Error: "transaction error", ErrorCode: "TX_ERROR"}
	}
	defer tx.Rollback()

	// Bug fix #1: fetch AND lock the product row inside the transaction (TOCTOU fix).
	// A single SELECT FOR UPDATE locks the product row, preventing concurrent
	// purchases from reading a stale stock_quantity between our check and decrement.
	var price int
	var isAvailable bool
	var maxPerUser sql.NullInt64
	var stockQty sql.NullInt64
	err = tx.QueryRowContext(ctx,
		`SELECT price_coins, is_available, max_per_user, stock_quantity
		 FROM furniture_products WHERE id = $1 FOR UPDATE`,
		productID,
	).Scan(&price, &isAvailable, &maxPerUser, &stockQty)
	if err == sql.ErrNoRows {
		return PurchaseResult{Error: "product not found", ErrorCode: "PRODUCT_NOT_FOUND"}
	}
	if err != nil {
		return PurchaseResult{Error: "database error", ErrorCode: "DB_ERROR"}
	}
	if !isAvailable {
		return PurchaseResult{Error: "product not available", ErrorCode: "PRODUCT_UNAVAILABLE"}
	}
	// Stock check now happens inside the TX against the locked row
	if stockQty.Valid && stockQty.Int64 < int64(qty) {
		return PurchaseResult{Error: "insufficient stock", ErrorCode: "OUT_OF_STOCK"}
	}

	totalCost := price * qty

	// Lock user row and check balance
	var currentBalance int
	err = tx.QueryRowContext(ctx,
		"SELECT coins FROM users WHERE id = $1 FOR UPDATE",
		userID,
	).Scan(&currentBalance)
	if err != nil {
		return PurchaseResult{Error: "user not found", ErrorCode: "USER_NOT_FOUND"}
	}
	if currentBalance < totalCost {
		return PurchaseResult{
			Error:     fmt.Sprintf("insufficient balance: have %d, need %d", currentBalance, totalCost),
			ErrorCode: "INSUFFICIENT_BALANCE",
		}
	}

	// Check max_per_user limit
	if maxPerUser.Valid {
		var owned int
		tx.QueryRowContext(ctx,
			"SELECT COALESCE(quantity, 0) FROM user_furniture_inventory WHERE user_id = $1 AND product_id = $2",
			userID, productID,
		).Scan(&owned)
		if owned+qty > int(maxPerUser.Int64) {
			return PurchaseResult{
				Error:     fmt.Sprintf("maximum quantity reached (limit: %d)", maxPerUser.Int64),
				ErrorCode: "MAX_QUANTITY_REACHED",
			}
		}
	}

	newBalance := currentBalance - totalCost

	// Deduct coins from user
	_, err = tx.ExecContext(ctx,
		"UPDATE users SET coins = $1, updated_at = NOW() WHERE id = $2",
		newBalance, userID,
	)
	if err != nil {
		return PurchaseResult{Error: "failed to deduct coins", ErrorCode: "DB_ERROR"}
	}

	// Record spend transaction in ledger
	var transactionID int64
	err = tx.QueryRowContext(ctx,
		`INSERT INTO transactions (user_id, type, amount, balance_after, reason, metadata)
		 VALUES ($1, 'spend', $2, $3, $4, $5)
		 RETURNING id`,
		userID, totalCost, newBalance,
		fmt.Sprintf("purchase:%s", productID),
		fmt.Sprintf(`{"product_id":"%s","quantity":%d}`, productID, qty),
	).Scan(&transactionID)
	if err != nil {
		return PurchaseResult{Error: "failed to record transaction", ErrorCode: "DB_ERROR"}
	}

	// Update inventory (upsert)
	_, err = tx.ExecContext(ctx,
		`INSERT INTO user_furniture_inventory (user_id, product_id, quantity, first_purchased_at, last_purchased_at)
		 VALUES ($1, $2, $3, NOW(), NOW())
		 ON CONFLICT (user_id, product_id)
		 DO UPDATE SET quantity = user_furniture_inventory.quantity + $3,
		               last_purchased_at = NOW()`,
		userID, productID, qty,
	)
	if err != nil {
		return PurchaseResult{Error: "failed to update inventory", ErrorCode: "DB_ERROR"}
	}

	// Record purchase history
	_, err = tx.ExecContext(ctx,
		`INSERT INTO furniture_purchase_history
		 (user_id, product_id, quantity, coins_spent, balance_after, transaction_id, purchase_method)
		 VALUES ($1, $2, $3, $4, $5, $6, 'shop')`,
		userID, productID, qty, totalCost, newBalance, transactionID,
	)
	if err != nil {
		return PurchaseResult{Error: "failed to record purchase history", ErrorCode: "DB_ERROR"}
	}

	// Bug fix #2: decrement stock and check the error — a failure must abort the TX.
	if stockQty.Valid {
		_, err = tx.ExecContext(ctx,
			"UPDATE furniture_products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
			qty, productID,
		)
		if err != nil {
			return PurchaseResult{Error: "failed to update stock", ErrorCode: "DB_ERROR"}
		}
	}

	if err := tx.Commit(); err != nil {
		return PurchaseResult{Error: "transaction commit failed", ErrorCode: "TX_ERROR"}
	}

	userPrefix := userID
	if len(userID) > 8 {
		userPrefix = userID[:8]
	}
	orderID := fmt.Sprintf("ord_%s_%s", userPrefix, productID)

	return PurchaseResult{
		Success: true,
		OrderID: orderID,
		Items: []PurchasedItem{
			{ProductID: productID, Quantity: qty, CoinsSpent: totalCost},
		},
		TotalCoinsSpent:  totalCost,
		RemainingBalance: newBalance,
	}
}
