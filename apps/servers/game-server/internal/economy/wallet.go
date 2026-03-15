package economy

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// WalletService handles coin operations
type WalletService struct {
	db *sql.DB
}

// NewWalletService creates a new WalletService
func NewWalletService(db *sql.DB) *WalletService {
	return &WalletService{db: db}
}

// GetBalance returns the current coin balance for a user
func (w *WalletService) GetBalance(ctx context.Context, userID string) (int, error) {
	var coins int
	err := w.db.QueryRowContext(ctx, "SELECT coins FROM users WHERE id = $1", userID).Scan(&coins)
	return coins, err
}

// EarnCoins credits coins to a user atomically
func (w *WalletService) EarnCoins(ctx context.Context, userID string, amount int, reason string, metadata map[string]any) (int, error) {
	if amount <= 0 {
		return 0, fmt.Errorf("amount must be positive")
	}

	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var currentBalance int
	err = tx.QueryRowContext(ctx, "SELECT coins FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&currentBalance)
	if err != nil {
		return 0, fmt.Errorf("user not found: %w", err)
	}

	newBalance := currentBalance + amount
	metaJSON, _ := json.Marshal(metadata)

	_, err = tx.ExecContext(ctx,
		`INSERT INTO transactions (user_id, type, amount, balance_after, reason, metadata)
		 VALUES ($1, 'earn', $2, $3, $4, $5)`,
		userID, amount, newBalance, reason, string(metaJSON),
	)
	if err != nil {
		return 0, err
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE users SET coins = $1, total_coins_earned = total_coins_earned + $2, updated_at = NOW()
		 WHERE id = $3`,
		newBalance, amount, userID,
	)
	if err != nil {
		return 0, err
	}

	return newBalance, tx.Commit()
}

// EarnCoinsWithDedup atomically checks dedup, credits coins, and records the requestId
// in a single transaction. Returns (newBalance, deduplicated, error).
func (w *WalletService) EarnCoinsWithDedup(ctx context.Context, userID string, requestID string, amount int, reason string, metadata map[string]any) (int, bool, error) {
	if amount <= 0 {
		return 0, false, fmt.Errorf("amount must be positive")
	}

	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback()

	// Dedup check inside the transaction
	var exists bool
	err = tx.QueryRowContext(ctx,
		"SELECT EXISTS(SELECT 1 FROM processed_requests WHERE request_id = $1)",
		requestID,
	).Scan(&exists)
	if err != nil {
		return 0, false, fmt.Errorf("dedup check failed: %w", err)
	}
	if exists {
		// Already processed — return current balance without crediting
		var balance int
		tx.QueryRowContext(ctx, "SELECT coins FROM users WHERE id = $1", userID).Scan(&balance)
		return balance, true, tx.Commit()
	}

	// Lock user row and credit coins
	var currentBalance int
	err = tx.QueryRowContext(ctx, "SELECT coins FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&currentBalance)
	if err != nil {
		return 0, false, fmt.Errorf("user not found: %w", err)
	}

	newBalance := currentBalance + amount
	metaJSON, _ := json.Marshal(metadata)

	_, err = tx.ExecContext(ctx,
		`INSERT INTO transactions (user_id, type, amount, balance_after, reason, metadata)
		 VALUES ($1, 'earn', $2, $3, $4, $5)`,
		userID, amount, newBalance, reason, string(metaJSON),
	)
	if err != nil {
		return 0, false, err
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE users SET coins = $1, total_coins_earned = total_coins_earned + $2, updated_at = NOW()
		 WHERE id = $3`,
		newBalance, amount, userID,
	)
	if err != nil {
		return 0, false, err
	}

	// Record requestId as processed — inside the same transaction
	_, err = tx.ExecContext(ctx,
		"INSERT INTO processed_requests (request_id, user_id) VALUES ($1, $2)",
		requestID, userID,
	)
	if err != nil {
		return 0, false, fmt.Errorf("dedup record failed: %w", err)
	}

	return newBalance, false, tx.Commit()
}

// SpendCoins debits coins from a user atomically
func (w *WalletService) SpendCoins(ctx context.Context, userID string, amount int, reason string, metadata map[string]any) (int, error) {
	if amount <= 0 {
		return 0, fmt.Errorf("amount must be positive")
	}

	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var currentBalance int
	err = tx.QueryRowContext(ctx, "SELECT coins FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&currentBalance)
	if err != nil {
		return 0, fmt.Errorf("user not found: %w", err)
	}

	if currentBalance < amount {
		return currentBalance, fmt.Errorf("insufficient balance: have %d, need %d", currentBalance, amount)
	}

	newBalance := currentBalance - amount
	metaJSON, _ := json.Marshal(metadata)

	_, err = tx.ExecContext(ctx,
		`INSERT INTO transactions (user_id, type, amount, balance_after, reason, metadata)
		 VALUES ($1, 'spend', $2, $3, $4, $5)`,
		userID, amount, newBalance, reason, string(metaJSON),
	)
	if err != nil {
		return 0, err
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE users SET coins = $1, updated_at = NOW() WHERE id = $2`,
		newBalance, userID,
	)
	if err != nil {
		return 0, err
	}

	return newBalance, tx.Commit()
}
