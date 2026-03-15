package economy

// TokenUsage represents Claude Code API token usage from a JSONL assistant record
type TokenUsage struct {
	InputTokens   int    `json:"input_tokens"`
	OutputTokens  int    `json:"output_tokens"`
	CacheCreation int    `json:"cache_creation_input_tokens"`
	CacheRead     int    `json:"cache_read_input_tokens"`
	Model         string `json:"model"`
}

const (
	weightInput         = 1.0
	weightOutput        = 3.0
	weightCacheCreation = 1.25
	weightCacheRead     = 0.1
	coinDivisor         = 1000
)

// TokensToCoins converts Claude API token usage to Token Town coins.
// Weights reflect relative API costs. 1000 weighted tokens = 1 coin.
func TokensToCoins(usage TokenUsage) int {
	weighted := float64(usage.InputTokens)*weightInput +
		float64(usage.OutputTokens)*weightOutput +
		float64(usage.CacheCreation)*weightCacheCreation +
		float64(usage.CacheRead)*weightCacheRead
	return int(weighted / coinDivisor)
}

// ValidateTokenReport checks if a token report is within reasonable bounds
func ValidateTokenReport(usage TokenUsage) bool {
	// Sanity checks — no single response should exceed these limits
	if usage.OutputTokens > 100_000 {
		return false
	}
	if usage.InputTokens > 2_000_000 {
		return false
	}
	if usage.CacheCreation > 2_000_000 {
		return false
	}
	return true
}
