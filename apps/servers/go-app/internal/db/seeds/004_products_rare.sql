-- Rare Furniture Products Seed Data
-- Description: Rare rarity furniture items (~180-600 coins)

BEGIN;

INSERT INTO furniture_products (
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url,
    is_available, stock_quantity, max_per_user
) VALUES
-- Desks
('prod_glass_desk', 'cat_desks', 'Glass Desk',
 'Sleek glass desk with chrome finish. Modern elegance.',
 400, 'rare', 3, 1, false,
 '/assets/sprites/furniture/desk_glass.png', '/assets/thumbnails/desk_glass.png',
 true, NULL, 1),

('prod_wood_desk_carved', 'cat_desks', 'Carved Mahogany Desk',
 'Hand-carved mahogany desk. A statement piece.',
 500, 'rare', 3, 1, false,
 '/assets/sprites/furniture/desk_mahogany.png', '/assets/thumbnails/desk_mahogany.png',
 true, NULL, 1),

-- Chairs
('prod_leather_chair', 'cat_chairs', 'Leather Executive Chair',
 'Genuine leather chair with premium comfort.',
 350, 'rare', 1, 1, false,
 '/assets/sprites/furniture/chair_leather.png', '/assets/thumbnails/chair_leather.png',
 true, NULL, 2),

('prod_sofa', 'cat_chairs', 'Office Sofa',
 'Comfortable sofa for the executive lounge.',
 300, 'rare', 3, 1, false,
 '/assets/sprites/furniture/sofa.png', '/assets/thumbnails/sofa.png',
 true, NULL, 2),

-- Tables
('prod_boardroom_table', 'cat_tables', 'Boardroom Table',
 'Impressive table for important meetings.',
 600, 'rare', 5, 2, false,
 '/assets/sprites/furniture/table_boardroom.png', '/assets/thumbnails/table_boardroom.png',
 true, NULL, 1),

-- Storage
('prod_locker', 'cat_storage', 'Personal Locker',
 'Secure personal storage with combination lock.',
 250, 'rare', 1, 2, false,
 '/assets/sprites/furniture/locker.png', '/assets/thumbnails/locker.png',
 true, NULL, 2),

-- Plants
('prod_plant_exotic', 'cat_plants', 'Exotic Plant',
 'Rare tropical plant. Conversation starter.',
 180, 'rare', 1, 1, false,
 '/assets/sprites/furniture/plant_exotic.png', '/assets/thumbnails/plant_exotic.png',
 true, NULL, 3),

-- Lighting
('prod_chandelier', 'cat_lighting', 'Chandelier',
 'Crystal chandelier for luxurious ambiance.',
 280, 'rare', 2, 1, false,
 '/assets/sprites/furniture/chandelier.png', '/assets/thumbnails/chandelier.png',
 true, NULL, 1),

-- Whiteboards
('prod_whiteboard_smart', 'cat_whiteboards', 'Smart Whiteboard',
 'Digital whiteboard with touch interface.',
 450, 'rare', 3, 1, false,
 '/assets/sprites/furniture/whiteboard_smart.png', '/assets/thumbnails/whiteboard_smart.png',
 true, NULL, 1),

-- Wall Decor
('prod_painting_landscape', 'cat_decorations', 'Landscape Painting',
 'Beautiful landscape painting. Serene office vibes.',
 200, 'rare', 3, 1, false,
 '/assets/sprites/furniture/painting_landscape.png', '/assets/thumbnails/painting_landscape.png',
 true, NULL, 2),

-- Rugs
('prod_rug_persian', 'cat_rugs', 'Persian Rug',
 'Hand-woven Persian rug. Artisan craftsmanship.',
 220, 'rare', 4, 3, false,
 '/assets/sprites/furniture/rug_persian.png', '/assets/thumbnails/rug_persian.png',
 true, NULL, 2),

-- Electronics
('prod_monitor_ultrawide', 'cat_electronics', 'Ultrawide Monitor',
 'Curved ultrawide monitor for immersive productivity.',
 350, 'rare', 2, 1, false,
 '/assets/sprites/furniture/monitor_ultrawide.png', '/assets/thumbnails/monitor_ultrawide.png',
 true, NULL, 2)

ON CONFLICT (id) DO NOTHING;

COMMIT;
