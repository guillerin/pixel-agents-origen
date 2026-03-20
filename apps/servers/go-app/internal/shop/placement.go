package shop

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// FurniturePlacement represents a placed furniture item in a room
type FurniturePlacement struct {
	ID              int64            `json:"id"`
	UserID          string           `json:"userId"`
	InventoryItemID int64            `json:"inventoryItemId"`
	Product         FurnitureProduct `json:"product"`
	X               int              `json:"x"`
	Y               int              `json:"y"`
	Rotation        int              `json:"rotation"`
	Layer           int              `json:"layer"`
	RoomID          string           `json:"roomId"`
	PlacedAt        time.Time        `json:"placedAt"`
	UpdatedAt       time.Time        `json:"updatedAt"`
}

// PlacementUpdate is a single item in a batch placement update
type PlacementUpdate struct {
	InventoryItemID int64 `json:"inventoryItemId"`
	X               int   `json:"x"`
	Y               int   `json:"y"`
	Rotation        int   `json:"rotation"`
	Layer           int   `json:"layer"`
}

// PlacementError describes a validation error for a specific placement in a batch
type PlacementError struct {
	Index int    `json:"index"`
	Error string `json:"error"`
}

// UpdatePlacementsResult is the result of a batch placement update
type UpdatePlacementsResult struct {
	Success    bool                 `json:"success"`
	Placements []FurniturePlacement `json:"placements"`
	Errors     []PlacementError     `json:"errors,omitempty"`
}

// PlacementService handles furniture placement in rooms
type PlacementService struct {
	db *sql.DB
}

// NewPlacementService creates a new PlacementService
func NewPlacementService(db *sql.DB) *PlacementService {
	return &PlacementService{db: db}
}

// GetPlacements returns all furniture placements for a user in a room
func (s *PlacementService) GetPlacements(ctx context.Context, userID, roomID string) ([]FurniturePlacement, error) {
	if roomID == "" {
		roomID = "main"
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT fp.id, fp.user_id, fp.inventory_item_id,
		       fp.x, fp.y, fp.rotation, fp.layer, fp.room_id,
		       fp.placed_at, fp.updated_at,
		       p.id, p.category_id, p.name, COALESCE(p.description, ''),
		       p.price_coins, p.rarity, p.sprite_url,
		       COALESCE(p.thumbnail_url, ''), COALESCE(p.preview_url, ''),
		       p.width, p.height, p.can_stack, p.is_available,
		       p.available_from, p.available_until,
		       p.max_per_user, p.stock_quantity,
		       COALESCE(p.tags, '{}'), p.created_at, p.updated_at
		FROM room_furniture_placements fp
		JOIN user_furniture_inventory ui ON ui.id = fp.inventory_item_id
		JOIN furniture_products p ON p.id = ui.product_id
		WHERE fp.user_id = $1 AND fp.room_id = $2
		ORDER BY fp.layer ASC, fp.y ASC, fp.x ASC`,
		userID, roomID,
	)
	if err != nil {
		return nil, fmt.Errorf("query placements: %w", err)
	}
	defer rows.Close()

	return scanPlacements(rows)
}

// UpdatePlacements replaces all placements for a user/room with the provided batch.
// Validates ownership before applying. Returns partial success with errors per item.
func (s *PlacementService) UpdatePlacements(ctx context.Context, userID, roomID string, updates []PlacementUpdate) UpdatePlacementsResult {
	if roomID == "" {
		roomID = "main"
	}

	// Validate all inventory items belong to user before starting transaction
	var errs []PlacementError
	validUpdates := make([]PlacementUpdate, 0, len(updates))
	validIndices := make([]int, 0, len(updates))

	for i, u := range updates {
		if !isValidRotation(u.Rotation) {
			errs = append(errs, PlacementError{Index: i, Error: "rotation must be 0, 90, 180, or 270"})
			continue
		}
		if u.X < 0 || u.Y < 0 {
			errs = append(errs, PlacementError{Index: i, Error: "position coordinates must be non-negative"})
			continue
		}

		var ownerID string
		err := s.db.QueryRowContext(ctx,
			"SELECT user_id FROM user_furniture_inventory WHERE id = $1",
			u.InventoryItemID,
		).Scan(&ownerID)
		if err == sql.ErrNoRows {
			errs = append(errs, PlacementError{Index: i, Error: "inventory item not found"})
			continue
		}
		if err != nil {
			errs = append(errs, PlacementError{Index: i, Error: "database error"})
			continue
		}
		if ownerID != userID {
			errs = append(errs, PlacementError{Index: i, Error: "inventory item does not belong to user"})
			continue
		}
		validUpdates = append(validUpdates, u)
		validIndices = append(validIndices, i)
	}

	if len(validUpdates) == 0 && len(errs) > 0 {
		return UpdatePlacementsResult{Success: false, Placements: []FurniturePlacement{}, Errors: errs}
	}

	// Transaction: delete existing placements, insert new ones
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return UpdatePlacementsResult{Success: false, Errors: []PlacementError{{Index: -1, Error: "transaction error"}}}
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		"DELETE FROM room_furniture_placements WHERE user_id = $1 AND room_id = $2",
		userID, roomID,
	)
	if err != nil {
		return UpdatePlacementsResult{Success: false, Errors: []PlacementError{{Index: -1, Error: "failed to clear placements"}}}
	}

	for _, u := range validUpdates {
		_, err := tx.ExecContext(ctx,
			`INSERT INTO room_furniture_placements
			 (user_id, inventory_item_id, x, y, rotation, layer, room_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			userID, u.InventoryItemID, u.X, u.Y, u.Rotation, u.Layer, roomID,
		)
		if err != nil {
			return UpdatePlacementsResult{Success: false, Errors: []PlacementError{{Index: -1, Error: "failed to insert placement"}}}
		}
	}

	if err := tx.Commit(); err != nil {
		return UpdatePlacementsResult{Success: false, Errors: []PlacementError{{Index: -1, Error: "commit failed"}}}
	}

	// Fetch the final placements
	placements, err := s.GetPlacements(ctx, userID, roomID)
	if err != nil {
		placements = []FurniturePlacement{}
	}

	return UpdatePlacementsResult{
		Success:    true,
		Placements: placements,
		Errors:     errs,
	}
}

// RemovePlacement deletes a specific placement, validating ownership
func (s *PlacementService) RemovePlacement(ctx context.Context, userID string, placementID int64) error {
	result, err := s.db.ExecContext(ctx,
		"DELETE FROM room_furniture_placements WHERE id = $1 AND user_id = $2",
		placementID, userID,
	)
	if err != nil {
		return fmt.Errorf("delete placement: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return fmt.Errorf("placement not found")
	}
	return nil
}

// scanPlacements scans rows into a slice of FurniturePlacement
func scanPlacements(rows *sql.Rows) ([]FurniturePlacement, error) {
	var placements []FurniturePlacement
	for rows.Next() {
		var fp FurniturePlacement
		var p FurnitureProduct
		var tags pgArray
		err := rows.Scan(
			&fp.ID, &fp.UserID, &fp.InventoryItemID,
			&fp.X, &fp.Y, &fp.Rotation, &fp.Layer, &fp.RoomID,
			&fp.PlacedAt, &fp.UpdatedAt,
			&p.ID, &p.CategoryID, &p.Name, &p.Description,
			&p.PriceCoins, &p.Rarity, &p.SpriteURL,
			&p.ThumbnailURL, &p.PreviewURL,
			&p.Width, &p.Height, &p.CanStack, &p.IsAvailable,
			&p.AvailableFrom, &p.AvailableUntil,
			&p.MaxPerUser, &p.StockQuantity,
			&tags, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan placement: %w", err)
		}
		p.Tags = []string(tags)
		fp.Product = p
		placements = append(placements, fp)
	}
	return placements, rows.Err()
}

func isValidRotation(r int) bool {
	return r == 0 || r == 90 || r == 180 || r == 270
}
