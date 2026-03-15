package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"token-town/server/internal/auth"
	"token-town/server/internal/economy"
)

// AdminHandler handles admin-related HTTP endpoints
type AdminHandler struct {
	db     *sql.DB
	wallet *economy.WalletService
}

// AdminOnly middleware — only allows users with role='admin'
func AdminOnly(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := auth.GetClaims(r)
			var role string
			err := db.QueryRowContext(r.Context(), "SELECT role FROM users WHERE id = $1", claims.UserID).Scan(&role)
			if err != nil || role != "admin" {
				http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		"SELECT id, display_name, email, coins, total_coins_earned, role, created_at FROM users ORDER BY created_at DESC LIMIT 100",
	)
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]any
	for rows.Next() {
		var id, displayName, role, createdAt string
		var email sql.NullString
		var coins, totalCoinsEarned int
		rows.Scan(&id, &displayName, &email, &coins, &totalCoinsEarned, &role, &createdAt)
		users = append(users, map[string]any{
			"id": id, "displayName": displayName, "email": email.String,
			"coins": coins, "totalCoinsEarned": totalCoinsEarned,
			"role": role, "createdAt": createdAt,
		})
	}
	json.NewEncoder(w).Encode(users)
}

func (h *AdminHandler) AdjustCoins(w http.ResponseWriter, r *http.Request) {
	targetUserID := chi.URLParam(r, "userId")
	var body struct {
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	var newBalance int
	var err error
	if body.Amount >= 0 {
		newBalance, err = h.wallet.EarnCoins(r.Context(), targetUserID, body.Amount, "admin_adjustment:"+body.Reason, nil)
	} else {
		newBalance, err = h.wallet.SpendCoins(r.Context(), targetUserID, -body.Amount, "admin_adjustment:"+body.Reason, nil)
	}
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]any{"new_balance": newBalance})
}

func (h *AdminHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		"SELECT id, name, category, price, rarity, is_available FROM shop_items ORDER BY category, price",
	)
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var items []map[string]any
	for rows.Next() {
		var id, name, category, rarity string
		var price int
		var isAvailable bool
		rows.Scan(&id, &name, &category, &price, &rarity, &isAvailable)
		items = append(items, map[string]any{
			"id": id, "name": name, "category": category,
			"price": price, "rarity": rarity, "isAvailable": isAvailable,
		})
	}
	json.NewEncoder(w).Encode(items)
}

func (h *AdminHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var item struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Category string `json:"category"`
		Price    int    `json:"price"`
		Rarity   string `json:"rarity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}
	_, err := h.db.ExecContext(r.Context(),
		"INSERT INTO shop_items (id, name, category, price, rarity) VALUES ($1, $2, $3, $4, $5)",
		item.ID, item.Name, item.Category, item.Price, item.Rarity,
	)
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *AdminHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	// Simplified: only update price and availability
	if price, ok := body["price"].(float64); ok {
		h.db.ExecContext(r.Context(), "UPDATE shop_items SET price = $1 WHERE id = $2", int(price), itemID)
	}
	if avail, ok := body["isAvailable"].(bool); ok {
		h.db.ExecContext(r.Context(), "UPDATE shop_items SET is_available = $1 WHERE id = $2", avail, itemID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	h.db.ExecContext(r.Context(), "UPDATE shop_items SET is_available = FALSE WHERE id = $1", itemID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	var totalUsers, totalTransactions int
	var totalCoinsEarned int64
	h.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM users").Scan(&totalUsers)
	h.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM transactions").Scan(&totalTransactions)
	h.db.QueryRowContext(r.Context(), "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='earn'").Scan(&totalCoinsEarned)
	json.NewEncoder(w).Encode(map[string]any{
		"totalUsers": totalUsers, "totalTransactions": totalTransactions,
		"totalCoinsEarned": totalCoinsEarned,
	})
}
