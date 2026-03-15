package rooms

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"sync"
)

// Manager tracks active rooms and their occupants
type Manager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
	db    *sql.DB
}

// Room represents a virtual room
type Room struct {
	ID        string
	OwnerID   string
	Occupants map[string]bool
}

// NewManager creates a new room manager
func NewManager(db *sql.DB) *Manager {
	return &Manager{
		rooms: make(map[string]*Room),
		db:    db,
	}
}

// EnsureRoom creates a room if it doesn't exist (satisfies ws.RoomManager interface)
func (m *Manager) EnsureRoom(roomID, ownerID string) {
	m.GetOrCreate(roomID, ownerID)
}

// GetOrCreate returns an existing room or creates a new one
func (m *Manager) GetOrCreate(roomID, ownerID string) *Room {
	m.mu.Lock()
	defer m.mu.Unlock()
	if room, ok := m.rooms[roomID]; ok {
		return room
	}
	room := &Room{
		ID:        roomID,
		OwnerID:   ownerID,
		Occupants: make(map[string]bool),
	}
	m.rooms[roomID] = room
	return room
}

// Join adds a user to a room
func (m *Manager) Join(roomID, userID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if room, ok := m.rooms[roomID]; ok {
		room.Occupants[userID] = true
	}
}

// Leave removes a user from a room
func (m *Manager) Leave(roomID, userID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if room, ok := m.rooms[roomID]; ok {
		delete(room.Occupants, userID)
		if len(room.Occupants) == 0 {
			delete(m.rooms, roomID)
		}
	}
}

// GetOccupantIDs returns the user IDs of all occupants in a room
func (m *Manager) GetOccupantIDs(roomID string) []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	room, ok := m.rooms[roomID]
	if !ok {
		return nil
	}
	ids := make([]string, 0, len(room.Occupants))
	for id := range room.Occupants {
		ids = append(ids, id)
	}
	return ids
}

// BuildSnapshot constructs a full RoomSnapshot for a given room
func (m *Manager) BuildSnapshot(ctx context.Context, roomID string) (*RoomSnapshot, error) {
	// Get room owner info
	var ownerID, ownerName string
	var ownerCoins int
	err := m.db.QueryRowContext(ctx,
		"SELECT id, display_name, coins FROM users WHERE id = $1", roomID,
	).Scan(&ownerID, &ownerName, &ownerCoins)
	if err != nil {
		// Room owner not found — use defaults
		ownerID = roomID
		ownerName = "Unknown"
		ownerCoins = 0
		log.Printf("[rooms] owner not found for room %s: %v", roomID, err)
	}

	// Get room layout
	var layoutData json.RawMessage
	err = m.db.QueryRowContext(ctx,
		"SELECT layout_data FROM room_layouts WHERE user_id = $1", roomID,
	).Scan(&layoutData)
	if err != nil {
		layoutData = json.RawMessage(`null`)
	}

	// Get occupant user IDs
	occupantIDs := m.GetOccupantIDs(roomID)

	// Build occupant states with their agents
	occupants := make([]OccupantState, 0, len(occupantIDs))
	for _, uid := range occupantIDs {
		var displayName string
		err := m.db.QueryRowContext(ctx,
			"SELECT display_name FROM users WHERE id = $1", uid,
		).Scan(&displayName)
		if err != nil {
			displayName = "Agent"
		}

		agents := m.queryAgents(ctx, uid)
		occupants = append(occupants, OccupantState{
			UserID:      uid,
			DisplayName: displayName,
			Agents:      agents,
		})
	}

	// Get shop unlocks (inventory item IDs for the room owner)
	shopUnlocks := m.queryShopUnlocks(ctx, roomID)

	return &RoomSnapshot{
		RoomID: roomID,
		Owner: SnapshotOwner{
			UserID:      ownerID,
			DisplayName: ownerName,
		},
		Layout:    layoutData,
		Occupants: occupants,
		Economy: SnapshotEconomy{
			OwnerCoins:  ownerCoins,
			ShopUnlocks: shopUnlocks,
		},
	}, nil
}

// BuildSnapshotJSON builds a snapshot and marshals it to JSON
func (m *Manager) BuildSnapshotJSON(ctx context.Context, roomID string) ([]byte, error) {
	snapshot, err := m.BuildSnapshot(ctx, roomID)
	if err != nil {
		return nil, err
	}
	return json.Marshal(snapshot)
}

// queryAgents fetches active agents for a user from the DB
func (m *Manager) queryAgents(ctx context.Context, userID string) []RemoteAgentState {
	rows, err := m.db.QueryContext(ctx,
		`SELECT agent_local_id, palette, hue_shift, seat_id, status, current_tool,
		        is_subagent, parent_agent_id
		 FROM agents WHERE user_id = $1`, userID,
	)
	if err != nil {
		log.Printf("[rooms] query agents error for user %s: %v", userID, err)
		return nil
	}
	defer rows.Close()

	var agents []RemoteAgentState
	for rows.Next() {
		var a RemoteAgentState
		var parentID sql.NullInt64
		err := rows.Scan(
			&a.AgentLocalID, &a.Palette, &a.HueShift, &a.SeatID,
			&a.Status, &a.CurrentTool, &a.IsSubagent, &parentID,
		)
		if err != nil {
			continue
		}
		if parentID.Valid {
			pid := int(parentID.Int64)
			a.ParentAgentID = &pid
		}
		agents = append(agents, a)
	}
	return agents
}

// queryShopUnlocks returns inventory item IDs owned by the room owner
func (m *Manager) queryShopUnlocks(ctx context.Context, userID string) []string {
	rows, err := m.db.QueryContext(ctx,
		"SELECT item_id FROM inventory WHERE user_id = $1", userID,
	)
	if err != nil {
		return []string{}
	}
	defer rows.Close()

	var items []string
	for rows.Next() {
		var itemID string
		if err := rows.Scan(&itemID); err == nil {
			items = append(items, itemID)
		}
	}
	if items == nil {
		items = []string{}
	}
	return items
}
