package ws

// ClientEventType defines events sent from clients to server
type ClientEventType string

const (
	EventAuth            ClientEventType = "auth"
	EventAgentActivity   ClientEventType = "agent:activity"
	EventAgentCreated    ClientEventType = "agent:created"
	EventAgentClosed     ClientEventType = "agent:closed"
	EventSubagentCreated ClientEventType = "subagent:created"
	EventSubagentClosed  ClientEventType = "subagent:closed"
	EventTokenReport     ClientEventType = "tokens:report"
	EventRoomSaveLayout  ClientEventType = "room:saveLayout"
	EventRoomReqSnapshot ClientEventType = "room:requestSnapshot"
	EventShopPurchase    ClientEventType = "shop:purchase"
)

// ServerEventType defines events sent from server to clients
type ServerEventType string

const (
	EventRoomSnapshot          ServerEventType = "room:snapshot"
	EventRemoteAgentActivity   ServerEventType = "remote:agentActivity"
	EventRemoteAgentCreated    ServerEventType = "remote:agentCreated"
	EventRemoteAgentClosed     ServerEventType = "remote:agentClosed"
	EventRemoteSubagentCreated ServerEventType = "remote:subagentCreated"
	EventRemoteSubagentClosed  ServerEventType = "remote:subagentClosed"
	EventCoinsUpdate           ServerEventType = "economy:coinsUpdate"
	EventPurchaseResult        ServerEventType = "economy:purchaseResult"
	EventPresenceJoined        ServerEventType = "presence:joined"
	EventPresenceLeft          ServerEventType = "presence:left"
	EventRoomLayoutUpdate      ServerEventType = "room:layoutUpdate"
	EventError                 ServerEventType = "error"
)

// Inbound event envelope
type InboundEvent struct {
	Event   ClientEventType        `json:"event"`
	Payload map[string]interface{} `json:"payload"`
}

// Outbound event envelope
type OutboundEvent struct {
	Event   ServerEventType `json:"event"`
	Payload interface{}     `json:"payload"`
}

// Payload types — inbound
type AgentActivityPayload struct {
	AgentLocalID      int     `json:"agentLocalId"`
	Status            string  `json:"status"`
	CurrentTool       *string `json:"currentTool,omitempty"`
	ToolStatus        *string `json:"toolStatus,omitempty"`
	HasPermissionWait bool    `json:"hasPermissionWait,omitempty"`
}

type AgentLifecyclePayload struct {
	AgentLocalID int `json:"agentLocalId"`
	Palette      int `json:"palette,omitempty"`
	HueShift     int `json:"hueShift,omitempty"`
}

type TokenReportPayload struct {
	SessionID        string `json:"sessionId"`
	RequestID        string `json:"requestId"`
	InputTokens      int    `json:"inputTokens"`
	OutputTokens     int    `json:"outputTokens"`
	CacheReadTokens  int    `json:"cacheReadTokens,omitempty"`
	CacheCreationTokens int `json:"cacheCreationTokens,omitempty"`
	Model            string `json:"model"`
	Timestamp        int64  `json:"timestamp"`
}

type AuthPayload struct {
	Token       string `json:"token"`
	UserID      string `json:"userId"`
	WorkspaceID string `json:"workspaceId"`
}

// Payload types — outbound
type CoinsUpdatePayload struct {
	UserID     string `json:"userId"`
	TotalCoins int    `json:"totalCoins"`
	Delta      int    `json:"delta"`
	Reason     string `json:"reason"`
}

type PresencePayload struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	RoomID      string `json:"roomId"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
