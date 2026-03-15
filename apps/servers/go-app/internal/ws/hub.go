package ws

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	"token-town/server/internal/economy"
)

// RoomManager provides room state operations (implemented by rooms.Manager)
type RoomManager interface {
	EnsureRoom(roomID, ownerID string)
	Join(roomID, userID string)
	Leave(roomID, userID string)
	BuildSnapshotJSON(ctx context.Context, roomID string) ([]byte, error)
}


var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: validate origin in production
	},
}

// Hub maintains all active WebSocket connections organized by room
type Hub struct {
	// rooms maps roomID -> set of clients
	rooms map[string]map[*Client]bool
	mu    sync.RWMutex

	// channels for hub management
	register   chan *Client
	unregister chan *Client
	broadcast  chan RoomMessage

	// RoomMgr provides room state queries (snapshots, occupants)
	RoomMgr RoomManager
	// DB for direct queries (room saves, etc.)
	DB *sql.DB
	// Shop handles purchase operations
	Shop *economy.ShopService
}

// RoomMessage is a message to be broadcast to a room
type RoomMessage struct {
	RoomID  string
	Payload []byte
	Exclude *Client // nil = broadcast to all in room
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client, 256),
		unregister: make(chan *Client, 256),
		broadcast:  make(chan RoomMessage, 1024),
	}
}

// Run starts the hub event loop (run in a goroutine)
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.RoomID] == nil {
				h.rooms[client.RoomID] = make(map[*Client]bool)
			}
			h.rooms[client.RoomID][client] = true
			h.mu.Unlock()
			log.Printf("[hub] client registered: user=%s room=%s", client.UserID, client.RoomID)

			// Join room in room manager and notify others
			if h.RoomMgr != nil {
				h.RoomMgr.EnsureRoom(client.RoomID, client.UserID)
				h.RoomMgr.Join(client.RoomID, client.UserID)
			}
			h.BroadcastToRoom(client.RoomID, EventPresenceJoined, PresencePayload{
				UserID:      client.UserID,
				DisplayName: client.UserID, // TODO: fetch display name from DB
				RoomID:      client.RoomID,
			}, client)

			// Send initial room snapshot
			go client.sendRoomSnapshot()

		case client := <-h.unregister:
			h.mu.Lock()
			if room, ok := h.rooms[client.RoomID]; ok {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.send)
					if len(room) == 0 {
						delete(h.rooms, client.RoomID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("[hub] client unregistered: user=%s room=%s", client.UserID, client.RoomID)

			// Leave room in room manager and notify others
			if h.RoomMgr != nil {
				h.RoomMgr.Leave(client.RoomID, client.UserID)
			}
			h.BroadcastToRoom(client.RoomID, EventPresenceLeft, PresencePayload{
				UserID: client.UserID,
				RoomID: client.RoomID,
			}, nil)

		case msg := <-h.broadcast:
			h.mu.RLock()
			room, ok := h.rooms[msg.RoomID]
			if ok {
				for client := range room {
					if client == msg.Exclude {
						continue
					}
					select {
					case client.send <- msg.Payload:
					default:
						// Buffer full — slow client, disconnect
						close(client.send)
						delete(room, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastToRoom sends a message to all clients in a room
func (h *Hub) BroadcastToRoom(roomID string, event ServerEventType, payload interface{}, exclude *Client) {
	data, err := json.Marshal(OutboundEvent{Event: event, Payload: payload})
	if err != nil {
		log.Printf("[hub] marshal error: %v", err)
		return
	}
	h.broadcast <- RoomMessage{RoomID: roomID, Payload: data, Exclude: exclude}
}

// SendToClient sends a message directly to one client
func (h *Hub) SendToClient(client *Client, event ServerEventType, payload interface{}) {
	data, err := json.Marshal(OutboundEvent{Event: event, Payload: payload})
	if err != nil {
		return
	}
	select {
	case client.send <- data:
	default:
	}
}

// ServeWS upgrades an HTTP connection to WebSocket
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[hub] upgrade error: %v", err)
		return
	}

	// TODO: extract userID from Authorization header after auth middleware
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		userID = "anonymous"
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		UserID: userID,
		RoomID: userID, // each user has their own room by default
	}

	h.register <- client

	go client.WritePump()
	go client.ReadPump()
}

// RoomCount returns the number of clients in a room
func (h *Hub) RoomCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.rooms[roomID])
}
