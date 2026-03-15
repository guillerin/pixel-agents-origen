package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"token-town/server/internal/auth"
	"token-town/server/internal/economy"
)

// ShopHandler handles shop-related HTTP endpoints
type ShopHandler struct {
	db   *sql.DB
	shop *economy.ShopService
}

func (h *ShopHandler) GetCatalog(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.QueryContext(r.Context(),
		"SELECT id, name, category, price, rarity FROM shop_items WHERE is_available = TRUE ORDER BY category, price",
	)
	defer rows.Close()
	var items []map[string]any
	for rows.Next() {
		var id, name, category, rarity string
		var price int
		rows.Scan(&id, &name, &category, &price, &rarity)
		items = append(items, map[string]any{"id": id, "name": name, "category": category, "price": price, "rarity": rarity})
	}
	json.NewEncoder(w).Encode(items)
}

func (h *ShopHandler) Purchase(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var body struct {
		ItemID string `json:"itemId"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	result := h.shop.Purchase(r.Context(), claims.UserID, body.ItemID)
	if !result.Success {
		http.Error(w, `{"error":"`+result.Error+`"}`, http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(result)
}
