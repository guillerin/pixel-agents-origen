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

// tokenReportRequest wraps TokenUsage with a requestId for deduplication
type tokenReportRequest struct {
	economy.TokenUsage
	RequestID string `json:"requestId"`
	SessionID string `json:"sessionId"`
}

func (h *EconomyHandler) ReportTokens(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)

	var payload tokenReportRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if payload.RequestID == "" {
		http.Error(w, `{"error":"requestId is required"}`, http.StatusBadRequest)
		return
	}

	if !economy.ValidateTokenReport(payload.TokenUsage) {
		http.Error(w, `{"error":"token report out of bounds"}`, http.StatusBadRequest)
		return
	}

	coins := economy.TokensToCoins(payload.TokenUsage)
	if coins <= 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Atomic: dedup check + coin credit + dedup record in a single transaction
	newBalance, deduplicated, err := h.wallet.EarnCoinsWithDedup(r.Context(), claims.UserID, payload.RequestID, coins, "token_usage", map[string]any{
		"model":         payload.Model,
		"input_tokens":  payload.InputTokens,
		"output_tokens": payload.OutputTokens,
		"request_id":    payload.RequestID,
		"session_id":    payload.SessionID,
	})
	if err != nil {
		http.Error(w, `{"error":"failed to credit coins"}`, http.StatusInternalServerError)
		return
	}

	if deduplicated {
		json.NewEncoder(w).Encode(map[string]any{
			"coins_earned": 0,
			"new_balance":  newBalance,
			"deduplicated": true,
		})
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
