package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"token-town/server/internal/auth"
)

// LeaderboardHandler handles leaderboard-related HTTP endpoints
type LeaderboardHandler struct{ db *sql.DB }

func (h *LeaderboardHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(),
		"SELECT id, display_name, total_coins_earned FROM users ORDER BY total_coins_earned DESC LIMIT 50",
	)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	entries := make([]map[string]any, 0)
	rank := 1
	for rows.Next() {
		var id, name string
		var earned int
		if err := rows.Scan(&id, &name, &earned); err != nil {
			continue
		}
		entries = append(entries, map[string]any{"rank": rank, "userId": id, "displayName": name, "totalCoinsEarned": earned})
		rank++
	}
	json.NewEncoder(w).Encode(entries)
}

func (h *LeaderboardHandler) GetMyRank(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	if claims == nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Use a window function to compute rank in a single query
	var rank int
	var displayName string
	var totalCoinsEarned int
	err := h.db.QueryRowContext(r.Context(),
		`SELECT rank, display_name, total_coins_earned FROM (
			SELECT id, display_name, total_coins_earned,
				RANK() OVER (ORDER BY total_coins_earned DESC) as rank
			FROM users
		) ranked WHERE id = $1`,
		claims.UserID,
	).Scan(&rank, &displayName, &totalCoinsEarned)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}

	// Count total users for context
	var totalUsers int
	h.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM users").Scan(&totalUsers)

	json.NewEncoder(w).Encode(map[string]any{
		"rank":             rank,
		"totalUsers":       totalUsers,
		"userId":           claims.UserID,
		"displayName":      displayName,
		"totalCoinsEarned": totalCoinsEarned,
	})
}
