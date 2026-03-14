package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"token-town/server/internal/auth"
)

// RegisterHandler handles user registration via machineId
func RegisterHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			MachineID   string `json:"machineId"`
			DisplayName string `json:"displayName"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MachineID == "" {
			http.Error(w, `{"error":"machineId required"}`, http.StatusBadRequest)
			return
		}

		// Upsert user
		var userID string
		err := db.QueryRowContext(r.Context(),
			`INSERT INTO users (machine_id, display_name)
			 VALUES ($1, $2)
			 ON CONFLICT (machine_id) DO UPDATE SET display_name = EXCLUDED.display_name
			 RETURNING id`,
			body.MachineID, body.DisplayName,
		).Scan(&userID)
		if err != nil {
			http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
			return
		}

		token, err := auth.GenerateToken(userID, body.MachineID)
		if err != nil {
			http.Error(w, `{"error":"token error"}`, http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"userId": userID,
			"token":  token,
		})
	}
}

// MeHandler returns the current user's profile
func MeHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := auth.GetClaims(r)
		var displayName, role string
		var coins, totalEarned int
		err := db.QueryRowContext(r.Context(),
			"SELECT display_name, role, coins, total_coins_earned FROM users WHERE id = $1",
			claims.UserID,
		).Scan(&displayName, &role, &coins, &totalEarned)
		if err != nil {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"id": claims.UserID, "displayName": displayName,
			"role": role, "coins": coins, "totalCoinsEarned": totalEarned,
		})
	}
}
