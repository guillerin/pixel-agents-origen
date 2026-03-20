package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"token-town/server/internal/auth"
	"token-town/server/internal/shop"
	"token-town/server/internal/ws"
)

// FurnitureShopHandler handles all furniture shop HTTP endpoints
type FurnitureShopHandler struct {
	catalog   *shop.CatalogService
	purchase  *shop.PurchaseService
	inventory *shop.InventoryService
	placement *shop.PlacementService
	hub       *ws.Hub
}

func newFurnitureShopHandler(db *sql.DB, hub *ws.Hub) *FurnitureShopHandler {
	return &FurnitureShopHandler{
		catalog:   shop.NewCatalogService(db),
		purchase:  shop.NewPurchaseService(db),
		inventory: shop.NewInventoryService(db),
		placement: shop.NewPlacementService(db),
		hub:       hub,
	}
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

func (h *FurnitureShopHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.catalog.GetCategories(r.Context())
	if err != nil {
		jsonError(w, "failed to fetch categories", http.StatusInternalServerError)
		return
	}
	if cats == nil {
		cats = []shop.FurnitureCategory{}
	}
	jsonOK(w, cats)
}

func (h *FurnitureShopHandler) GetProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := shop.ProductFilters{
		CategoryID: q.Get("category"),
		Rarity:     q.Get("rarity"),
		Search:     q.Get("search"),
		Sort:       q.Get("sort"),
	}
	if v := q.Get("minPrice"); v != "" {
		f.MinPrice, _ = strconv.Atoi(v)
	}
	if v := q.Get("maxPrice"); v != "" {
		f.MaxPrice, _ = strconv.Atoi(v)
	}
	if v := q.Get("limit"); v != "" {
		f.Limit, _ = strconv.Atoi(v)
	}
	if v := q.Get("offset"); v != "" {
		f.Offset, _ = strconv.Atoi(v)
	}

	result, err := h.catalog.GetProducts(r.Context(), f)
	if err != nil {
		jsonError(w, "failed to fetch products", http.StatusInternalServerError)
		return
	}
	jsonOK(w, result)
}

func (h *FurnitureShopHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productId")
	claims := auth.GetClaims(r)
	userID := ""
	if claims != nil {
		userID = claims.UserID
	}

	product, err := h.catalog.GetProductByID(r.Context(), productID, userID)
	if err != nil {
		jsonError(w, "failed to fetch product", http.StatusInternalServerError)
		return
	}
	if product == nil {
		jsonError(w, "product not found", http.StatusNotFound)
		return
	}
	jsonOK(w, product)
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

func (h *FurnitureShopHandler) PurchaseProduct(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	productID := chi.URLParam(r, "productId")

	var body struct {
		Quantity int `json:"quantity"`
	}
	body.Quantity = 1
	json.NewDecoder(r.Body).Decode(&body)

	result := h.purchase.Purchase(r.Context(), claims.UserID, productID, body.Quantity)

	if !result.Success {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{
			"error": result.Error,
			"code":  result.ErrorCode,
		})
		return
	}

	// Fetch updated inventory for response
	invResp, _ := h.inventory.GetUserInventory(r.Context(), claims.UserID, "", "")
	type purchaseResponse struct {
		shop.PurchaseResult
		Inventory []shop.InventoryItem `json:"inventory"`
	}
	jsonOK(w, purchaseResponse{
		PurchaseResult: result,
		Inventory:      invResp.Items,
	})

	// Broadcast balance update via WebSocket
	if h.hub != nil {
		h.hub.BroadcastToRoom(claims.UserID, ws.EventShopBalanceUpdate, ws.ShopBalanceUpdatePayload{
			UserID:  claims.UserID,
			Balance: result.RemainingBalance,
			Delta:   -result.TotalCoinsSpent,
			Reason:  "purchase:" + productID,
		}, nil)
	}
}

// ─── Inventory ────────────────────────────────────────────────────────────────

func (h *FurnitureShopHandler) GetInventory(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	q := r.URL.Query()

	result, err := h.inventory.GetUserInventory(r.Context(), claims.UserID, q.Get("category"), q.Get("search"))
	if err != nil {
		jsonError(w, "failed to fetch inventory", http.StatusInternalServerError)
		return
	}
	jsonOK(w, result)
}

func (h *FurnitureShopHandler) GetPurchaseHistory(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	q := r.URL.Query()
	limit := 20
	offset := 0
	if v := q.Get("limit"); v != "" {
		limit, _ = strconv.Atoi(v)
	}
	if v := q.Get("offset"); v != "" {
		offset, _ = strconv.Atoi(v)
	}
	if limit > 100 {
		limit = 100
	}

	rows, err := h.catalog.DB().QueryContext(r.Context(), `
		SELECT h.id, h.product_id, h.quantity, h.coins_spent, h.balance_after,
		       h.purchase_method, h.purchased_at,
		       p.name, p.rarity, p.sprite_url
		FROM furniture_purchase_history h
		JOIN furniture_products p ON p.id = h.product_id
		WHERE h.user_id = $1
		ORDER BY h.purchased_at DESC
		LIMIT $2 OFFSET $3`,
		claims.UserID, limit, offset,
	)
	if err != nil {
		jsonError(w, "failed to fetch purchase history", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type historyItem struct {
		ID             int64  `json:"id"`
		ProductID      string `json:"productId"`
		Quantity       int    `json:"quantity"`
		CoinsSpent     int    `json:"coinsSpent"`
		BalanceAfter   int    `json:"balanceAfter"`
		PurchaseMethod string `json:"purchaseMethod"`
		PurchasedAt    string `json:"purchasedAt"`
		ProductName    string `json:"productName"`
		ProductRarity  string `json:"productRarity"`
		ProductSprite  string `json:"productSpriteUrl"`
	}

	var items []historyItem
	for rows.Next() {
		var item historyItem
		rows.Scan(&item.ID, &item.ProductID, &item.Quantity, &item.CoinsSpent,
			&item.BalanceAfter, &item.PurchaseMethod, &item.PurchasedAt,
			&item.ProductName, &item.ProductRarity, &item.ProductSprite)
		items = append(items, item)
	}
	if items == nil {
		items = []historyItem{}
	}

	var total int
	h.catalog.DB().QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM furniture_purchase_history WHERE user_id = $1", claims.UserID,
	).Scan(&total)

	jsonOK(w, map[string]any{"items": items, "total": total, "limit": limit, "offset": offset})
}

// ─── Placements ───────────────────────────────────────────────────────────────

func (h *FurnitureShopHandler) GetPlacements(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	roomID := r.URL.Query().Get("roomId")
	if roomID == "" {
		roomID = "main"
	}

	placements, err := h.placement.GetPlacements(r.Context(), claims.UserID, roomID)
	if err != nil {
		jsonError(w, "failed to fetch placements", http.StatusInternalServerError)
		return
	}
	if placements == nil {
		placements = []shop.FurniturePlacement{}
	}
	jsonOK(w, map[string]any{"roomId": roomID, "placements": placements})
}

func (h *FurnitureShopHandler) UpdatePlacements(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)

	var body struct {
		RoomID     string                `json:"roomId"`
		Placements []shop.PlacementUpdate `json:"placements"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if body.RoomID == "" {
		body.RoomID = "main"
	}

	result := h.placement.UpdatePlacements(r.Context(), claims.UserID, body.RoomID, body.Placements)

	if !result.Success && len(result.Placements) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(result)
		return
	}

	jsonOK(w, result)
}

func (h *FurnitureShopHandler) RemovePlacement(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	placementIDStr := chi.URLParam(r, "placementId")
	placementID, err := strconv.ParseInt(placementIDStr, 10, 64)
	if err != nil {
		jsonError(w, "invalid placement id", http.StatusBadRequest)
		return
	}

	if err := h.placement.RemovePlacement(r.Context(), claims.UserID, placementID); err != nil {
		if err.Error() == "placement not found" {
			jsonError(w, "placement not found", http.StatusNotFound)
		} else {
			jsonError(w, "failed to remove placement", http.StatusInternalServerError)
		}
		return
	}

	jsonOK(w, map[string]bool{"success": true})
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
