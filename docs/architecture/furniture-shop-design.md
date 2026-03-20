# Furniture Shop System - Architecture Design Document

## Executive Summary

This document outlines the complete architecture for a furniture shop system in Token Town. The shop allows users to spend coins (earned from AI token usage) to purchase furniture items for decorating their virtual office space.

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [API Contracts](#api-contracts)
4. [WebSocket Integration](#websocket-integration)
5. [Type Definitions](#type-definitions)
6. [System Architecture](#system-architecture)
7. [Architecture Decision Record](#architecture-decision-record)

---

## System Overview

### Key Features

1. **Product Catalog**: Browse furniture items by category with rarity-based pricing
2. **Purchase System**: Secure coin-based purchases with transaction history
3. **Inventory Management**: Track owned items and quantities
4. **Real-time Updates**: WebSocket-based live inventory and balance updates
5. **Admin Panel**: Angular-based CRUD for shop management

### Integration Points

- **Coin Economy**: Uses existing WalletService for atomic transactions
- **Authentication**: Leverages existing HMAC-SHA256 session tokens
- **WebSocket Hub**: Extends existing WebSocket event system
- **Database**: PostgreSQL with proper indexing and constraints

---

## Database Schema

### Migration File: `003_furniture_shop.sql`

```sql
-- migrate:up
-- Furniture Categories
CREATE TABLE IF NOT EXISTS furniture_categories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    description     TEXT,
    icon_url        TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Furniture Products
CREATE TABLE IF NOT EXISTS furniture_products (
    id                  TEXT PRIMARY KEY,
    category_id         TEXT NOT NULL REFERENCES furniture_categories(id) ON DELETE RESTRICT,
    name                TEXT NOT NULL,
    description         TEXT,

    -- Pricing
    price_coins         INTEGER NOT NULL CHECK(price_coins >= 0),

    -- Rarity system
    rarity             TEXT NOT NULL DEFAULT 'common' CHECK(rarity IN ('common', 'uncommon', 'rare', 'legendary')),

    -- Visual assets
    sprite_url         TEXT NOT NULL,
    thumbnail_url      TEXT,
    preview_url        TEXT,

    -- Dimensions for placement validation
    width               INTEGER NOT NULL DEFAULT 1 CHECK(width > 0),
    height              INTEGER NOT NULL DEFAULT 1 CHECK(height > 0),
    can_stack           BOOLEAN NOT NULL DEFAULT FALSE,

    -- Availability
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    available_from      TIMESTAMPTZ,
    available_until     TIMESTAMPTZ,

    -- Purchase limits
    max_per_user        INTEGER CHECK(max_per_user > 0),
    stock_quantity      INTEGER CHECK(stock_quantity >= 0),

    -- Metadata
    tags                TEXT[] DEFAULT '{}',
    metadata            JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_date_range CHECK (
        (available_from IS NULL OR available_until IS NULL OR) available_from < available_until
    )
);

-- User Inventory
CREATE TABLE IF NOT EXISTS user_furniture_inventory (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id          TEXT NOT NULL REFERENCES furniture_products(id) ON DELETE CASCADE,
    quantity            INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 0),

    -- First and last purchase timestamps
    first_purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_purchased_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, product_id)
);

-- Purchase Transactions (extends existing transactions table)
CREATE TABLE IF NOT EXISTS furniture_purchase_history (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id),
    product_id          TEXT NOT NULL REFERENCES furniture_products(id),
    quantity            INTEGER NOT NULL DEFAULT 1,
    coins_spent         INTEGER NOT NULL,
    balance_after       INTEGER NOT NULL,

    -- Transaction reference
    transaction_id      BIGINT REFERENCES transactions(id),

    -- Context
    purchase_method     TEXT NOT NULL DEFAULT 'shop' CHECK(purchase_method IN ('shop', 'admin', 'gift', 'refund')),

    -- Timestamp
    purchased_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata            JSONB DEFAULT '{}'::jsonb
);

-- Furniture Placement in Rooms (extends room_layouts)
CREATE TABLE IF NOT EXISTS room_furniture_placements (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_item_id   BIGINT NOT NULL REFERENCES user_furniture_inventory(id) ON DELETE CASCADE,

    -- Position data
    x                   INTEGER NOT NULL CHECK(x >= 0),
    y                   INTEGER NOT NULL CHECK(y >= 0),
    rotation            INTEGER NOT NULL DEFAULT 0 CHECK(rotation IN (0, 90, 180, 270)),
    layer               INTEGER NOT NULL DEFAULT 0,

    -- Room identifier (for future multi-room support)
    room_id             TEXT NOT NULL DEFAULT 'main',

    -- Timestamps
    placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_furniture_products_category ON furniture_products(category_id);
CREATE INDEX IF NOT EXISTS idx_furniture_products_rarity ON furniture_products(rarity);
CREATE INDEX IF NOT EXISTS idx_furniture_products_availability ON furniture_products(is_available, available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_furniture_products_price ON furniture_products(price_coins);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_furniture_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_product ON user_furniture_inventory(product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON furniture_purchase_history(user_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_product ON furniture_purchase_history(product_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_placements_user ON room_furniture_placements(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_room_placements_position ON room_furniture_placements(user_id, room_id, x, y);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_furniture_categories_updated_at BEFORE UPDATE ON furniture_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_furniture_products_updated_at BEFORE UPDATE ON furniture_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_placements_updated_at BEFORE UPDATE ON room_furniture_placements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- migrate:down
DROP TABLE IF EXISTS room_furniture_placements;
DROP TABLE IF EXISTS furniture_purchase_history;
DROP TABLE IF EXISTS user_furniture_inventory;
DROP TABLE IF EXISTS furniture_products;
DROP TABLE IF EXISTS furniture_categories;
DROP FUNCTION IF EXISTS update_updated_at_column;
```

### Schema Design Rationale

1. **Categories as First-Class Entities**: Allows for hierarchical categories and flexible UI organization
2. **Rarity System**: Enables gamification with visual differentiation
3. **Dimensions & Stacking**: Supports future collision detection and placement validation
4. **Date Range Availability**: Enables limited-time events and seasonal items
5. **Separate Purchase History**: Detailed audit trail separate from general transactions
6. **Placement Table**: Normalized storage for positioned items (extends room_layouts)

---

## API Contracts

### REST API Endpoints

#### Public Endpoints

```
GET /api/shop/categories
Description: List all furniture categories
Response: Category[]

GET /api/shop/products
Description: List available furniture products with filtering
Query Params:
  - category: string (optional)
  - rarity: string (optional)
  - minPrice: integer (optional)
  - maxPrice: integer (optional)
  - search: string (optional, searches name/description)
  - sort: 'price_asc' | 'price_desc' | 'name' | 'rarity' | 'newest' (default: 'name')
  - limit: integer (default: 50, max: 100)
  - offset: integer (default: 0)
Response: ProductListResponse
```

#### Protected Endpoints (Require Authentication)

```
GET /api/shop/products/:productId
Description: Get detailed product information
Response: ProductDetail

POST /api/shop/products/:productId/purchase
Description: Purchase a furniture item
Request: PurchaseRequest
Response: PurchaseResponse

GET /api/shop/inventory
Description: Get user's furniture inventory
Query Params:
  - category: string (optional)
  - search: string (optional)
Response: InventoryResponse

GET /api/shop/purchase-history
Description: Get user's purchase history
Query Params:
  - limit: integer (default: 20)
  - offset: integer (default: 0)
Response: PurchaseHistoryResponse

GET /api/shop/placements
Description: Get user's furniture placements
Query Params:
  - roomId: string (default: 'main')
Response: PlacementsResponse

PUT /api/shop/placements
Description: Update furniture placements (batch)
Request: UpdatePlacementsRequest
Response: UpdatePlacementsResponse

DELETE /api/shop/placements/:placementId
Description: Remove a furniture placement
Response: SuccessResponse
```

#### Admin Endpoints (Require Admin Role)

```
POST /api/admin/shop/categories
Description: Create a new furniture category
Request: CreateCategoryRequest
Response: CategoryResponse

PUT /api/admin/shop/categories/:categoryId
Description: Update a furniture category
Request: UpdateCategoryRequest
Response: CategoryResponse

DELETE /api/admin/shop/categories/:categoryId
Description: Delete a furniture category
Response: SuccessResponse

POST /api/admin/shop/products
Description: Create a new furniture product
Request: CreateProductRequest
Response: ProductResponse

PUT /api/admin/shop/products/:productId
Description: Update a furniture product
Request: UpdateProductRequest
Response: ProductResponse

DELETE /api/admin/shop/products/:productId
Description: Delete a furniture product
Response: SuccessResponse

GET /api/admin/shop/products/:productId/analytics
Description: Get product analytics (sales, revenue, popularity)
Response: ProductAnalytics

GET /api/admin/shop/analytics
Description: Get shop-wide analytics
Query Params:
  - from: date (ISO 8601)
  - to: date (ISO 8601)
Response: ShopAnalytics
```

### Request/Response Types

```typescript
// Category Types
interface FurnitureCategory {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Types
interface FurnitureProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  priceCoins: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  spriteUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  width: number;
  height: number;
  canStack: boolean;
  isAvailable: boolean;
  availableFrom?: string;
  availableUntil?: string;
  maxPerUser?: number;
  stockQuantity?: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ProductListResponse {
  products: FurnitureProduct[];
  total: number;
  limit: number;
  offset: number;
}

interface ProductDetail extends FurnitureProduct {
  category: FurnitureCategory;
  ownedQuantity?: number;
  purchaseCount?: number;
  avgRating?: number;
}

// Purchase Types
interface PurchaseRequest {
  productId: string;
  quantity?: number; // Default: 1
}

interface PurchaseResponse {
  success: boolean;
  orderId?: string;
  items: PurchasedItem[];
  totalCoinsSpent: number;
  remainingBalance: number;
  inventory: InventoryItem[];
  error?: string;
}

interface PurchasedItem {
  productId: string;
  quantity: number;
  coinsSpent: number;
}

// Inventory Types
interface InventoryItem {
  id: string;
  userId: string;
  product: FurnitureProduct;
  quantity: number;
  firstPurchasedAt: string;
  lastPurchasedAt: string;
}

interface InventoryResponse {
  items: InventoryItem[];
  total: number;
  totalValue: number; // Sum of all item values at current prices
}

// Placement Types
interface FurniturePlacement {
  id: string;
  userId: string;
  inventoryItemId: string;
  product: FurnitureProduct;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  layer: number;
  roomId: string;
  placedAt: string;
  updatedAt: string;
}

interface UpdatePlacementsRequest {
  roomId: string;
  placements: Array<{
    inventoryItemId: string;
    x: number;
    y: number;
    rotation: 0 | 90 | 180 | 270;
    layer: number;
  }>;
}

interface UpdatePlacementsResponse {
  placements: FurniturePlacement[];
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// Analytics Types
interface ProductAnalytics {
  productId: string;
  totalPurchases: number;
  totalRevenue: number;
  uniqueBuyers: number;
  averagePerBuyer: number;
  purchasesByRarity: Record<string, number>;
  purchasesOverTime: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

interface ShopAnalytics {
  totalRevenue: number;
  totalPurchases: number;
  uniqueCustomers: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    name: string;
    purchases: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    percentage: number;
  }>;
  revenueOverTime: Array<{
    date: string;
    revenue: number;
    purchases: number;
  }>;
}

// Admin Request Types
interface CreateCategoryRequest {
  name: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  sortOrder?: number;
}

interface CreateProductRequest {
  categoryId: string;
  name: string;
  description?: string;
  priceCoins: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  spriteUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  canStack?: boolean;
  maxPerUser?: number;
  stockQuantity?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// Error Response
interface ShopErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
```

---

## WebSocket Integration

### Message Types

Extend the existing WebSocket event system with shop-specific events.

#### Client → Server Events

```typescript
// Extend ClientEventType in packages/shared/src/index.ts
export const ClientEventType = {
  // ... existing events
  SHOP_GET_CATALOG: 'shop:getCatalog',
  SHOP_GET_INVENTORY: 'shop:getInventory',
  SHOP_PURCHASE: 'shop:purchase',
  SHOP_GET_PLACEMENTS: 'shop:getPlacements',
  SHOP_UPDATE_PLACEMENTS: 'shop:updatePlacements',
  SHOP_REMOVE_PLACEMENT: 'shop:removePlacement',
} as const;
```

#### Server → Client Events

```typescript
// Extend ServerEventType in packages/shared/src/index.ts
export const ServerEventType = {
  // ... existing events
  SHOP_CATALOG: 'shop:catalog',
  SHOP_INVENTORY: 'shop:inventory',
  SHOP_PURCHASE_RESULT: 'shop:purchaseResult',
  SHOP_PLACEMENTS: 'shop:placements',
  SHOP_PLACEMENTS_UPDATED: 'shop:placementsUpdated',
  SHOP_BALANCE_UPDATE: 'shop:balanceUpdate',
  SHOP_ERROR: 'shop:error',
} as const;
```

#### Payload Definitions

```typescript
// Go structs in internal/ws/events.go

// Shop catalog request
type ShopGetCatalogPayload struct {
  CategoryID string `json:"categoryId,omitempty"`
  Rarity     string `json:"rarity,omitempty"`
  Search     string `json:"search,omitempty"`
}

// Shop catalog response
type ShopCatalogPayload struct {
  Products []ShopProductItem `json:"products"`
  Total    int              `json:"total"`
}

type ShopProductItem struct {
  ID          string  `json:"id"`
  CategoryID  string  `json:"categoryId"`
  Name        string  `json:"name"`
  Description string  `json:"description,omitempty"`
  PriceCoins  int     `json:"priceCoins"`
  Rarity      string  `json:"rarity"`
  SpriteURL   string  `json:"spriteUrl"`
  ThumbnailURL string `json:"thumbnailUrl,omitempty"`
  Width       int     `json:"width"`
  Height      int     `json:"height"`
  CanStack    bool    `json:"canStack"`
  OwnedQty    int     `json:"ownedQty,omitempty"`
}

// Purchase request
type ShopPurchasePayload struct {
  ProductID string `json:"productId"`
  Quantity  int    `json:"quantity,omitempty"`
}

// Purchase result
type ShopPurchaseResultPayload struct {
  Success          bool             `json:"success"`
  OrderID          string           `json:"orderId,omitempty"`
  Items            []PurchasedItem  `json:"items"`
  TotalCoinsSpent  int              `json:"totalCoinsSpent"`
  RemainingBalance int              `json:"remainingBalance"`
  Error            string           `json:"error,omitempty"`
}

// Inventory response
type ShopInventoryPayload struct {
  Items []ShopInventoryItem `json:"items"`
  Total int                `json:"total"`
  TotalValue int           `json:"totalValue"`
}

type ShopInventoryItem struct {
  ID               string            `json:"id"`
  Product          ShopProductItem   `json:"product"`
  Quantity         int               `json:"quantity"`
  FirstPurchasedAt string            `json:"firstPurchasedAt"`
  LastPurchasedAt  string            `json:"lastPurchasedAt"`
}

// Placements
type ShopGetPlacementsPayload struct {
  RoomID string `json:"roomId,omitempty"`
}

type ShopPlacementsPayload struct {
  RoomID     string              `json:"roomId"`
  Placements []ShopPlacementItem `json:"placements"`
}

type ShopPlacementItem struct {
  ID             string          `json:"id"`
  InventoryItemID string         `json:"inventoryItemId"`
  Product        ShopProductItem `json:"product"`
  X              int             `json:"x"`
  Y              int             `json:"y"`
  Rotation       int             `json:"rotation"`
  Layer          int             `json:"layer"`
}

// Update placements
type ShopUpdatePlacementsPayload struct {
  RoomID     string              `json:"roomId"`
  Placements []PlacementUpdate   `json:"placements"`
}

type PlacementUpdate struct {
  InventoryItemID string `json:"inventoryItemId"`
  X               int    `json:"x"`
  Y               int    `json:"y"`
  Rotation        int    `json:"rotation"`
  Layer           int    `json:"layer"`
}

type ShopPlacementsUpdatedPayload struct {
  Success   bool                `json:"success"`
  Placements []ShopPlacementItem `json:"placements"`
  Errors    []PlacementError    `json:"errors,omitempty"`
}

type PlacementError struct {
  Index int    `json:"index"`
  Error string `json:"error"`
}

// Balance update (broadcast after purchase)
type ShopBalanceUpdatePayload struct {
  UserID    string `json:"userId"`
  Balance   int    `json:"balance"`
  Delta     int    `json:"delta"`
  Reason    string `json:"reason"`
}
```

### WebSocket Event Flow

```
Client                                      Server
  |                                           |
  |--[AUTH]---------------------------------->|
  |<--[ROOM_SNAPSHOT]-------------------------|
  |                                           |
  |--[SHOP_GET_CATALOG]---------------------->|
  |<--[SHOP_CATALOG]--------------------------|
  |                                           |
  |--[SHOP_GET_INVENTORY]--------------------->|
  |<--[SHOP_INVENTORY]------------------------|
  |                                           |
  |--[SHOP_PURCHASE]------------------------->|
  |    (productId: "desk_oak", qty: 1)        |
  |                                           |
  |              [Validate]                    |
  |              [Check Balance]              |
  |              [Deduct Coins]               |
  |              [Add to Inventory]           |
  |              [Record Transaction]         |
  |                                           |
  |<--[SHOP_PURCHASE_RESULT]------------------|
  |    {success: true, remainingBalance: 450} |
  |                                           |
  |<--[SHOP_INVENTORY]------------------------|
  |    (updated inventory)                    |
  |                                           |
  |<--[SHOP_BALANCE_UPDATE]-------------------|
  |    (broadcast to room)                    |
  |                                           |
  |--[SHOP_UPDATE_PLACEMENTS]---------------->|
  |    {roomId: "main", placements: [...]}    |
  |                                           |
  |              [Validate Positions]         |
  |              [Check Collisions]           |
  |              [Save to DB]                 |
  |                                           |
  |<--[SHOP_PLACEMENTS_UPDATED]---------------|
  |    {success: true, placements: [...]}     |
  |                                           |
  |<--[ROOM_LAYOUT_UPDATE]--------------------|
  |    (broadcast to room)                    |
```

---

## Type Definitions

### Update `packages/shared/src/index.ts`

```typescript
// ─── Shop ─────────────────────────────────────────────────────────────────

export const FurnitureRarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  LEGENDARY: 'legendary',
} as const;
export type FurnitureRarity = (typeof FurnitureRarity)[keyof typeof FurnitureRarity];

export const ShopEventType = {
  CATALOG_UPDATED: 'catalog:updated',
  INVENTORY_UPDATED: 'inventory:updated',
  PLACEMENT_UPDATED: 'placement:updated',
} as const;
export type ShopEventType = (typeof ShopEventType)[keyof typeof ShopEventType];

export interface FurnitureCategory {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FurnitureProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  priceCoins: number;
  rarity: FurnitureRarity;
  spriteUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  width: number;
  height: number;
  canStack: boolean;
  isAvailable: boolean;
  availableFrom?: string;
  availableUntil?: string;
  maxPerUser?: number;
  stockQuantity?: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FurnitureInventoryItem {
  id: string;
  userId: string;
  product: FurnitureProduct;
  quantity: number;
  firstPurchasedAt: string;
  lastPurchasedAt: string;
}

export interface FurniturePlacement {
  id: string;
  userId: string;
  inventoryItemId: string;
  product: FurnitureProduct;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  layer: number;
  roomId: string;
  placedAt: string;
  updatedAt: string;
}

export interface ShopPurchaseRequest {
  productId: string;
  quantity?: number;
}

export interface ShopPurchaseResponse {
  success: boolean;
  orderId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    coinsSpent: number;
  }>;
  totalCoinsSpent: number;
  remainingBalance: number;
  inventory: FurnitureInventoryItem[];
  error?: string;
}

export interface ShopCatalogQuery {
  categoryId?: string;
  rarity?: FurnitureRarity;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'name' | 'rarity' | 'newest';
  limit?: number;
  offset?: number;
}

export interface ShopCatalogResponse {
  products: FurnitureProduct[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Extended Client Events ───────────────────────────────────────────────

export const ShopClientEvent = {
  GET_CATALOG: 'shop:getCatalog',
  GET_INVENTORY: 'shop:getInventory',
  PURCHASE: 'shop:purchase',
  GET_PLACEMENTS: 'shop:getPlacements',
  UPDATE_PLACEMENTS: 'shop:updatePlacements',
  REMOVE_PLACEMENT: 'shop:removePlacement',
} as const;
export type ShopClientEvent = (typeof ShopClientEvent)[keyof typeof ShopClientEvent];

// ─── Extended Server Events ───────────────────────────────────────────────

export const ShopServerEvent = {
  CATALOG: 'shop:catalog',
  INVENTORY: 'shop:inventory',
  PURCHASE_RESULT: 'shop:purchaseResult',
  PLACEMENTS: 'shop:placements',
  PLACEMENTS_UPDATED: 'shop:placementsUpdated',
  BALANCE_UPDATE: 'shop:balanceUpdate',
  ERROR: 'shop:error',
} as const;
export type ShopServerEvent = (typeof ShopServerEvent)[keyof typeof ShopServerEvent];

// ─── Admin Analytics Types ─────────────────────────────────────────────────

export interface ProductAnalytics {
  productId: string;
  totalPurchases: number;
  totalRevenue: number;
  uniqueBuyers: number;
  averagePerBuyer: number;
  purchasesByRarity: Record<string, number>;
  purchasesOverTime: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface ShopAnalytics {
  totalRevenue: number;
  totalPurchases: number;
  uniqueCustomers: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    name: string;
    purchases: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    percentage: number;
  }>;
  revenueOverTime: Array<{
    date: string;
    revenue: number;
    purchases: number;
  }>;
}
```

---

## System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │   VS Code       │    │   React UI      │    │   Angular       │       │
│  │   Extension     │    │   (Shop UI)     │    │   Admin Panel   │       │
│  │                 │    │                 │    │                 │       │
│  │  - Office View  │    │  - Catalog      │    │  - Category Mgr │       │
│  │  - Placement    │    │  - Inventory    │    │  - Product CRUD │       │
│  │  - Inventory    │    │  - Purchase     │    │  - Analytics    │       │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘       │
│           │                      │                      │                  │
│           └──────────────────────┴──────────────────────┘                  │
│                                   │                                         │
│                                   ▼                                         │
│                         ┌─────────────────┐                                │
│                         │  Shared Types   │                                │
│                         │  (packages/     │                                │
│                         │   shared)       │                                │
│                         └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ WebSocket / HTTP
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Server Layer (Go)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        HTTP Layer (chi)                              │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │   Auth       │ │   Shop       │ │   Inventory  │ │    Admin    │ │  │
│  │  │  Middleware  │ │   Handler    │ │   Handler    │ │   Handler   │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Application Layer                                 │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │  Catalog     │ │   Purchase   │ │  Inventory   │ │  Placement  │ │  │
│  │  │  Service     │ │   Service    │ │  Service     │ │   Service   │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Domain Layer                                      │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │  Furniture   │ │   Purchase   │ │   Inventory  │ │  Placement  │ │  │
│  │  │  Entity      │ │   Entity     │ │   Entity     │ │   Entity    │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                  WebSocket Layer                                      │  │
│  │  ┌──────────────┐ ┌──────────────┐                                    │  │
│  │  │     Hub      │ │    Client    │                                    │  │
│  │  │  (Room Mgr)  │ │   (Conn)     │                                    │  │
│  │  └──────────────┘ └──────────────┘                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ SQL
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        PostgreSQL                                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │ furniture_   │ │ furniture_   │ │ user_        │ │ room_       │ │  │
│  │  │ categories   │ │ products     │ │ furniture_   │ │ furniture_  │ │  │
│  │  │              │ │              │ │ inventory    │ │ placements  │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │  │
│  │  ┌──────────────┐ ┌──────────────┐                                     │  │
│  │  │ furniture_   │ │ transactions │                                     │  │
│  │  │ purchase_    │ │ (existing)   │                                     │  │
│  │  │ history      │ │              │                                     │  │
│  │  └──────────────┘ └──────────────┘                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Purchase Flow

```
1. User clicks "Purchase" in React UI
   ↓
2. WebSocket message: {event: "shop:purchase", payload: {productId: "desk_oak"}}
   ↓
3. Server validates JWT token
   ↓
4. PurchaseService.Purchase():
   a. Validate product exists and is available
   b. Check user's current balance (WalletService)
   c. Verify max_per_user limit
   d. BEGIN TRANSACTION
      i. Lock user row (FOR UPDATE)
     ii. Deduct coins (users.coins -= price)
    iii. Insert transaction record
     iv. Insert/update inventory record
      v. Insert purchase_history record
     vi. COMMIT
   ↓
5. Broadcast WebSocket messages:
   - To purchaser: {event: "shop:purchaseResult", payload: {success: true, ...}}
   - To purchaser: {event: "shop:inventory", payload: {items: [...]}}
   - To room: {event: "shop:balanceUpdate", payload: {userId: "...", balance: 450}}
   ↓
6. React UI updates local state with new inventory and balance
```

### Data Flow: Placement Update

```
1. User drags furniture to new position in VS Code extension
   ↓
2. WebSocket message: {event: "shop:updatePlacements", payload: {...}}
   ↓
3. Server validates JWT token
   ↓
4. PlacementService.UpdatePlacements():
   a. Validate all positions are within room bounds
   b. Check for collisions (if !canStack)
   c. Validate user owns all inventory items
   d. Batch update room_furniture_placements table
   ↓
5. Broadcast to room: {event: "room:layoutUpdate", payload: {...}}
   ↓
6. All clients in room re-render furniture positions
```

### Error Handling Strategy

1. **Validation Errors** (400 Bad Request):
   - Invalid product ID
   - Insufficient balance
   - Max quantity reached
   - Out of stock
   - Invalid placement position

2. **Transaction Errors** (409 Conflict):
   - Concurrent purchase attempts
   - Stale inventory data

3. **Authentication Errors** (401 Unauthorized):
   - Invalid/expired token
   - Missing token

4. **Server Errors** (500 Internal Server Error):
   - Database connection failures
   - Transaction deadlocks (auto-retry up to 3 times)

All errors follow this structure:
```json
{
  "error": "Human-readable message",
  "code": "INSUFFICIENT_BALANCE",
  "details": {
    "currentBalance": 50,
    "required": 100,
    "productId": "desk_oak"
  }
}
```

---

## Architecture Decision Record

### ADR-001: Separate Categories from Products

**Status**: Accepted

**Context**: Need to organize furniture items for the shop UI.

**Decision**: Create first-class `furniture_categories` table referenced by `furniture_products`.

**Consequences**:
- ✅ Flexible category management (rename, reorder, deactivate)
- ✅ Support for future category hierarchies
- ✅ Efficient filtering and sorting
- ❌ Additional JOIN query for product listings

**Alternatives Considered**:
1. Category as enum field on products (rejected: inflexible)
2. Category as JSONB metadata (rejected: no referential integrity)

---

### ADR-001: Purchase in Single Transaction

**Status**: Accepted

**Context**: Bug in existing shop.go where inventory insert is separate from coin deduction.

**Decision**: Wrap entire purchase (coin deduction, transaction record, inventory update) in a single database transaction.

**Consequences**:
- ✅ Atomic guarantees - all-or-nothing
- ✅ No compensating transactions needed
- ✅ Prevents race conditions on concurrent purchases
- ❌ Slightly longer transaction duration

**Implementation**:
```go
func (s *PurchaseService) Purchase(ctx context.Context, userID, productID string, qty int) (*PurchaseResult, error) {
    tx, _ := s.db.BeginTx(ctx, nil)
    defer tx.Rollback()

    // All operations on tx...
    // 1. Lock and check balance
    // 2. Deduct coins
    // 3. Record transaction
    // 4. Update inventory
    // 5. Record purchase history

    return result, tx.Commit()
}
```

---

### ADR-003: WebSocket for Real-time Updates

**Status**: Accepted

**Context**: Need to keep UI in sync across multiple clients.

**Decision**: Use existing WebSocket infrastructure for all shop updates (catalog, inventory, placements).

**Consequences**:
- ✅ Consistent with existing architecture
- ✅ Real-time collaboration (see others place furniture)
- ✅ Reduced polling overhead
- ❌ Requires connection management for offline scenarios

**Alternatives Considered**:
1. REST polling (rejected: inefficient, stale data)
2. Server-Sent Events (rejected: uni-directional only)

---

### ADR-004: Normalized Placements Table

**Status**: Accepted

**Context**: Need to track positioned furniture separately from inventory.

**Decision**: Create `room_furniture_placements` table separate from `user_furniture_inventory`.

**Consequences**:
- ✅ Same item can be placed multiple times (if quantity > 1)
- ✅ Clear separation of ownership vs. positioning
- ✅ Supports future multi-room feature
- ❌ Additional query to load placements

**Data Model**:
- `inventory.quantity`: How many owned
- `placements`: Where each instance is positioned (one row per placed instance)

---

### ADR-005: Rarity-Based Pricing Strategy

**Status**: Accepted

**Context**: Gamification and monetization strategy.

**Decision**: Implement 4-tier rarity system with suggested price ranges:
- Common: 10-50 coins
- Uncommon: 50-200 coins
- Rare: 200-1000 coins
- Legendary: 1000+ coins

**Consequences**:
- ✅ Clear pricing guidance for admins
- ✅ Visual differentiation in UI
- ✅ Collection incentive for users
- ❌ Requires periodic rebalancing

---

## Implementation Checklist

### Phase 1: Database & Types (Priority: High)
- [ ] Create migration file `003_furniture_shop.sql`
- [ ] Add TypeScript types to `packages/shared/src/index.ts`
- [ ] Add Go event types to `internal/ws/events.go`
- [ ] Run migration and verify schema

### Phase 2: Backend Services (Priority: High)
- [ ] Implement `CatalogService` (filtering, sorting)
- [ ] Implement `PurchaseService` (transactional)
- [ ] Implement `InventoryService` (CRUD)
- [ ] Implement `PlacementService` (collision detection)
- [ ] Add HTTP handlers for all endpoints
- [ ] Add WebSocket event handlers
- [ ] Write unit tests for services

### Phase 3: React Shop UI (Priority: Medium)
- [ ] Create shop components (Catalog, ProductCard, PurchaseModal)
- [ ] Implement inventory display
- [ ] Integrate with WebSocket events
- [ ] Add purchase confirmation flow

### Phase 4: Angular Admin Panel (Priority: Medium)
- [ ] Create category management interface
- [ ] Create product CRUD interface
- [ ] Build analytics dashboard
- [ ] Add bulk import/export

### Phase 5: Integration & Polish (Priority: Low)
- [ ] Update VS Code extension to display placed furniture
- [ ] Add furniture placement editor
- [ ] Implement collision detection UI
- [ ] Load testing for high-concurrency purchases

---

## Security Considerations

1. **Purchase Race Conditions**: Use `SELECT FOR UPDATE` to lock user rows during balance checks
2. **Price Manipulation**: Never trust client-provided prices; always fetch from database
3. **Authorization**: Verify user owns inventory item before allowing placement
4. **Rate Limiting**: Apply stricter limits to purchase endpoints (existing 5 req/s)
5. **Input Validation**: Validate all placement coordinates are within room bounds

---

## Performance Considerations

1. **Indexing Strategy**:
   - Composite index on `(user_id, product_id)` for inventory lookups
   - GIN index on `tags` for filtered searches
   - Partial index on `is_available = TRUE` for catalog queries

2. **Query Optimization**:
   - Use `EXPLAIN ANALYZE` on catalog search queries
   - Consider materialized view for product analytics
   - Implement connection pooling (pgxpool)

3. **Caching**:
   - Cache full catalog in memory (invalidate on product changes)
   - Cache user inventory per WebSocket connection
   - Consider Redis for session-based catalog caching

---

## Monitoring & Observability

### Key Metrics to Track

1. **Business Metrics**:
   - Total revenue per day
   - Items purchased per day
   - Average order value
   - Conversion rate (catalog views → purchases)
   - Top-selling products

2. **Technical Metrics**:
   - Purchase transaction duration (p95, p99)
   - WebSocket message latency
   - Database query performance
   - Error rates by endpoint

3. **Alerts**:
   - Purchase failure rate > 1%
   - Transaction duration > 500ms
   - Database connection pool exhaustion
   - Zero purchases in 24-hour period (potential bug)

---

## Future Enhancements

1. **Multi-Room Support**: Extend placements with `room_id` for multiple offices
2. **Furniture Gifting**: Allow users to purchase items for others
3. **Marketplace**: User-to-user item trading/selling
4. **Seasonal Events**: Limited-time items with `available_from/until` ranges
5. **Achievements**: Unlock special items based on purchase history
6. **Bundle Discounts**: Package multiple items at reduced price
7. **Wishlist**: Save items for later purchase
8. **Item Customization**: Color variants, custom names

---

## Appendix: SQLC Query Specifications

If using SQLC for type-safe queries, create `query.sql`:

```sql
-- name: GetActiveCategories :many
SELECT * FROM furniture_categories
WHERE is_active = TRUE
ORDER BY sort_order ASC;

-- name: GetProductsByCategory :many
SELECT * FROM furniture_products
WHERE category_id = $1 AND is_available = TRUE
ORDER BY price_coins ASC;

-- name: GetProductWithCategory :one
SELECT p.*, c.name as category_name, c.display_name as category_display_name
FROM furniture_products p
JOIN furniture_categories c ON c.id = p.category_id
WHERE p.id = $1;

-- name: GetUserInventory :many
SELECT i.*, p.*
FROM user_furniture_inventory i
JOIN furniture_products p ON p.id = i.product_id
WHERE i.user_id = $1
ORDER BY i.last_purchased_at DESC;

-- name: GetUserInventoryForProduct :one
SELECT * FROM user_furniture_inventory
WHERE user_id = $1 AND product_id = $2;

-- name: InsertPurchase :exec
INSERT INTO furniture_purchase_history (
  user_id, product_id, quantity, coins_spent, balance_after, purchase_method
) VALUES ($1, $2, $3, $4, $5, 'shop');

-- name: GetRoomPlacements :many
SELECT fp.*, ui.user_id, p.*
FROM room_furniture_placements fp
JOIN user_furniture_inventory ui ON ui.id = fp.inventory_item_id
JOIN furniture_products p ON p.id = ui.product_id
WHERE fp.user_id = $1 AND fp.room_id = $2
ORDER BY fp.layer ASC, fp.y ASC, fp.x ASC;

-- name: DeleteRoomPlacements :exec
DELETE FROM room_furniture_placements
WHERE user_id = $1 AND room_id = $2;

-- name: InsertPlacement :exec
INSERT INTO room_furniture_placements (
  user_id, inventory_item_id, x, y, rotation, layer, room_id
) VALUES ($1, $2, $3, $4, $5, $6, $7);
```

---

**Document Version**: 1.0
**Last Updated**: 2026-03-19
**Author**: System Architect
**Status**: Ready for Implementation
