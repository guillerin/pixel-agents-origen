package rooms

import "sync"

// Manager tracks active rooms and their occupants
type Manager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
}

// Room represents a virtual room
type Room struct {
	ID        string
	OwnerID   string
	Occupants map[string]bool
}

// NewManager creates a new room manager
func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*Room),
	}
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
