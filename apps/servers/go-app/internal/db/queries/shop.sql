-- ============================================================================
-- SQLC Queries: Furniture Shop System
-- Schema: furniture_categories, furniture_products, user_furniture_inventory,
--         furniture_purchase_history, room_furniture_placements
-- ============================================================================

-- ─── Categories ──────────────────────────────────────────────────────────────

-- name: GetActiveCategories :many
SELECT id, name, display_name, description, icon_url, sort_order, is_active, created_at, updated_at
FROM furniture_categories
WHERE is_active = TRUE
ORDER BY sort_order ASC, name ASC;

-- name: GetAllCategories :many
SELECT id, name, display_name, description, icon_url, sort_order, is_active, created_at, updated_at
FROM furniture_categories
ORDER BY sort_order ASC, name ASC;

-- name: GetCategoryByID :one
SELECT id, name, display_name, description, icon_url, sort_order, is_active, created_at, updated_at
FROM furniture_categories
WHERE id = $1;

-- name: CreateCategory :one
INSERT INTO furniture_categories (id, name, display_name, description, icon_url, sort_order, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, display_name, description, icon_url, sort_order, is_active, created_at, updated_at;

-- name: UpdateCategory :one
UPDATE furniture_categories
SET
    name         = $2,
    display_name = $3,
    description  = $4,
    icon_url     = $5,
    sort_order   = $6,
    is_active    = $7
WHERE id = $1
RETURNING id, name, display_name, description, icon_url, sort_order, is_active, created_at, updated_at;

-- name: DeleteCategory :exec
DELETE FROM furniture_categories WHERE id = $1;

-- ─── Products ────────────────────────────────────────────────────────────────

-- name: GetShopCatalog :many
-- Returns all currently purchasable products with category info
SELECT
    p.id,
    p.category_id,
    c.name         AS category_name,
    c.display_name AS category_display_name,
    p.name,
    p.description,
    p.price_coins,
    p.rarity,
    p.width,
    p.height,
    p.can_stack,
    p.sprite_url,
    p.thumbnail_url,
    p.is_available,
    p.stock_quantity,
    p.max_per_user,
    p.tags,
    p.metadata,
    p.created_at,
    p.updated_at
FROM furniture_products p
JOIN furniture_categories c ON c.id = p.category_id
WHERE p.is_available = TRUE
  AND c.is_active = TRUE
  AND (p.available_from IS NULL OR p.available_from <= NOW())
  AND (p.available_until IS NULL OR p.available_until > NOW())
  AND (p.stock_quantity IS NULL OR p.stock_quantity > 0)
ORDER BY c.sort_order ASC, p.price_coins ASC;

-- name: GetProductsByCategory :many
SELECT
    p.id,
    p.category_id,
    p.name,
    p.description,
    p.price_coins,
    p.rarity,
    p.width,
    p.height,
    p.can_stack,
    p.sprite_url,
    p.thumbnail_url,
    p.is_available,
    p.stock_quantity,
    p.max_per_user,
    p.tags,
    p.metadata,
    p.created_at,
    p.updated_at
FROM furniture_products p
WHERE p.category_id = $1
  AND p.is_available = TRUE
  AND (p.available_from IS NULL OR p.available_from <= NOW())
  AND (p.available_until IS NULL OR p.available_until > NOW())
ORDER BY p.price_coins ASC;

-- name: GetProductByID :one
SELECT
    p.id,
    p.category_id,
    p.name,
    p.description,
    p.price_coins,
    p.rarity,
    p.width,
    p.height,
    p.can_stack,
    p.sprite_url,
    p.thumbnail_url,
    p.preview_url,
    p.is_available,
    p.available_from,
    p.available_until,
    p.stock_quantity,
    p.max_per_user,
    p.tags,
    p.metadata,
    p.created_at,
    p.updated_at
FROM furniture_products p
WHERE p.id = $1;

-- name: GetProductByIDForUpdate :one
-- Locks the row for atomic purchase transactions
SELECT
    p.id,
    p.category_id,
    p.price_coins,
    p.rarity,
    p.is_available,
    p.available_from,
    p.available_until,
    p.stock_quantity,
    p.max_per_user
FROM furniture_products p
WHERE p.id = $1
FOR UPDATE;

-- name: CreateProduct :one
INSERT INTO furniture_products (
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url, preview_url,
    is_available, available_from, available_until,
    stock_quantity, max_per_user, tags, metadata
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12,
    $13, $14, $15,
    $16, $17, $18, $19
)
RETURNING
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url, preview_url,
    is_available, available_from, available_until,
    stock_quantity, max_per_user, tags, metadata,
    created_at, updated_at;

-- name: UpdateProduct :one
UPDATE furniture_products
SET
    category_id     = $2,
    name            = $3,
    description     = $4,
    price_coins     = $5,
    rarity          = $6,
    width           = $7,
    height          = $8,
    can_stack       = $9,
    sprite_url      = $10,
    thumbnail_url   = $11,
    preview_url     = $12,
    is_available    = $13,
    available_from  = $14,
    available_until = $15,
    stock_quantity  = $16,
    max_per_user    = $17,
    tags            = $18,
    metadata        = $19
WHERE id = $1
RETURNING
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url, preview_url,
    is_available, available_from, available_until,
    stock_quantity, max_per_user, tags, metadata,
    created_at, updated_at;

-- name: DecrementProductStock :exec
-- Decrements stock_quantity (called inside purchase transaction)
UPDATE furniture_products
SET stock_quantity = stock_quantity - $2
WHERE id = $1 AND stock_quantity IS NOT NULL AND stock_quantity >= $2;

-- name: DeleteProduct :exec
DELETE FROM furniture_products WHERE id = $1;

-- name: GetPopularProducts :many
-- Most purchased products (admin analytics)
SELECT
    p.id,
    p.name,
    p.category_id,
    p.price_coins,
    p.rarity,
    COUNT(ph.id)                     AS purchase_count,
    COALESCE(SUM(ph.quantity), 0)    AS total_sold,
    COALESCE(SUM(ph.coins_spent), 0) AS total_revenue
FROM furniture_products p
LEFT JOIN furniture_purchase_history ph ON p.id = ph.product_id
GROUP BY p.id, p.name, p.category_id, p.price_coins, p.rarity
ORDER BY purchase_count DESC, total_sold DESC
LIMIT $1;

-- ─── Inventory ───────────────────────────────────────────────────────────────

-- name: GetUserInventory :many
SELECT
    i.id,
    i.user_id,
    i.product_id,
    i.quantity,
    i.first_purchased_at,
    i.last_purchased_at,
    p.category_id,
    p.name          AS product_name,
    p.price_coins,
    p.rarity,
    p.width,
    p.height,
    p.can_stack,
    p.sprite_url,
    p.thumbnail_url
FROM user_furniture_inventory i
JOIN furniture_products p ON p.id = i.product_id
WHERE i.user_id = $1
ORDER BY i.last_purchased_at DESC;

-- name: GetInventoryItem :one
SELECT id, user_id, product_id, quantity, first_purchased_at, last_purchased_at
FROM user_furniture_inventory
WHERE user_id = $1 AND product_id = $2;

-- name: GetInventoryItemCount :one
-- Returns quantity owned (0 if not owned) for max_per_user validation
SELECT COALESCE(quantity, 0)::integer AS count
FROM user_furniture_inventory
WHERE user_id = $1 AND product_id = $2;

-- name: UpsertInventoryItem :one
-- Adds to existing quantity or creates new inventory row
INSERT INTO user_furniture_inventory (user_id, product_id, quantity, last_purchased_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, product_id)
DO UPDATE SET
    quantity          = user_furniture_inventory.quantity + EXCLUDED.quantity,
    last_purchased_at = NOW()
RETURNING id, user_id, product_id, quantity, first_purchased_at, last_purchased_at;

-- ─── Purchase History ─────────────────────────────────────────────────────────

-- name: CreatePurchaseRecord :one
INSERT INTO furniture_purchase_history (
    user_id, product_id, quantity, coins_spent, balance_after, transaction_id, purchase_method, metadata
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, user_id, product_id, quantity, coins_spent, balance_after, transaction_id, purchase_method, purchased_at, metadata;

-- name: GetUserPurchaseHistory :many
SELECT
    ph.id,
    ph.user_id,
    ph.product_id,
    ph.quantity,
    ph.coins_spent,
    ph.balance_after,
    ph.transaction_id,
    ph.purchase_method,
    ph.purchased_at,
    ph.metadata,
    p.name       AS product_name,
    p.rarity,
    p.sprite_url,
    p.thumbnail_url
FROM furniture_purchase_history ph
JOIN furniture_products p ON p.id = ph.product_id
WHERE ph.user_id = $1
ORDER BY ph.purchased_at DESC
LIMIT $2 OFFSET $3;

-- name: GetProductPurchaseStats :one
-- For admin analytics
SELECT
    COUNT(*)                          AS total_purchases,
    COALESCE(SUM(quantity), 0)        AS total_quantity_sold,
    COALESCE(SUM(coins_spent), 0)     AS total_revenue,
    COUNT(DISTINCT user_id)           AS unique_buyers
FROM furniture_purchase_history
WHERE product_id = $1;

-- ─── Room Placements ─────────────────────────────────────────────────────────

-- name: GetRoomPlacements :many
SELECT
    fp.id,
    fp.user_id,
    fp.inventory_item_id,
    fp.x,
    fp.y,
    fp.rotation,
    fp.layer,
    fp.room_id,
    fp.placed_at,
    fp.updated_at,
    i.product_id,
    p.name          AS product_name,
    p.width,
    p.height,
    p.can_stack,
    p.sprite_url,
    p.thumbnail_url
FROM room_furniture_placements fp
JOIN user_furniture_inventory i ON i.id = fp.inventory_item_id
JOIN furniture_products p ON p.id = i.product_id
WHERE fp.user_id = $1 AND fp.room_id = $2
ORDER BY fp.layer ASC, fp.y ASC, fp.x ASC;

-- name: InsertPlacement :one
INSERT INTO room_furniture_placements (user_id, inventory_item_id, x, y, rotation, layer, room_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, user_id, inventory_item_id, x, y, rotation, layer, room_id, placed_at, updated_at;

-- name: UpdatePlacementPosition :exec
UPDATE room_furniture_placements
SET x = $3, y = $4, rotation = $5, layer = $6
WHERE id = $1 AND user_id = $2;

-- name: DeletePlacement :exec
DELETE FROM room_furniture_placements
WHERE id = $1 AND user_id = $2;

-- name: DeleteRoomPlacements :exec
-- Clears all placements for a user's room (used for full-replace saves)
DELETE FROM room_furniture_placements
WHERE user_id = $1 AND room_id = $2;

-- name: GetPlacementByID :one
SELECT
    fp.id,
    fp.user_id,
    fp.inventory_item_id,
    fp.x,
    fp.y,
    fp.rotation,
    fp.layer,
    fp.room_id,
    fp.placed_at,
    fp.updated_at
FROM room_furniture_placements fp
WHERE fp.id = $1;
