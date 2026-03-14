package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

var signingKey []byte

func init() {
	key := os.Getenv("TOKEN_SIGNING_KEY")
	if key == "" {
		key = "dev-signing-key-change-in-production"
	}
	signingKey = []byte(key)
}

// TokenClaims represents the claims in a session token
type TokenClaims struct {
	UserID    string `json:"uid"`
	MachineID string `json:"mid,omitempty"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
}

// GenerateToken creates a signed session token
func GenerateToken(userID, machineID string) (string, error) {
	claims := TokenClaims{
		UserID:    userID,
		MachineID: machineID,
		IssuedAt:  time.Now().Unix(),
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour).Unix(),
	}

	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encoded := base64.RawURLEncoding.EncodeToString(payload)
	sig := sign(encoded)
	return encoded + "." + sig, nil
}

// ValidateToken verifies and parses a session token
func ValidateToken(token string) (*TokenClaims, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid token format")
	}

	if sign(parts[0]) != parts[1] {
		return nil, fmt.Errorf("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid token encoding")
	}

	var claims TokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("invalid token claims")
	}

	if time.Now().Unix() > claims.ExpiresAt {
		return nil, fmt.Errorf("token expired")
	}

	return &claims, nil
}

func sign(data string) string {
	mac := hmac.New(sha256.New, signingKey)
	mac.Write([]byte(data))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// GenerateRandomID generates a random hex ID
func GenerateRandomID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
