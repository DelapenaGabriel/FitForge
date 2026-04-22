-- ============================================
-- FitForge Nutrition Tracker — Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Nutrition Settings (per-user macro/calorie goals)
CREATE TABLE IF NOT EXISTS nutrition_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_calories INT DEFAULT 2130,
  protein_g INT DEFAULT 190,
  fat_g INT DEFAULT 70,
  carbs_g INT DEFAULT 185,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE nutrition_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nutrition settings"
  ON nutrition_settings FOR ALL
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- 2. Food Logs (what users ate, when)
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  brand TEXT,
  calories INT NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) DEFAULT 0,
  fat_g NUMERIC(6,1) DEFAULT 0,
  carbs_g NUMERIC(6,1) DEFAULT 0,
  serving_size TEXT,
  serving_qty NUMERIC(6,1) DEFAULT 1,
  logged_at TIMESTAMPTZ NOT NULL,
  source TEXT DEFAULT 'manual',
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own food logs"
  ON food_logs FOR ALL
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, logged_at);

-- 3. Custom Foods — Curated international dishes for instant search
CREATE TABLE IF NOT EXISTS custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  brand TEXT,
  calories INT NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) DEFAULT 0,
  fat_g NUMERIC(6,1) DEFAULT 0,
  carbs_g NUMERIC(6,1) DEFAULT 0,
  serving_size TEXT DEFAULT '1 serving',
  cuisine TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;

-- Everyone can read custom foods
CREATE POLICY "Anyone can read custom foods"
  ON custom_foods FOR SELECT
  USING (true);

-- Seed with popular international dishes
INSERT INTO custom_foods (food_name, brand, calories, protein_g, fat_g, carbs_g, serving_size, cuisine) VALUES
-- Filipino Dishes
('Chicken Adobo', 'Filipino Classic', 280, 25, 16, 8, '1 cup (240g)', 'Filipino'),
('Pork Sinigang', 'Filipino Classic', 195, 18, 10, 12, '1 bowl (350g)', 'Filipino'),
('Lumpia Shanghai', 'Filipino Classic', 120, 6, 7, 9, '3 pieces (90g)', 'Filipino'),
('Pancit Canton', 'Filipino Classic', 310, 12, 10, 45, '1 plate (250g)', 'Filipino'),
('Lechon Kawali', 'Filipino Classic', 420, 28, 32, 5, '1 serving (150g)', 'Filipino'),
('Kare-Kare', 'Filipino Classic', 350, 22, 20, 18, '1 bowl (350g)', 'Filipino'),
('Tinola', 'Filipino Classic', 180, 20, 8, 8, '1 bowl (350g)', 'Filipino'),
('Bistek Tagalog', 'Filipino Classic', 290, 26, 18, 6, '1 serving (200g)', 'Filipino'),
('Pinakbet', 'Filipino Classic', 150, 8, 7, 15, '1 cup (200g)', 'Filipino'),
('Longganisa', 'Filipino Classic', 250, 12, 20, 6, '3 pieces (100g)', 'Filipino'),
('Tapsilog', 'Filipino Classic', 550, 30, 22, 58, '1 plate', 'Filipino'),
('Sisig', 'Filipino Classic', 390, 24, 28, 10, '1 plate (200g)', 'Filipino'),
('Caldereta', 'Filipino Classic', 380, 28, 22, 16, '1 bowl (300g)', 'Filipino'),
('Arroz Caldo', 'Filipino Classic', 220, 15, 6, 28, '1 bowl (350g)', 'Filipino'),
('Halo-Halo', 'Filipino Classic', 350, 5, 8, 68, '1 serving (400ml)', 'Filipino'),
('Bibingka', 'Filipino Classic', 280, 6, 10, 42, '1 piece (120g)', 'Filipino'),
('Tocino', 'Filipino Classic', 200, 14, 12, 10, '3 pieces (100g)', 'Filipino'),
('Mechado', 'Filipino Classic', 310, 26, 18, 12, '1 serving (250g)', 'Filipino'),

-- Mexican Dishes
('Carne Asada Tacos', 'Mexican Classic', 420, 28, 18, 38, '3 tacos', 'Mexican'),
('Chicken Burrito', 'Mexican Classic', 580, 32, 18, 68, '1 burrito (350g)', 'Mexican'),
('Carnitas', 'Mexican Classic', 320, 28, 20, 6, '1 serving (150g)', 'Mexican'),
('Tamales (Pork)', 'Mexican Classic', 280, 12, 14, 28, '2 tamales', 'Mexican'),
('Enchiladas Rojas', 'Mexican Classic', 380, 18, 16, 40, '3 enchiladas', 'Mexican'),
('Pozole Rojo', 'Mexican Classic', 290, 20, 10, 30, '1 bowl (400g)', 'Mexican'),
('Chiles Rellenos', 'Mexican Classic', 350, 18, 20, 24, '2 pieces', 'Mexican'),
('Birria', 'Mexican Classic', 380, 32, 22, 10, '1 bowl (350g)', 'Mexican'),
('Quesadilla (Cheese)', 'Mexican Classic', 380, 16, 20, 32, '1 quesadilla', 'Mexican'),
('Chilaquiles', 'Mexican Classic', 420, 18, 22, 38, '1 plate (300g)', 'Mexican'),
('Elote (Street Corn)', 'Mexican Classic', 210, 6, 10, 28, '1 ear', 'Mexican'),
('Mole Poblano', 'Mexican Classic', 360, 24, 18, 26, '1 serving (250g)', 'Mexican'),
('Horchata', 'Mexican Classic', 180, 2, 3, 38, '1 glass (350ml)', 'Mexican'),
('Guacamole', 'Mexican Classic', 160, 2, 14, 9, '1/2 cup (120g)', 'Mexican'),
('Churros', 'Mexican Classic', 230, 3, 10, 32, '3 pieces', 'Mexican'),
('Huevos Rancheros', 'Mexican Classic', 380, 18, 20, 32, '1 plate', 'Mexican'),
('Torta Ahogada', 'Mexican Classic', 520, 28, 22, 50, '1 torta', 'Mexican'),
('Sopes', 'Mexican Classic', 340, 14, 16, 36, '3 sopes', 'Mexican'),

-- American Classics
('Grilled Chicken Breast', 'Classic', 165, 31, 3.6, 0, '1 breast (150g)', 'American'),
('Cheeseburger', 'Classic', 550, 30, 32, 36, '1 burger', 'American'),
('Caesar Salad', 'Classic', 280, 14, 18, 16, '1 bowl (300g)', 'American'),
('BBQ Ribs', 'Classic', 480, 32, 32, 18, '4 ribs (200g)', 'American'),
('Mac and Cheese', 'Classic', 380, 14, 18, 40, '1 cup (250g)', 'American'),
('Buffalo Wings', 'Classic', 430, 28, 28, 16, '8 wings', 'American'),
('Club Sandwich', 'Classic', 520, 28, 26, 42, '1 sandwich', 'American'),
('Clam Chowder', 'Classic', 220, 8, 12, 20, '1 bowl (300g)', 'American'),
('Pulled Pork Sandwich', 'Classic', 480, 26, 18, 48, '1 sandwich', 'American'),
('Pancakes (Stack)', 'Classic', 520, 12, 16, 80, '3 pancakes', 'American'),

-- Asian Dishes
('Jasmine Rice (Cooked)', 'Asian Staple', 340, 8, 5, 64, '1 cup (200g)', 'Asian'),
('Chicken Teriyaki', 'Japanese', 320, 28, 10, 28, '1 serving (250g)', 'Asian'),
('Pad Thai', 'Thai Classic', 380, 16, 12, 52, '1 plate (300g)', 'Asian'),
('Beef Pho', 'Vietnamese', 420, 28, 10, 52, '1 bowl (500g)', 'Asian'),
('Kung Pao Chicken', 'Chinese', 380, 26, 20, 24, '1 plate (250g)', 'Asian'),
('Tonkotsu Ramen', 'Japanese', 550, 22, 22, 62, '1 bowl (500g)', 'Asian'),
('Spring Rolls (Fresh)', 'Vietnamese', 130, 6, 2, 22, '2 rolls', 'Asian'),
('Bibimbap', 'Korean', 480, 22, 14, 64, '1 bowl (400g)', 'Asian'),
('Green Curry (Chicken)', 'Thai Classic', 350, 20, 18, 28, '1 bowl (300g)', 'Asian'),
('Fried Rice', 'Chinese', 420, 14, 16, 56, '1 plate (300g)', 'Asian'),
('Sushi Roll (California)', 'Japanese', 280, 10, 8, 42, '8 pieces', 'Asian'),
('Dumplings (Pork)', 'Chinese', 340, 16, 14, 36, '8 pieces (200g)', 'Asian'),
('Bulgogi', 'Korean', 320, 28, 16, 16, '1 serving (200g)', 'Asian'),
('Tom Yum Soup', 'Thai Classic', 180, 14, 6, 18, '1 bowl (350g)', 'Asian'),
('Yakisoba', 'Japanese', 400, 16, 14, 52, '1 plate (300g)', 'Asian'),
('Kimchi Jjigae', 'Korean', 250, 18, 12, 18, '1 bowl (350g)', 'Asian'),

-- Mediterranean / Middle Eastern
('Chicken Shawarma', 'Mediterranean', 420, 30, 22, 26, '1 wrap', 'Mediterranean'),
('Falafel Plate', 'Mediterranean', 380, 14, 18, 42, '1 plate', 'Mediterranean'),
('Hummus', 'Mediterranean', 170, 8, 10, 14, '1/2 cup (120g)', 'Mediterranean'),
('Greek Salad', 'Mediterranean', 220, 8, 16, 12, '1 bowl (250g)', 'Mediterranean'),
('Gyro', 'Greek', 480, 26, 24, 38, '1 gyro', 'Mediterranean'),
('Kebab Plate', 'Mediterranean', 520, 34, 24, 40, '1 plate', 'Mediterranean'),
('Baba Ganoush', 'Mediterranean', 130, 4, 8, 12, '1/2 cup (120g)', 'Mediterranean'),
('Tabbouleh', 'Mediterranean', 160, 4, 8, 20, '1 cup (200g)', 'Mediterranean'),

-- Indian
('Butter Chicken', 'Indian Classic', 380, 28, 20, 18, '1 serving (250g)', 'Indian'),
('Chicken Tikka Masala', 'Indian Classic', 360, 26, 18, 20, '1 serving (250g)', 'Indian'),
('Dal Tadka', 'Indian Classic', 220, 12, 8, 28, '1 bowl (250g)', 'Indian'),
('Biryani (Chicken)', 'Indian Classic', 450, 24, 14, 56, '1 plate (350g)', 'Indian'),
('Naan Bread', 'Indian Classic', 260, 8, 5, 46, '1 piece (100g)', 'Indian'),
('Palak Paneer', 'Indian Classic', 280, 14, 18, 16, '1 serving (250g)', 'Indian'),
('Samosa', 'Indian Classic', 260, 6, 14, 28, '2 pieces', 'Indian'),
('Tandoori Chicken', 'Indian Classic', 260, 32, 12, 6, '1 serving (200g)', 'Indian'),

-- Healthy / Fitness Staples
('Protein Shake (Whey)', 'Supplement', 130, 25, 2, 3, '1 scoop (32g)', 'Fitness'),
('Greek Yogurt (Plain)', 'Dairy', 130, 18, 4, 6, '1 cup (200g)', 'Fitness'),
('Oatmeal (Cooked)', 'Breakfast', 150, 5, 2.5, 27, '1 cup (240g)', 'Fitness'),
('Hard Boiled Eggs', 'Breakfast', 155, 13, 11, 1, '2 eggs', 'Fitness'),
('Sweet Potato', 'Veggie', 86, 2, 0, 20, '1 medium (100g)', 'Fitness'),
('Brown Rice (Cooked)', 'Grain', 216, 5, 1.8, 45, '1 cup (200g)', 'Fitness'),
('Quinoa (Cooked)', 'Grain', 220, 8, 3.5, 39, '1 cup (185g)', 'Fitness'),
('Salmon Fillet', 'Protein', 360, 40, 20, 0, '1 fillet (200g)', 'Fitness'),
('Chicken Thigh (Grilled)', 'Protein', 280, 26, 18, 0, '1 thigh (150g)', 'Fitness'),
('Tilapia Fillet', 'Protein', 200, 40, 5, 0, '1 fillet (170g)', 'Fitness'),
('Turkey Breast', 'Protein', 160, 30, 3, 0, '4 oz (113g)', 'Fitness'),
('Avocado', 'Produce', 240, 3, 22, 12, '1 whole (150g)', 'Fitness'),
('Banana', 'Produce', 105, 1.3, 0.4, 27, '1 medium (120g)', 'Fitness'),
('Almonds', 'Nuts', 160, 6, 14, 6, '1 oz (28g)', 'Fitness'),
('Peanut Butter', 'Spread', 190, 7, 16, 7, '2 tbsp (32g)', 'Fitness'),
('Cottage Cheese', 'Dairy', 110, 14, 4.3, 3.5, '1/2 cup (113g)', 'Fitness'),
('Mixed Berries', 'Produce', 70, 1, 0.5, 17, '1 cup (150g)', 'Fitness'),
('Broccoli (Steamed)', 'Veggie', 55, 3.7, 0.6, 11, '1 cup (155g)', 'Fitness'),
('Spinach Salad', 'Veggie', 40, 3, 1, 4, '2 cups (60g)', 'Fitness'),
('Tuna (Canned)', 'Protein', 120, 26, 1, 0, '1 can (113g)', 'Fitness'),

-- Fast Food / Popular Chains
('Double-Double w/Onion', 'In-N-Out', 610, 34, 34, 41, '1 burger', 'Fast Food'),
('Stuffed Jalapeño (3)', 'Jack in the Box', 220, 6, 12, 21, '3 pieces', 'Fast Food'),
('Big Mac', 'McDonalds', 550, 25, 30, 45, '1 burger', 'Fast Food'),
('Chicken McNuggets (10pc)', 'McDonalds', 410, 24, 24, 26, '10 pieces', 'Fast Food'),
('Whopper', 'Burger King', 660, 28, 40, 49, '1 burger', 'Fast Food'),
('Crunchwrap Supreme', 'Taco Bell', 530, 16, 21, 71, '1 wrap', 'Fast Food'),
('Baconator', 'Wendys', 940, 58, 62, 38, '1 burger', 'Fast Food'),
('Popcorn Chicken', 'KFC', 380, 18, 22, 26, '1 serving', 'Fast Food'),
('Chipotle Burrito Bowl', 'Chipotle', 630, 36, 22, 72, '1 bowl', 'Fast Food'),
('Spicy Chicken Sandwich', 'Chick-fil-A', 450, 28, 18, 44, '1 sandwich', 'Fast Food');
