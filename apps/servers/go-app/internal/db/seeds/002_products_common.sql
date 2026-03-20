-- Common Furniture Products Seed Data
-- Description: Common rarity furniture items (~15-80 coins)

BEGIN;

-- columns: id, category_id, name, description, price_coins, rarity,
--          width, height, can_stack, sprite_url, thumbnail_url,
--          is_available, stock_quantity (NULL=unlimited), max_per_user
INSERT INTO furniture_products (
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url,
    is_available, stock_quantity, max_per_user
) VALUES
-- Desks
('prod_basic_desk_oak',  'cat_desks', 'Oak Desk',
 'A simple but sturdy oak desk. Perfect for getting started.',
 50, 'common', 2, 1, false,
 '/assets/sprites/furniture/desk_oak.png', '/assets/thumbnails/desk_oak.png',
 true, NULL, 4),

('prod_basic_desk_pine', 'cat_desks', 'Pine Desk',
 'Lightweight pine desk. Affordable and functional.',
 40, 'common', 2, 1, false,
 '/assets/sprites/furniture/desk_pine.png', '/assets/thumbnails/desk_pine.png',
 true, NULL, 4),

-- Chairs
('prod_basic_chair',     'cat_chairs', 'Basic Chair',
 'No-frills office chair. It gets the job done.',
 30, 'common', 1, 1, false,
 '/assets/sprites/furniture/chair_basic.png', '/assets/thumbnails/chair_basic.png',
 true, NULL, 8),

('prod_stool',           'cat_chairs', 'Office Stool',
 'Simple stool for quick sitting breaks.',
 20, 'common', 1, 1, false,
 '/assets/sprites/furniture/stool.png', '/assets/thumbnails/stool.png',
 true, NULL, 8),

-- Tables
('prod_side_table',          'cat_tables', 'Side Table',
 'Small table for coffee and notes.',
 25, 'common', 1, 1, false,
 '/assets/sprites/furniture/table_side.png', '/assets/thumbnails/table_side.png',
 true, NULL, 6),

('prod_meeting_table_small', 'cat_tables', 'Meeting Table',
 'Compact table for small team meetings.',
 80, 'common', 3, 1, false,
 '/assets/sprites/furniture/table_meeting_small.png', '/assets/thumbnails/table_meeting_small.png',
 true, NULL, 2),

-- Storage
('prod_shelf_basic',   'cat_storage', 'Wall Shelf',
 'Simple wall-mounted shelf.',
 35, 'common', 2, 1, false,
 '/assets/sprites/furniture/shelf_basic.png', '/assets/thumbnails/shelf_basic.png',
 true, NULL, 6),

('prod_cabinet_small', 'cat_storage', 'Small Cabinet',
 'Compact storage cabinet for office supplies.',
 60, 'common', 1, 1, false,
 '/assets/sprites/furniture/cabinet_small.png', '/assets/thumbnails/cabinet_small.png',
 true, NULL, 4),

-- Plants
('prod_plant_small',  'cat_plants', 'Small Potted Plant',
 'A tiny succulent. Low maintenance companion.',
 15, 'common', 1, 1, false,
 '/assets/sprites/furniture/plant_small.png', '/assets/thumbnails/plant_small.png',
 true, NULL, 10),

('prod_plant_cactus', 'cat_plants', 'Desk Cactus',
 'A tiny cactus for your desk. Very prickly, very cute.',
 20, 'common', 1, 1, false,
 '/assets/sprites/furniture/plant_cactus.png', '/assets/thumbnails/plant_cactus.png',
 true, NULL, 8),

-- Lighting
('prod_lamp_desk', 'cat_lighting', 'Desk Lamp',
 'Basic adjustable desk lamp.',
 25, 'common', 1, 1, false,
 '/assets/sprites/furniture/lamp_desk.png', '/assets/thumbnails/lamp_desk.png',
 true, NULL, 6),

-- Wall Decor
('prod_clock_basic', 'cat_decorations', 'Wall Clock',
 'Simple wall clock to keep track of time.',
 30, 'common', 1, 1, false,
 '/assets/sprites/furniture/clock_basic.png', '/assets/thumbnails/clock_basic.png',
 true, NULL, 4),

-- Rugs
('prod_rug_small', 'cat_rugs', 'Small Rug',
 'Cozy rug to warm up your floor space.',
 40, 'common', 2, 1, false,
 '/assets/sprites/furniture/rug_small.png', '/assets/thumbnails/rug_small.png',
 true, NULL, 4),

-- Electronics
('prod_monitor_basic', 'cat_electronics', 'Basic Monitor',
 'Standard office monitor. Essential for productivity.',
 45, 'common', 1, 1, false,
 '/assets/sprites/furniture/monitor_basic.png', '/assets/thumbnails/monitor_basic.png',
 true, NULL, 4)

ON CONFLICT (id) DO NOTHING;

COMMIT;
