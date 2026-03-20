-- ============================================================================
-- SQLC Query Specifications for Furniture Shop System
-- ============================================================================
-- These queries follow SQLC conventions. Place in:
--   apps/servers/go-app/internal/db/queries/shop.sql
-- ============================================================================

-- name: GetShopCatalog :many
-- Returns all available shop items with category information
SELECT
    id,
    name,
    description,
    category,
    price,
    rarity,
    is_available,
    max_per_user,
    footprint_w,
    footprint_h,
    sprite_width,
    sprite_height,
    is_desk,
    can_place_on_surfaces,
    can_place_on_walls,
    background_tiles,
    rotation_group_id,
    orientation,
    state_group_id,
    default_state,
    animation_group_id,
    metadata
FROM shop_items
WHERE is_available = TRUE
ORDER BY category, price;

-- name: GetShopItemByCategory :many
SELECT * FROM shop_items
WHERE category = $1 AND is_available = TRUE
ORDER BY price;

-- name: GetShopItemByID :one
SELECT * FROM shop_items WHERE id = $1;

-- name: GetUserInventory :many
SELECT
    i.id,
    i.item_id,
    i.quantity,
    i.purchased_at,
    i.color_override,
    i.current_state,
    si.name,
    si.category,
    si.price,
    si.footprint_w,
    si.footprint_h,
    si.is_desk,
    si.can_place_on_surfaces,
    si.can_place_on_walls,
    si.background_tiles,
    si.rotation_group_id,
    si.state_group_id
FROM inventory i
JOIN shop_items si ON i.item_id = si.id
WHERE i.user_id = $1
ORDER BY i.purchased_at DESC;

-- name: GetInventoryItem :one
SELECT * FROM inventory
WHERE user_id = $1 AND item_id = $2;

-- name: GetUserItemCount :one
-- Returns quantity of a specific item owned by user (for max_per_user check)
SELECT COALESCE(quantity, 0) as count
FROM inventory
WHERE user_id = $1 AND item_id = $2;

-- name: CreateInventoryItem :one
INSERT INTO inventory (user_id, item_id, quantity, current_state)
VALUES ($1, $2, 1, $3)
ON CONFLICT (user_id, item_id)
DO UPDATE SET quantity = inventory.quantity + 1
RETURNING *;

-- name: UpdateInventoryItemQuantity :one
UPDATE inventory
SET quantity = quantity + $1
WHERE user_id = $2 AND item_id = $3
RETURNING *;

-- name: UpdateInventoryItemState :exec
UPDATE inventory
SET current_state = $1
WHERE user_id = $2 AND item_id = $3;

-- name: CreatePlacedFurniture :one
INSERT INTO placed_furniture (
    room_id, user_id, item_id, uid, col, row,
    color_h, color_s, color_b, color_c, colorize, current_state
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
RETURNING *;

-- name: GetPlacedFurnitureByRoom :many
SELECT
    pf.id,
    pf.uid,
    pf.item_id,
    pf.col,
    pf.row,
    pf.color_h,
    pf.color_s,
    pf.color_b,
    pf.color_c,
    pf.colorize,
    pf.current_state,
    si.footprint_w,
    si.footprint_h,
    si.is_desk,
    si.background_tiles,
    si.rotation_group_id,
    si.orientation,
    si.state_group_id
FROM placed_furniture pf
JOIN shop_items si ON pf.item_id = si.id
WHERE pf.room_id = $1
ORDER BY pf.row, pf.col;

-- name: GetPlacedFurnitureByUID :one
SELECT * FROM placed_furniture
WHERE room_id = $1 AND uid = $2;

-- name: UpdatePlacedFurniture :exec
UPDATE placed_furniture
SET
    col = $2,
    row = $3,
    color_h = $4,
    color_s = $5,
    color_b = $6,
    color_c = $7,
    colorize = $8,
    current_state = $9
WHERE room_id = $1 AND uid = $10;

-- name: DeletePlacedFurniture :exec
DELETE FROM placed_furniture
WHERE room_id = $1 AND uid = $2;

-- name: ClearRoomFurniture :exec
DELETE FROM placed_furniture
WHERE room_id = $1 AND user_id = $2;

-- name: CreateFurnitureCategory :one
INSERT INTO furniture_categories (id, label, sort_order, icon_emoji, is_unlocked)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetFurnitureCategories :many
SELECT * FROM furniture_categories
WHERE is_unlocked = TRUE
ORDER BY sort_order;

-- name: GetAllFurnitureCategories :many
-- Admin endpoint to get all categories including locked ones
SELECT * FROM furniture_categories
ORDER BY sort_order;

-- name: CreateShopPurchase :one
INSERT INTO shop_purchases (user_id, item_id, quantity, price_paid, coins_before, coins_after)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetUserPurchaseHistory :many
SELECT
    sp.*,
    si.name as item_name,
    si.category
FROM shop_purchases sp
JOIN shop_items si ON sp.item_id = si.id
WHERE sp.user_id = $1
ORDER BY sp.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetItemPurchaseStats :one
-- Returns statistics about an item (for admin analytics)
SELECT
    COUNT(*) as total_purchases,
    COALESCE(SUM(quantity), 0) as total_quantity_sold,
    COALESCE(SUM(price_paid), 0) as total_revenue
FROM shop_purchases
WHERE item_id = $1;

-- name: GetPopularItems :many
-- Returns most purchased items
SELECT
    si.id,
    si.name,
    si.category,
    si.price,
    COUNT(sp.id) as purchase_count,
    COALESCE(SUM(sp.quantity), 0) as total_sold
FROM shop_items si
LEFT JOIN shop_purchases sp ON si.id = sp.item_id
WHERE si.is_available = TRUE
GROUP BY si.id
ORDER BY purchase_count DESC, total_sold DESC
LIMIT $1;

-- name: GetRotatableItems :many
-- Returns all items that belong to rotation groups
SELECT DISTINCT ON (rotation_group_id)
    id,
    name,
    rotation_group_id,
    orientation
FROM shop_items
WHERE rotation_group_id IS NOT NULL AND is_available = TRUE;

-- name: GetRotationGroup :many
-- Returns all items in a rotation group
SELECT * FROM shop_items
WHERE rotation_group_id = $1 AND is_available = TRUE
ORDER BY
    CASE orientation
        WHEN 'front' THEN 1
        WHEN 'right' THEN 2
        WHEN 'back' THEN 3
        WHEN 'left' THEN 4
        ELSE 5
    END;

-- name: GetStateGroupVariants :many
-- Returns on/off variants for an item
SELECT * FROM shop_items
WHERE state_group_id = $1
ORDER BY default_state DESC;

-- name: CreateFurnitureAsset :one
INSERT INTO furniture_assets (id, item_id, asset_type, asset_data, frame_number, is_default)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetFurnitureAsset :one
SELECT * FROM furniture_assets WHERE id = $1;

-- name: GetFurnitureAssetsByItem :many
SELECT * FROM furniture_assets
WHERE item_id = $1
ORDER BY asset_type, frame_number;

-- name: GetUserRoomLayout :one
SELECT layout_data FROM room_layouts
WHERE user_id = $1;

-- name: SaveUserRoomLayout :exec
INSERT INTO room_layouts (user_id, layout_data)
VALUES ($1, $2)
ON CONFLICT (user_id)
DO UPDATE SET layout_data = EXCLUDED.layout_data, updated_at = NOW();

-- name: GetUserCoins :one
SELECT coins FROM users WHERE id = $1;

-- name: DeductUserCoins :one
-- Note: This should be used within a transaction
UPDATE users
SET coins = coins - $1, updated_at = NOW()
WHERE id = $2 AND coins >= $1
RETURNING coins;

-- name: AddUserCoins :one
-- Note: This should be used within a transaction (for refunds)
UPDATE users
SET coins = coins + $1, updated_at = NOW()
WHERE id = $2
RETURNING coins;

-- name: CreateTransaction :one
INSERT INTO transactions (user_id, type, amount, balance_after, reason, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetUserStats :one
-- Returns aggregated statistics for a user
SELECT
    u.coins,
    u.total_coins_earned,
    COUNT(DISTINCT i.item_id) as unique_items_owned,
    COALESCE(SUM(i.quantity), 0) as total_items,
    COUNT(DISTINCT pf.id) as furniture_placed
FROM users u
LEFT JOIN inventory i ON u.id = i.user_id
LEFT JOIN placed_furniture pf ON u.id = pf.user_id
WHERE u.id = $1
GROUP BY u.coins, u.total_coins_earned;
