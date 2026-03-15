package api

import (
	"net/http"
	"sync"
	"time"

	"token-town/server/internal/auth"
)

// bucket tracks a token bucket for a single user
type bucket struct {
	tokens    float64
	lastFill  time.Time
}

// RateLimiter implements an in-memory per-user token bucket rate limiter.
// Keyed by UserID (from auth claims), not IP, since multiple users can share NAT.
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	rate     float64       // tokens added per second
	burst    int           // max tokens (bucket capacity)
	lastSweep time.Time
}

// NewRateLimiter creates a rate limiter.
// rate: requests per second allowed (sustained). burst: max burst size.
func NewRateLimiter(rate float64, burst int) *RateLimiter {
	return &RateLimiter{
		buckets:   make(map[string]*bucket),
		rate:      rate,
		burst:     burst,
		lastSweep: time.Now(),
	}
}

// Allow checks if a request from the given key is allowed.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	// Sweep stale buckets every 5 minutes to prevent memory leaks
	if now.Sub(rl.lastSweep) > 5*time.Minute {
		for k, b := range rl.buckets {
			if now.Sub(b.lastFill) > 10*time.Minute {
				delete(rl.buckets, k)
			}
		}
		rl.lastSweep = now
	}

	b, ok := rl.buckets[key]
	if !ok {
		b = &bucket{tokens: float64(rl.burst), lastFill: now}
		rl.buckets[key] = b
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(b.lastFill).Seconds()
	b.tokens += elapsed * rl.rate
	if b.tokens > float64(rl.burst) {
		b.tokens = float64(rl.burst)
	}
	b.lastFill = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// Middleware returns a chi-compatible middleware that rate limits by authenticated user ID.
// Falls back to remote address for unauthenticated requests.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := r.RemoteAddr
		if claims := auth.GetClaims(r); claims != nil {
			key = claims.UserID
		}

		if !rl.Allow(key) {
			w.Header().Set("Retry-After", "1")
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
