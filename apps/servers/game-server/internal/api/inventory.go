package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"token-town/server/internal/auth"
)

// InventoryHandler handles inventory-related HTTP endpoints
type InventoryHandler struct{ db *sql.DB }

func (h *InventoryHandler) GetInventory(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	rows, _ := h.db.QueryContext(r.Context(),
		"SELECT item_id, quantity, purchased_at FROM inventory WHERE user_id = $1",
		claims.UserID,
	)
	defer rows.Close()
	var items []map[string]any
	for rows.Next() {
		var itemID, purchasedAt string
		var qty int
		rows.Scan(&itemID, &qty, &purchasedAt)
		items = append(items, map[string]any{"itemId": itemID, "quantity": qty, "purchasedAt": purchasedAt})
	}
	json.NewEncoder(w).Encode(items)
}
