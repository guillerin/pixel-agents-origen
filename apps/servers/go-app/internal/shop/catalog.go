package shop

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// FurnitureCategory represents a furniture category
type FurnitureCategory struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"displayName"`
	Description string    `json:"description,omitempty"`
	IconURL     string    `json:"iconUrl,omitempty"`
	SortOrder   int       `json:"sortOrder"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// FurnitureProduct represents a furniture product
type FurnitureProduct struct {
	ID             string    `json:"id"`
	CategoryID     string    `json:"categoryId"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	PriceCoins     int       `json:"priceCoins"`
	Rarity         string    `json:"rarity"`
	SpriteURL      string    `json:"spriteUrl"`
	ThumbnailURL   string    `json:"thumbnailUrl,omitempty"`
	PreviewURL     string    `json:"previewUrl,omitempty"`
	Width          int       `json:"width"`
	Height         int       `json:"height"`
	CanStack       bool      `json:"canStack"`
	IsAvailable    bool      `json:"isAvailable"`
	AvailableFrom  *time.Time `json:"availableFrom,omitempty"`
	AvailableUntil *time.Time `json:"availableUntil,omitempty"`
	MaxPerUser     *int      `json:"maxPerUser,omitempty"`
	StockQuantity  *int      `json:"stockQuantity,omitempty"`
	Tags           []string  `json:"tags"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// ProductDetail extends FurnitureProduct with category and ownership info
type ProductDetail struct {
	FurnitureProduct
	Category      FurnitureCategory `json:"category"`
	OwnedQuantity int               `json:"ownedQuantity,omitempty"`
}

// ProductListResponse is the paginated product list response
type ProductListResponse struct {
	Products []FurnitureProduct `json:"products"`
	Total    int                `json:"total"`
	Limit    int                `json:"limit"`
	Offset   int                `json:"offset"`
}

// ProductFilters holds filter/sort parameters for product listing
type ProductFilters struct {
	CategoryID string
	Rarity     string
	MinPrice   int
	MaxPrice   int
	Search     string
	Sort       string
	Limit      int
	Offset     int
}

// CatalogService handles furniture catalog queries
type CatalogService struct {
	db *sql.DB
}

// NewCatalogService creates a new CatalogService
func NewCatalogService(db *sql.DB) *CatalogService {
	return &CatalogService{db: db}
}

// DB returns the underlying database connection
func (s *CatalogService) DB() *sql.DB {
	return s.db
}

// GetCategories returns all active furniture categories
func (s *CatalogService) GetCategories(ctx context.Context) ([]FurnitureCategory, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, display_name, COALESCE(description, ''), COALESCE(icon_url, ''),
		        sort_order, is_active, created_at, updated_at
		 FROM furniture_categories
		 WHERE is_active = TRUE
		 ORDER BY sort_order ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	var cats []FurnitureCategory
	for rows.Next() {
		var c FurnitureCategory
		if err := rows.Scan(
			&c.ID, &c.Name, &c.DisplayName, &c.Description, &c.IconURL,
			&c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

// GetProducts returns a filtered, paginated list of available products
func (s *CatalogService) GetProducts(ctx context.Context, f ProductFilters) (ProductListResponse, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}

	conditions := []string{"p.is_available = TRUE"}
	args := []any{}
	argIdx := 1

	if f.CategoryID != "" {
		conditions = append(conditions, fmt.Sprintf("p.category_id = $%d", argIdx))
		args = append(args, f.CategoryID)
		argIdx++
	}
	if f.Rarity != "" {
		conditions = append(conditions, fmt.Sprintf("p.rarity = $%d", argIdx))
		args = append(args, f.Rarity)
		argIdx++
	}
	if f.MinPrice > 0 {
		conditions = append(conditions, fmt.Sprintf("p.price_coins >= $%d", argIdx))
		args = append(args, f.MinPrice)
		argIdx++
	}
	if f.MaxPrice > 0 {
		conditions = append(conditions, fmt.Sprintf("p.price_coins <= $%d", argIdx))
		args = append(args, f.MaxPrice)
		argIdx++
	}
	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(p.name ILIKE $%d OR p.description ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	orderBy := "p.name ASC"
	switch f.Sort {
	case "price_asc":
		orderBy = "p.price_coins ASC"
	case "price_desc":
		orderBy = "p.price_coins DESC"
	case "rarity":
		orderBy = "CASE p.rarity WHEN 'legendary' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END ASC"
	case "newest":
		orderBy = "p.created_at DESC"
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM furniture_products p %s", where)
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return ProductListResponse{}, fmt.Errorf("count products: %w", err)
	}

	// Data query with pagination
	args = append(args, f.Limit, f.Offset)
	dataQuery := fmt.Sprintf(`
		SELECT p.id, p.category_id, p.name, COALESCE(p.description, ''),
		       p.price_coins, p.rarity, p.sprite_url,
		       COALESCE(p.thumbnail_url, ''), COALESCE(p.preview_url, ''),
		       p.width, p.height, p.can_stack, p.is_available,
		       p.available_from, p.available_until,
		       p.max_per_user, p.stock_quantity,
		       COALESCE(p.tags, '{}'), p.created_at, p.updated_at
		FROM furniture_products p
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		where, orderBy, argIdx, argIdx+1,
	)

	rows, err := s.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return ProductListResponse{}, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	products, err := scanProducts(rows)
	if err != nil {
		return ProductListResponse{}, err
	}

	return ProductListResponse{
		Products: products,
		Total:    total,
		Limit:    f.Limit,
		Offset:   f.Offset,
	}, nil
}

// GetProductByID returns detailed product info, optionally with ownership quantity for a user
func (s *CatalogService) GetProductByID(ctx context.Context, productID, userID string) (*ProductDetail, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT p.id, p.category_id, p.name, COALESCE(p.description, ''),
		       p.price_coins, p.rarity, p.sprite_url,
		       COALESCE(p.thumbnail_url, ''), COALESCE(p.preview_url, ''),
		       p.width, p.height, p.can_stack, p.is_available,
		       p.available_from, p.available_until,
		       p.max_per_user, p.stock_quantity,
		       COALESCE(p.tags, '{}'), p.created_at, p.updated_at,
		       c.id, c.name, c.display_name, COALESCE(c.description, ''),
		       COALESCE(c.icon_url, ''), c.sort_order, c.is_active, c.created_at, c.updated_at
		FROM furniture_products p
		JOIN furniture_categories c ON c.id = p.category_id
		WHERE p.id = $1`,
		productID,
	)

	var d ProductDetail
	p := &d.FurnitureProduct
	c := &d.Category
	var tags pgArray
	err := row.Scan(
		&p.ID, &p.CategoryID, &p.Name, &p.Description,
		&p.PriceCoins, &p.Rarity, &p.SpriteURL,
		&p.ThumbnailURL, &p.PreviewURL,
		&p.Width, &p.Height, &p.CanStack, &p.IsAvailable,
		&p.AvailableFrom, &p.AvailableUntil,
		&p.MaxPerUser, &p.StockQuantity,
		&tags, &p.CreatedAt, &p.UpdatedAt,
		&c.ID, &c.Name, &c.DisplayName, &c.Description,
		&c.IconURL, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	p.Tags = []string(tags)

	if userID != "" {
		s.db.QueryRowContext(ctx,
			"SELECT COALESCE(quantity, 0) FROM user_furniture_inventory WHERE user_id = $1 AND product_id = $2",
			userID, productID,
		).Scan(&d.OwnedQuantity)
	}

	return &d, nil
}

// scanProducts scans rows into a slice of FurnitureProduct
func scanProducts(rows *sql.Rows) ([]FurnitureProduct, error) {
	var products []FurnitureProduct
	for rows.Next() {
		var p FurnitureProduct
		var tags pgArray
		if err := rows.Scan(
			&p.ID, &p.CategoryID, &p.Name, &p.Description,
			&p.PriceCoins, &p.Rarity, &p.SpriteURL,
			&p.ThumbnailURL, &p.PreviewURL,
			&p.Width, &p.Height, &p.CanStack, &p.IsAvailable,
			&p.AvailableFrom, &p.AvailableUntil,
			&p.MaxPerUser, &p.StockQuantity,
			&tags, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		p.Tags = []string(tags)
		products = append(products, p)
	}
	return products, rows.Err()
}
