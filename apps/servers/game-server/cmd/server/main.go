package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"

	"token-town/server/internal/api"
	"token-town/server/internal/db"
	"token-town/server/internal/economy"
	"token-town/server/internal/rooms"
	"token-town/server/internal/ws"
)

func main() {
	// Config
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/tokentown?sslmode=disable"
	}

	// Database
	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Room manager
	roomMgr := rooms.NewManager(database)

	// Economy services
	wallet := economy.NewWalletService(database)
	shop := economy.NewShopService(database, wallet)

	// WebSocket Hub
	hub := ws.NewHub()
	hub.RoomMgr = roomMgr
	hub.DB = database
	hub.Shop = shop
	go hub.Run()

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)

	// CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // TODO: restrict in production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	})
	r.Use(corsHandler.Handler)

	// Routes
	api.RegisterRoutes(r, hub, database)

	// WebSocket endpoint
	r.Get("/ws", hub.ServeWS)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	log.Printf("Token Town server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
