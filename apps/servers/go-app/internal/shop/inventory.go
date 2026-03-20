package shop

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// InventoryItem represents a user's owned furniture item
type InventoryItem struct {
	ID              int64            `json:"id"`
	UserID          string           `json:"userId"`
	Product         FurnitureProduct `json:"product"`
	Quantity        int              `json:"quantity"`
	FirstPurchasedAt time.Time       `json:"firstPurchasedAt"`
	LastPurchasedAt  time.Time       `json:"lastPurchasedAt"`
}

// InventoryResponse is the response for inventory queries
type InventoryResponse struct {
	Items      []InventoryItem `json:"items"`
	Total      int             `json:"total"`
	TotalValue int             `json:"totalValue"`
}

// InventoryService handles user furniture inventory
type InventoryService struct {
	db *sql.DB
}

// NewInventoryService creates a new InventoryService
func NewInventoryService(db *sql.DB) *InventoryService {
	return &InventoryService{db: db}
}

// GetUserInventory returns all inventory items for a user with optional filters
func (s *InventoryService) GetUserInventory(ctx context.Context, userID, categoryID, search string) (InventoryResponse, error) {
	query := `
		SELECT i.id, i.user_id, i.quantity, i.first_purchased_at, i.last_purchased_at,
		       p.id, p.category_id, p.name, COALESCE(p.description, ''),
		       p.price_coins, p.rarity, p.sprite_url,
		       COALESCE(p.thumbnail_url, ''), COALESCE(p.preview_url, ''),
		       p.width, p.height, p.can_stack, p.is_available,
		       p.available_from, p.available_until,
		       p.max_per_user, p.stock_quantity,
		       COALESCE(p.tags, '{}'), p.created_at, p.updated_at
		FROM user_furniture_inventory i
		JOIN furniture_products p ON p.id = i.product_id
		WHERE i.user_id = $1`

	args := []any{userID}
	argIdx := 2

	if categoryID != "" {
		query += fmt.Sprintf(" AND p.category_id = $%d", argIdx)
		args = append(args, categoryID)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (p.name ILIKE $%d OR p.description ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += " ORDER BY i.last_purchased_at DESC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return InventoryResponse{}, fmt.Errorf("query inventory: %w", err)
	}
	defer rows.Close()

	var items []InventoryItem
	totalValue := 0
	for rows.Next() {
		var item InventoryItem
		var p FurnitureProduct
		var tags pgArray
		err := rows.Scan(
			&item.ID, &item.UserID, &item.Quantity,
			&item.FirstPurchasedAt, &item.LastPurchasedAt,
			&p.ID, &p.CategoryID, &p.Name, &p.Description,
			&p.PriceCoins, &p.Rarity, &p.SpriteURL,
			&p.ThumbnailURL, &p.PreviewURL,
			&p.Width, &p.Height, &p.CanStack, &p.IsAvailable,
			&p.AvailableFrom, &p.AvailableUntil,
			&p.MaxPerUser, &p.StockQuantity,
			&tags, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return InventoryResponse{}, fmt.Errorf("scan inventory item: %w", err)
		}
		p.Tags = []string(tags)
		item.Product = p
		totalValue += p.PriceCoins * item.Quantity
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return InventoryResponse{}, err
	}

	return InventoryResponse{
		Items:      items,
		Total:      len(items),
		TotalValue: totalValue,
	}, nil
}

// GetInventoryItem returns a single inventory item by ID, validating ownership
func (s *InventoryService) GetInventoryItem(ctx context.Context, inventoryItemID int64, userID string) (*InventoryItem, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT i.id, i.user_id, i.quantity, i.first_purchased_at, i.last_purchased_at,
		       p.id, p.category_id, p.name, COALESCE(p.description, ''),
		       p.price_coins, p.rarity, p.sprite_url,
		       COALESCE(p.thumbnail_url, ''), COALESCE(p.preview_url, ''),
		       p.width, p.height, p.can_stack, p.is_available,
		       p.available_from, p.available_until,
		       p.max_per_user, p.stock_quantity,
		       COALESCE(p.tags, '{}'), p.created_at, p.updated_at
		FROM user_furniture_inventory i
		JOIN furniture_products p ON p.id = i.product_id
		WHERE i.id = $1 AND i.user_id = $2`,
		inventoryItemID, userID,
	)

	var item InventoryItem
	var p FurnitureProduct
	var tags pgArray
	err := row.Scan(
		&item.ID, &item.UserID, &item.Quantity,
		&item.FirstPurchasedAt, &item.LastPurchasedAt,
		&p.ID, &p.CategoryID, &p.Name, &p.Description,
		&p.PriceCoins, &p.Rarity, &p.SpriteURL,
		&p.ThumbnailURL, &p.PreviewURL,
		&p.Width, &p.Height, &p.CanStack, &p.IsAvailable,
		&p.AvailableFrom, &p.AvailableUntil,
		&p.MaxPerUser, &p.StockQuantity,
		&tags, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get inventory item: %w", err)
	}
	p.Tags = []string(tags)
	item.Product = p
	return &item, nil
}
