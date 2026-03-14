package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

// LeaderboardHandler handles leaderboard-related HTTP endpoints
type LeaderboardHandler struct{ db *sql.DB }

func (h *LeaderboardHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.QueryContext(r.Context(),
		"SELECT id, display_name, total_coins_earned FROM users ORDER BY total_coins_earned DESC LIMIT 50",
	)
	defer rows.Close()
	var entries []map[string]any
	rank := 1
	for rows.Next() {
		var id, name string
		var earned int
		rows.Scan(&id, &name, &earned)
		entries = append(entries, map[string]any{"rank": rank, "userId": id, "displayName": name, "totalCoinsEarned": earned})
		rank++
	}
	json.NewEncoder(w).Encode(entries)
}

func (h *LeaderboardHandler) GetMyRank(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}
