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

	// Furniture shop client events
	EventShopGetCatalog       ClientEventType = "shop:getCatalog"
	EventShopGetInventory     ClientEventType = "shop:getInventory"
	EventShopGetPlacements    ClientEventType = "shop:getPlacements"
	EventShopUpdatePlacements ClientEventType = "shop:updatePlacements"
	EventShopRemovePlacement  ClientEventType = "shop:removePlacement"
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

	// Furniture shop server events
	EventShopCatalog           ServerEventType = "shop:catalog"
	EventShopInventory         ServerEventType = "shop:inventory"
	EventShopPurchaseResult    ServerEventType = "shop:purchaseResult"
	EventShopPlacements        ServerEventType = "shop:placements"
	EventShopPlacementsUpdated ServerEventType = "shop:placementsUpdated"
	EventShopBalanceUpdate     ServerEventType = "shop:balanceUpdate"
	EventShopError             ServerEventType = "shop:error"
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

// ─── Furniture Shop Payloads ──────────────────────────────────────────────────

// ShopGetCatalogPayload is the client request to get catalog
type ShopGetCatalogPayload struct {
	CategoryID string `json:"categoryId,omitempty"`
	Rarity     string `json:"rarity,omitempty"`
	Search     string `json:"search,omitempty"`
}

// ShopProductItem is a compact product representation for WS
type ShopProductItem struct {
	ID           string `json:"id"`
	CategoryID   string `json:"categoryId"`
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	PriceCoins   int    `json:"priceCoins"`
	Rarity       string `json:"rarity"`
	SpriteURL    string `json:"spriteUrl"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	CanStack     bool   `json:"canStack"`
	OwnedQty     int    `json:"ownedQty,omitempty"`
}

// ShopCatalogPayload is the server response for catalog queries
type ShopCatalogPayload struct {
	Products []ShopProductItem `json:"products"`
	Total    int               `json:"total"`
}

// ShopPurchasePayload is the client request to purchase
type ShopPurchasePayload struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity,omitempty"`
}

// ShopPurchasedItem is one purchased item in the result
type ShopPurchasedItem struct {
	ProductID  string `json:"productId"`
	Quantity   int    `json:"quantity"`
	CoinsSpent int    `json:"coinsSpent"`
}

// ShopPurchaseResultPayload is the server response for a purchase
type ShopPurchaseResultPayload struct {
	Success          bool                `json:"success"`
	OrderID          string              `json:"orderId,omitempty"`
	Items            []ShopPurchasedItem `json:"items"`
	TotalCoinsSpent  int                 `json:"totalCoinsSpent"`
	RemainingBalance int                 `json:"remainingBalance"`
	Error            string              `json:"error,omitempty"`
	ErrorCode        string              `json:"code,omitempty"`
}

// ShopInventoryItem is an inventory item for WS
type ShopInventoryItem struct {
	ID               int64           `json:"id"`
	Product          ShopProductItem `json:"product"`
	Quantity         int             `json:"quantity"`
	FirstPurchasedAt string          `json:"firstPurchasedAt"`
	LastPurchasedAt  string          `json:"lastPurchasedAt"`
}

// ShopInventoryPayload is the server response for inventory queries
type ShopInventoryPayload struct {
	Items      []ShopInventoryItem `json:"items"`
	Total      int                 `json:"total"`
	TotalValue int                 `json:"totalValue"`
}

// ShopGetPlacementsPayload is the client request for placements
type ShopGetPlacementsPayload struct {
	RoomID string `json:"roomId,omitempty"`
}

// ShopPlacementItem is a placement for WS
type ShopPlacementItem struct {
	ID              int64           `json:"id"`
	InventoryItemID int64           `json:"inventoryItemId"`
	Product         ShopProductItem `json:"product"`
	X               int             `json:"x"`
	Y               int             `json:"y"`
	Rotation        int             `json:"rotation"`
	Layer           int             `json:"layer"`
}

// ShopPlacementsPayload is the server response for placements
type ShopPlacementsPayload struct {
	RoomID     string              `json:"roomId"`
	Placements []ShopPlacementItem `json:"placements"`
}

// ShopUpdatePlacementsPayload is the client request to update placements
type ShopUpdatePlacementsPayload struct {
	RoomID     string               `json:"roomId"`
	Placements []ShopPlacementInput `json:"placements"`
}

// ShopPlacementInput is one item in a placements update request
type ShopPlacementInput struct {
	InventoryItemID int64 `json:"inventoryItemId"`
	X               int   `json:"x"`
	Y               int   `json:"y"`
	Rotation        int   `json:"rotation"`
	Layer           int   `json:"layer"`
}

// ShopPlacementError is a per-item error in a batch placement update
type ShopPlacementError struct {
	Index int    `json:"index"`
	Error string `json:"error"`
}

// ShopPlacementsUpdatedPayload is the server response for placement updates
type ShopPlacementsUpdatedPayload struct {
	Success    bool                 `json:"success"`
	Placements []ShopPlacementItem  `json:"placements"`
	Errors     []ShopPlacementError `json:"errors,omitempty"`
}

// ShopBalanceUpdatePayload is broadcast after a purchase
type ShopBalanceUpdatePayload struct {
	UserID  string `json:"userId"`
	Balance int    `json:"balance"`
	Delta   int    `json:"delta"`
	Reason  string `json:"reason"`
}

// ShopRemovePlacementPayload is the client request to remove a placement
type ShopRemovePlacementPayload struct {
	PlacementID int64 `json:"placementId"`
}
