package auth

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const UserClaimsKey contextKey = "user_claims"

// Middleware extracts and validates the Bearer token from Authorization header
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing authorization"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ValidateToken(tokenStr)
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetClaims retrieves the token claims from context
func GetClaims(r *http.Request) *TokenClaims {
	claims, _ := r.Context().Value(UserClaimsKey).(*TokenClaims)
	return claims
}
