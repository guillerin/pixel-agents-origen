package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"token-town/server/internal/auth"
	"token-town/server/internal/economy"
)

// EconomyHandler handles economy-related HTTP endpoints
type EconomyHandler struct {
	db     *sql.DB
	wallet *economy.WalletService
}

func (h *EconomyHandler) ReportTokens(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)

	var payload economy.TokenUsage
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if !economy.ValidateTokenReport(payload) {
		http.Error(w, `{"error":"token report out of bounds"}`, http.StatusBadRequest)
		return
	}

	coins := economy.TokensToCoins(payload)
	if coins <= 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	newBalance, err := h.wallet.EarnCoins(r.Context(), claims.UserID, coins, "token_usage", map[string]any{
		"model":         payload.Model,
		"input_tokens":  payload.InputTokens,
		"output_tokens": payload.OutputTokens,
	})
	if err != nil {
		http.Error(w, `{"error":"failed to credit coins"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"coins_earned": coins,
		"new_balance":  newBalance,
	})
}

func (h *EconomyHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	balance, err := h.wallet.GetBalance(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(map[string]any{"balance": balance})
}
