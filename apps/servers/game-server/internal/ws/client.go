package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10 // ~54s
	maxMessageSize = 4096
)

// Client represents a single WebSocket connection
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	UserID string
	RoomID string
}

// ReadPump pumps messages from the WebSocket to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[client] read error: %v", err)
			}
			break
		}

		var event InboundEvent
		if err := json.Unmarshal(message, &event); err != nil {
			log.Printf("[client] unmarshal error: %v", err)
			continue
		}

		c.handleEvent(event)
	}
}

// WritePump pumps messages from the hub to the WebSocket
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleEvent routes inbound events to the appropriate handler
func (c *Client) handleEvent(event InboundEvent) {
	switch event.Event {
	case EventAgentActivity:
		// TODO: throttle + broadcast to room
		c.hub.BroadcastToRoom(c.RoomID, EventRemoteAgentActivity, event.Payload, c)
	case EventAgentCreated:
		c.hub.BroadcastToRoom(c.RoomID, EventRemoteAgentCreated, event.Payload, c)
	case EventAgentClosed:
		c.hub.BroadcastToRoom(c.RoomID, EventRemoteAgentClosed, event.Payload, c)
	case EventSubagentCreated:
		c.hub.BroadcastToRoom(c.RoomID, EventRemoteSubagentCreated, event.Payload, c)
	case EventSubagentClosed:
		c.hub.BroadcastToRoom(c.RoomID, EventRemoteSubagentClosed, event.Payload, c)
	case EventRoomReqSnapshot:
		// TODO: fetch room state from DB and send snapshot
		c.hub.SendToClient(c, EventRoomSnapshot, map[string]interface{}{
			"roomId":    c.RoomID,
			"occupants": []interface{}{},
		})
	case EventTokenReport:
		// TODO: process token report → calculate coins → update DB → broadcast CoinsUpdate
		log.Printf("[client] token report from user=%s", c.UserID)
	default:
		log.Printf("[client] unknown event: %s", event.Event)
	}
}
