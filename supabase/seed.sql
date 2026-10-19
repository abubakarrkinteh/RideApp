-- TEST DATA ONLY. Fictional restaurants and prices copied from the demo (dist/core.js).
-- They are marked is_test = true and must be removed before any live pilot.
-- Prices are in bututs: 25000 = D 250. Delivery is the demo's flat D 50.

insert into public.restaurants (id, name, is_open, is_test, delivery_fee_minor) values
  ('kitchen', 'Sample kitchen', true, true, 5000),
  ('grill', 'Coastal grill', true, true, 5000),
  ('bowl', 'Blue bowl', true, true, 5000)
on conflict (id) do nothing;

insert into public.menu_items (id, restaurant_id, name, description, price_minor, sort_order) values
  ('benachin', 'kitchen', 'Benachin', 'Rice, vegetables & chicken', 25000, 1),
  ('domoda', 'kitchen', 'Domoda', 'Peanut stew served with rice', 22500, 2),
  ('fish', 'kitchen', 'Grilled fish', 'Fish, rice & fresh salad', 30000, 3),
  ('juice', 'kitchen', 'Fresh juice', 'A refreshing drink with your meal', 7500, 4),
  ('grill-fish', 'grill', 'Fish plate', 'Grilled fish with rice and vegetables', 32500, 1),
  ('chicken', 'grill', 'Chicken plate', 'Grilled chicken, rice & salad', 27500, 2),
  ('plantain', 'grill', 'Plantain side', 'A small plate of fried plantain', 10000, 3),
  ('vegbowl', 'bowl', 'Vegetable rice bowl', 'Rice with seasonal vegetables', 20000, 1),
  ('beans', 'bowl', 'Beans & rice', 'A hearty bowl with a vegetable side', 17500, 2),
  ('bowl-juice', 'bowl', 'Fresh juice', 'A refreshing drink with your meal', 7500, 3)
on conflict (id) do nothing;
