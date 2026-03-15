package rooms

import "encoding/json"

// RoomState represents the serializable state of a room
type RoomState struct {
	RoomID    string        `json:"roomId"`
	OwnerID   string        `json:"ownerId"`
	Occupants []OccupantInfo `json:"occupants"`
}

// OccupantInfo represents a user present in a room
type OccupantInfo struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

// RoomSnapshot is the full state sent to a client on connect or request
type RoomSnapshot struct {
	RoomID    string             `json:"roomId"`
	Owner     SnapshotOwner      `json:"owner"`
	Layout    json.RawMessage    `json:"layout"`
	Occupants []OccupantState    `json:"occupants"`
	Economy   SnapshotEconomy    `json:"economy"`
}

// SnapshotOwner identifies the room owner
type SnapshotOwner struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

// SnapshotEconomy contains economy data for the room snapshot
type SnapshotEconomy struct {
	OwnerCoins  int      `json:"ownerCoins"`
	ShopUnlocks []string `json:"shopUnlocks"`
}

// OccupantState represents a user in a room with their agents
type OccupantState struct {
	UserID      string             `json:"userId"`
	DisplayName string             `json:"displayName"`
	Agents      []RemoteAgentState `json:"agents"`
}

// RemoteAgentState represents one agent visible in a room
type RemoteAgentState struct {
	AgentLocalID      int     `json:"agentLocalId"`
	Palette           int     `json:"palette"`
	HueShift          int     `json:"hueShift"`
	SeatID            *string `json:"seatId"`
	Status            string  `json:"status"`
	CurrentTool       *string `json:"currentTool,omitempty"`
	ToolStatus        *string `json:"toolStatus,omitempty"`
	HasPermissionWait bool    `json:"hasPermissionWait,omitempty"`
	IsSubagent        bool    `json:"isSubagent,omitempty"`
	ParentAgentID     *int    `json:"parentAgentId,omitempty"`
}
