package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"token-town/server/internal/auth"
)

// RoomsHandler handles room-related HTTP endpoints
type RoomsHandler struct{ db *sql.DB }

func (h *RoomsHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	var layoutData []byte
	err := h.db.QueryRowContext(r.Context(),
		"SELECT layout_data FROM room_layouts WHERE user_id = $1", userID,
	).Scan(&layoutData)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(layoutData)
}

func (h *RoomsHandler) SaveMyRoom(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var layout json.RawMessage
	json.NewDecoder(r.Body).Decode(&layout)
	_, err := h.db.ExecContext(r.Context(),
		`INSERT INTO room_layouts (user_id, layout_data) VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE SET layout_data = EXCLUDED.layout_data, updated_at = NOW()`,
		claims.UserID, layout,
	)
	if err != nil {
		http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
