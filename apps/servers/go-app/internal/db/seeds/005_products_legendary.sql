-- Legendary Furniture Products Seed Data
-- Description: Legendary rarity furniture items (~650-1200 coins, limited global stock)

BEGIN;

-- stock_quantity is set to the initial limited stock value (not NULL)
INSERT INTO furniture_products (
    id, category_id, name, description, price_coins, rarity,
    width, height, can_stack, sprite_url, thumbnail_url,
    is_available, stock_quantity, max_per_user
) VALUES
('prod_throne', 'cat_chairs', 'Developer Throne',
 'The ultimate seat of power. Reserved for the most productive agents.',
 1000, 'legendary', 2, 1, false,
 '/assets/sprites/furniture/throne.png', '/assets/thumbnails/throne.png',
 true, 10, 1),

('prod_vending_machine', 'cat_snacks', 'Vending Machine',
 'Fully stocked with snacks and energy drinks. Essential for late nights.',
 800, 'legendary', 2, 1, false,
 '/assets/sprites/furniture/vending_machine.png', '/assets/thumbnails/vending_machine.png',
 true, 15, 1),

('prod_arcade_cabinet', 'cat_electronics', 'Arcade Cabinet',
 'Retro gaming machine for break time entertainment.',
 900, 'legendary', 1, 1, false,
 '/assets/sprites/furniture/arcade_cabinet.png', '/assets/thumbnails/arcade_cabinet.png',
 true, 8, 1),

('prod_fish_tank', 'cat_decorations', 'Fish Tank',
 'Large aquarium with colorful fish. Relaxing to watch.',
 750, 'legendary', 3, 1, false,
 '/assets/sprites/furniture/fish_tank.png', '/assets/thumbnails/fish_tank.png',
 true, 12, 1),

('prod_jukebox', 'cat_electronics', 'Jukebox',
 'Vintage jukebox playing retro tunes.',
 700, 'legendary', 1, 1, false,
 '/assets/sprites/furniture/jukebox.png', '/assets/thumbnails/jukebox.png',
 true, 10, 1),

('prod_robot_vacuum', 'cat_electronics', 'Robot Vacuum',
 'Autonomous cleaning companion. Keeps the office spotless.',
 650, 'legendary', 1, 1, false,
 '/assets/sprites/furniture/robot_vacuum.png', '/assets/thumbnails/robot_vacuum.png',
 true, 20, 2),

('prod_cat_office', 'cat_pets', 'Office Cat',
 'A friendly cat that patrols the office. Boosts morale.',
 1200, 'legendary', 1, 1, false,
 '/assets/sprites/furniture/cat.png', '/assets/thumbnails/cat.png',
 true, 5, 1),

('prod_dog_office', 'cat_pets', 'Office Dog',
 'Loyal canine companion. Always happy to see you.',
 1200, 'legendary', 1, 1, false,
 '/assets/sprites/furniture/dog.png', '/assets/thumbnails/dog.png',
 true, 5, 1),

('prod_trophy_case', 'cat_decorations', 'Trophy Case',
 'Display your achievements in style. Automatically fills with your accomplishments.',
 850, 'legendary', 2, 2, false,
 '/assets/sprites/furniture/trophy_case.png', '/assets/thumbnails/trophy_case.png',
 true, 15, 1),

('prod_fortune_wheel', 'cat_decorations', 'Fortune Wheel',
 'Spin daily for bonus coins or exclusive items.',
 950, 'legendary', 2, 2, false,
 '/assets/sprites/furniture/fortune_wheel.png', '/assets/thumbnails/fortune_wheel.png',
 true, 3, 1)

ON CONFLICT (id) DO NOTHING;

COMMIT;
