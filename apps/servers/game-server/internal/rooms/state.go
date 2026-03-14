package rooms

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
