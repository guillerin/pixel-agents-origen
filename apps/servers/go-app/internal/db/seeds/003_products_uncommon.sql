-- Uncommon Furniture Products Seed Data
-- Description: Uncommon rarity furniture items (~70-250 coins)

BEGIN;

INSERT INTO furniture_products (
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url,
    is_available, stock_quantity, max_per_user
) VALUES
-- Desks
('prod_executive_desk', 'cat_desks', 'Executive Desk',
 'Spacious desk with built-in cable management. For the serious agent.',
 150, 'uncommon', 3, 1, false,
 '/assets/sprites/furniture/desk_executive.png', '/assets/thumbnails/desk_executive.png',
 true, NULL, 2),

('prod_corner_desk', 'cat_desks', 'Corner Desk',
 'L-shaped desk that fits perfectly in corners. Maximum surface area.',
 180, 'uncommon', 2, 2, false,
 '/assets/sprites/furniture/desk_corner.png', '/assets/thumbnails/desk_corner.png',
 true, NULL, 2),

('prod_standing_desk', 'cat_desks', 'Standing Desk',
 'Height-adjustable desk for healthy working habits.',
 200, 'uncommon', 2, 1, false,
 '/assets/sprites/furniture/desk_standing.png', '/assets/thumbnails/desk_standing.png',
 true, NULL, 2),

-- Chairs
('prod_ergonomic_chair', 'cat_chairs', 'Ergonomic Chair',
 'Lumbar support included. Your back will thank you.',
 120, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/chair_ergonomic.png', '/assets/thumbnails/chair_ergonomic.png',
 true, NULL, 4),

('prod_lounge_chair', 'cat_chairs', 'Lounge Chair',
 'Comfortable chair for the break area.',
 100, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/chair_lounge.png', '/assets/thumbnails/chair_lounge.png',
 true, NULL, 4),

-- Tables
('prod_conference_table', 'cat_tables', 'Conference Table',
 'Large table for team meetings and planning sessions.',
 250, 'uncommon', 4, 2, false,
 '/assets/sprites/furniture/table_conference.png', '/assets/thumbnails/table_conference.png',
 true, NULL, 1),

-- Storage
('prod_bookshelf_large', 'cat_storage', 'Large Bookshelf',
 'Tall bookshelf for displaying achievements and reference materials.',
 140, 'uncommon', 2, 2, false,
 '/assets/sprites/furniture/bookshelf_large.png', '/assets/thumbnails/bookshelf_large.png',
 true, NULL, 3),

('prod_filing_cabinet', 'cat_storage', 'Filing Cabinet',
 'Organize documents with professional efficiency.',
 90, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/cabinet_filing.png', '/assets/thumbnails/cabinet_filing.png',
 true, NULL, 4),

-- Plants
('prod_plant_medium', 'cat_plants', 'Potted Fern',
 'A lush fern to add some life to the office.',
 50, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/plant_fern.png', '/assets/thumbnails/plant_fern.png',
 true, NULL, 6),

('prod_plant_tree', 'cat_plants', 'Office Tree',
 'A small tree for a dramatic touch of nature.',
 100, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/plant_tree.png', '/assets/thumbnails/plant_tree.png',
 true, NULL, 3),

-- Lighting
('prod_floor_lamp', 'cat_lighting', 'Floor Lamp',
 'Tall lamp for ambient lighting.',
 70, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/lamp_floor.png', '/assets/thumbnails/lamp_floor.png',
 true, NULL, 4),

('prod_ceiling_light', 'cat_lighting', 'Ceiling Light',
 'Elegant ceiling light fixture.',
 80, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/light_ceiling.png', '/assets/thumbnails/light_ceiling.png',
 true, NULL, 4),

-- Whiteboards
('prod_whiteboard_small', 'cat_whiteboards', 'Whiteboard',
 'Collaborative planning surface for brainstorming.',
 110, 'uncommon', 3, 1, false,
 '/assets/sprites/furniture/whiteboard_small.png', '/assets/thumbnails/whiteboard_small.png',
 true, NULL, 2),

-- Wall Decor
('prod_painting_abstract', 'cat_decorations', 'Abstract Art',
 'Modern art piece. Interpret as you wish.',
 85, 'uncommon', 2, 1, false,
 '/assets/sprites/furniture/painting_abstract.png', '/assets/thumbnails/painting_abstract.png',
 true, NULL, 4),

-- Rugs
('prod_rug_medium', 'cat_rugs', 'Medium Rug',
 'Cozy rug with an elegant pattern.',
 70, 'uncommon', 3, 2, false,
 '/assets/sprites/furniture/rug_medium.png', '/assets/thumbnails/rug_medium.png',
 true, NULL, 3),

-- Electronics
('prod_monitor_dual', 'cat_electronics', 'Dual Monitor Setup',
 'Two monitors for maximum productivity.',
 120, 'uncommon', 2, 1, false,
 '/assets/sprites/furniture/monitor_dual.png', '/assets/thumbnails/monitor_dual.png',
 true, NULL, 2),

('prod_computer', 'cat_electronics', 'Desktop Computer',
 'Full tower PC for serious computing power.',
 200, 'uncommon', 1, 1, false,
 '/assets/sprites/furniture/computer.png', '/assets/thumbnails/computer.png',
 true, NULL, 2)

ON CONFLICT (id) DO NOTHING;

COMMIT;
