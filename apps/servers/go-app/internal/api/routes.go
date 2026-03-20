package api

import (
	"database/sql"

	"github.com/go-chi/chi/v5"

	"token-town/server/internal/auth"
	"token-town/server/internal/economy"
	"token-town/server/internal/shop"
	"token-town/server/internal/ws"
)

// RegisterRoutes sets up all HTTP routes
func RegisterRoutes(r *chi.Mux, hub *ws.Hub, db *sql.DB) {
	wallet := economy.NewWalletService(db)
	legacyShop := economy.NewShopService(db, wallet)

	econHandler := &EconomyHandler{db: db, wallet: wallet}
	shopHandler := &ShopHandler{db: db, shop: legacyShop}
	inventoryHandler := &InventoryHandler{db: db}
	leaderboardHandler := &LeaderboardHandler{db: db}
	roomsHandler := &RoomsHandler{db: db}
	adminHandler := &AdminHandler{db: db, wallet: wallet}
	furnitureShopHandler := newFurnitureShopHandler(db, hub)

	// Wire furniture shop services into the WS hub
	if hub != nil {
		hub.FurnitureCatalog = shop.NewCatalogService(db)
		hub.FurniturePurchase = shop.NewPurchaseService(db)
		hub.FurnitureInventory = shop.NewInventoryService(db)
		hub.FurniturePlacement = shop.NewPlacementService(db)
	}

	// Rate limiters: general (30 req/s, burst 60) and strict for token reports (5 req/s, burst 10)
	generalLimiter := NewRateLimiter(30, 60)
	tokenReportLimiter := NewRateLimiter(5, 10)

	// Public routes (with general rate limit)
	r.Group(func(r chi.Router) {
		r.Use(generalLimiter.Middleware)
		r.Post("/api/auth/register", RegisterHandler(db))
	})

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware)
		r.Use(generalLimiter.Middleware)

		r.Get("/api/auth/me", MeHandler(db))

		// Token reports get stricter rate limiting
		r.With(tokenReportLimiter.Middleware).Post("/api/economy/report-tokens", econHandler.ReportTokens)
		r.Get("/api/economy/balance", econHandler.GetBalance)

		r.Get("/api/shop/catalog", shopHandler.GetCatalog)
		r.Post("/api/shop/purchase", shopHandler.Purchase)

		r.Get("/api/inventory", inventoryHandler.GetInventory)

		r.Get("/api/leaderboard", leaderboardHandler.GetLeaderboard)
		r.Get("/api/leaderboard/me", leaderboardHandler.GetMyRank)

		r.Get("/api/rooms/{userId}", roomsHandler.GetRoom)
		r.Put("/api/rooms/me", roomsHandler.SaveMyRoom)

		// Furniture shop
		r.Get("/api/shop/categories", furnitureShopHandler.GetCategories)
		r.Get("/api/shop/products", furnitureShopHandler.GetProducts)
		r.Get("/api/shop/products/{productId}", furnitureShopHandler.GetProduct)
		r.Post("/api/shop/products/{productId}/purchase", furnitureShopHandler.PurchaseProduct)
		r.Get("/api/shop/inventory", furnitureShopHandler.GetInventory)
		r.Get("/api/shop/purchase-history", furnitureShopHandler.GetPurchaseHistory)
		r.Get("/api/shop/placements", furnitureShopHandler.GetPlacements)
		r.Put("/api/shop/placements", furnitureShopHandler.UpdatePlacements)
		r.Delete("/api/shop/placements/{placementId}", furnitureShopHandler.RemovePlacement)
	})

	// Admin routes
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware)
		r.Use(AdminOnly(db))

		r.Get("/api/admin/users", adminHandler.ListUsers)
		r.Post("/api/admin/users/{userId}/adjust-coins", adminHandler.AdjustCoins)
		r.Get("/api/admin/shop/items", adminHandler.ListItems)
		r.Post("/api/admin/shop/items", adminHandler.CreateItem)
		r.Put("/api/admin/shop/items/{itemId}", adminHandler.UpdateItem)
		r.Delete("/api/admin/shop/items/{itemId}", adminHandler.DeleteItem)
		r.Get("/api/admin/stats", adminHandler.GetStats)
	})
}
