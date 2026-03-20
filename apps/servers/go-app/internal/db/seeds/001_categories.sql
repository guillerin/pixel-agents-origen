-- Furniture Categories Seed Data
-- Description: Initial furniture categories for the shop

BEGIN;

INSERT INTO furniture_categories (id, name, display_name, description, icon_url, sort_order, is_active) VALUES
-- Floor Furniture
('cat_desks',       'desks',       'Desks',          'Work surfaces for your pixel office agents',       '/assets/icons/desk.png',        1,  true),
('cat_chairs',      'chairs',      'Chairs',         'Comfortable seating for hardworking agents',       '/assets/icons/chair.png',       2,  true),
('cat_tables',      'tables',      'Tables',         'Meeting tables and side tables',                   '/assets/icons/table.png',       3,  true),
('cat_storage',     'storage',     'Storage',        'Cabinets, shelves, and organizers',               '/assets/icons/storage.png',     4,  true),

-- Wall Items
('cat_decorations', 'decorations', 'Wall Decor',     'Paintings, clocks, and wall-mounted items',       '/assets/icons/decoration.png',  10, true),
('cat_lighting',    'lighting',    'Lighting',       'Lamps and ceiling lights',                        '/assets/icons/lighting.png',    11, true),
('cat_whiteboards', 'whiteboards', 'Whiteboards',    'Collaborative planning surfaces',                 '/assets/icons/whiteboard.png',  12, true),

-- Plants & Decor
('cat_plants',      'plants',      'Plants',         'Bring life to your office with greenery',         '/assets/icons/plant.png',       20, true),
('cat_rugs',        'rugs',        'Rugs',           'Floor coverings to define spaces',                '/assets/icons/rug.png',         21, true),
('cat_electronics', 'electronics', 'Electronics',    'Computers, monitors, and gadgets',                '/assets/icons/electronics.png', 22, true),

-- Special Items
('cat_pets',        'pets',        'Office Pets',    'Friendly companions for the office',              '/assets/icons/pet.png',         30, true),
('cat_snacks',      'snacks',      'Snack Stations', 'Coffee machines and snack dispensers',            '/assets/icons/snack.png',       31, true)

ON CONFLICT (id) DO NOTHING;

COMMIT;
