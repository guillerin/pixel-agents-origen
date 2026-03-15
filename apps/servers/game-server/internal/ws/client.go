package ws

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"

	"token-town/server/internal/economy"
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
		c.sendRoomSnapshot()
	case EventRoomSaveLayout:
		c.handleRoomSave(event.Payload)
	case EventShopPurchase:
		c.handleShopPurchase(event.Payload)
	case EventTokenReport:
		c.handleTokenReport(event.Payload)
	default:
		log.Printf("[client] unknown event: %s", event.Event)
	}
}

// sendRoomSnapshot builds and sends a full room snapshot to this client
func (c *Client) sendRoomSnapshot() {
	if c.hub.RoomMgr == nil {
		c.hub.SendToClient(c, EventError, ErrorPayload{
			Code:    "snapshot_unavailable",
			Message: "room manager not configured",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	data, err := c.hub.RoomMgr.BuildSnapshotJSON(ctx, c.RoomID)
	if err != nil {
		log.Printf("[client] snapshot error for room=%s: %v", c.RoomID, err)
		c.hub.SendToClient(c, EventError, ErrorPayload{
			Code:    "snapshot_error",
			Message: "failed to build room snapshot",
		})
		return
	}

	// Send as raw JSON to avoid double-marshaling the layout
	outbound, _ := json.Marshal(OutboundEvent{
		Event:   EventRoomSnapshot,
		Payload: json.RawMessage(data),
	})
	select {
	case c.send <- outbound:
	default:
	}
}

// handleRoomSave persists the layout and broadcasts the update to room visitors
func (c *Client) handleRoomSave(payload map[string]interface{}) {
	if c.hub.DB == nil {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "no_db", Message: "database not available"})
		return
	}

	layoutRaw, ok := payload["layout"]
	if !ok {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "invalid_payload", Message: "layout field required"})
		return
	}

	layoutJSON, err := json.Marshal(layoutRaw)
	if err != nil {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "invalid_layout", Message: "failed to serialize layout"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = c.hub.DB.ExecContext(ctx,
		`INSERT INTO room_layouts (user_id, layout_data) VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE SET layout_data = EXCLUDED.layout_data, updated_at = NOW()`,
		c.UserID, layoutJSON,
	)
	if err != nil {
		log.Printf("[client] room save error user=%s: %v", c.UserID, err)
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "save_failed", Message: "failed to save layout"})
		return
	}

	// Broadcast layout update to other clients in the room
	c.hub.BroadcastToRoom(c.RoomID, EventRoomLayoutUpdate, map[string]interface{}{
		"userId": c.UserID,
		"layout": layoutRaw,
	}, c)
}

// handleShopPurchase processes a shop purchase and sends the result
func (c *Client) handleShopPurchase(payload map[string]interface{}) {
	if c.hub.Shop == nil {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "no_shop", Message: "shop not available"})
		return
	}

	itemID, _ := payload["itemId"].(string)
	if itemID == "" {
		c.hub.SendToClient(c, EventPurchaseResult, map[string]interface{}{
			"success": false,
			"error":   "itemId is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result := c.hub.Shop.Purchase(ctx, c.UserID, itemID)

	c.hub.SendToClient(c, EventPurchaseResult, result)

	if result.Success {
		// Broadcast coin update to the room
		c.hub.BroadcastToRoom(c.RoomID, EventCoinsUpdate, CoinsUpdatePayload{
			UserID:     c.UserID,
			TotalCoins: result.RemainingCoins,
			Delta:      0, // purchase delta is negative; broadcast just the new total
			Reason:     "purchase:" + itemID,
		}, nil)
	}
}

// handleTokenReport processes a token usage report via WS
func (c *Client) handleTokenReport(payload map[string]interface{}) {
	if c.hub.DB == nil {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "not_ready", Message: "server not ready"})
		return
	}

	// Parse the token report payload
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return
	}
	var report TokenReportPayload
	if err := json.Unmarshal(payloadJSON, &report); err != nil {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "invalid_payload", Message: "invalid token report"})
		return
	}

	if report.RequestID == "" {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "missing_request_id", Message: "requestId required"})
		return
	}

	usage := economy.TokenUsage{
		InputTokens:   report.InputTokens,
		OutputTokens:  report.OutputTokens,
		CacheCreation: report.CacheCreationTokens,
		CacheRead:     report.CacheReadTokens,
		Model:         report.Model,
	}

	if !economy.ValidateTokenReport(usage) {
		c.hub.SendToClient(c, EventError, ErrorPayload{Code: "invalid_tokens", Message: "token report out of bounds"})
		return
	}

	coins := economy.TokensToCoins(usage)
	if coins <= 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Atomic: dedup check + coin credit + dedup record in a single transaction
	wallet := economy.NewWalletService(c.hub.DB)
	newBalance, deduplicated, err := wallet.EarnCoinsWithDedup(ctx, c.UserID, report.RequestID, coins, "token_usage", map[string]any{
		"model":      report.Model,
		"request_id": report.RequestID,
		"session_id": report.SessionID,
	})
	if err != nil {
		log.Printf("[client] earn coins error user=%s: %v", c.UserID, err)
		return
	}
	if deduplicated {
		return
	}

	// Broadcast coin update to the room
	c.hub.BroadcastToRoom(c.RoomID, EventCoinsUpdate, CoinsUpdatePayload{
		UserID:     c.UserID,
		TotalCoins: newBalance,
		Delta:      coins,
		Reason:     "token_usage",
	}, nil)
}
