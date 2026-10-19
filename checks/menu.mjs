// Checks how the Supabase menu is turned into the app's restaurant list.
import assert from 'node:assert/strict';
import {RESTAURANTS,foodTotals,useMenu} from '../dist/core.js';
import {toRestaurants,fetchMenu} from '../dist/menu.js';

const builtIn = RESTAURANTS.map(r => ({...r}));
const rows = [
  {id: 'bowl', name: 'Blue bowl', is_open: true, is_test: true, currency: 'GMD', delivery_fee_minor: 5000},
  {id: 'kitchen', name: 'Sample kitchen', is_open: true, is_test: true, currency: 'GMD', delivery_fee_minor: 6000},
  {id: 'closed', name: 'Closed place', is_open: false, is_test: true, currency: 'GMD', delivery_fee_minor: 5000},
  {id: 'usd', name: 'Wrong money', is_open: true, is_test: true, currency: 'USD', delivery_fee_minor: 5000},
  {id: 'empty', name: 'No items', is_open: true, is_test: true, currency: 'GMD', delivery_fee_minor: 5000},
  {id: 'newplace', name: 'New place', is_open: true, is_test: true, currency: 'GMD', delivery_fee_minor: 0}
];
const items = [
  {id: 'domoda', restaurant_id: 'kitchen', name: 'Domoda', description: 'Stew', price_minor: 24000},
  {id: 'juice', restaurant_id: 'kitchen', name: 'Fresh juice', description: null, price_minor: 7500},
  {id: 'bad', restaurant_id: 'kitchen', name: 'Bad price', price_minor: 12.5},
  {id: 'beans', restaurant_id: 'bowl', name: 'Beans & rice', description: 'Bowl', price_minor: 17500},
  {id: 'x', restaurant_id: 'closed', name: 'Hidden', price_minor: 100},
  {id: 'tea', restaurant_id: 'newplace', name: 'Tea', price_minor: 2000}
];

const list = toRestaurants(rows, items);
assert.deepEqual(list.map(r => r.id), ['kitchen', 'bowl', 'newplace']); // demo order kept, closed/wrong currency/empty left out
const kitchen = list[0];
assert.equal(kitchen.emoji, '🍲');
assert.equal(kitchen.area, 'brusubi');
assert.equal(kitchen.delivery, 60);
assert.deepEqual(kitchen.items.map(i => [i.id, i.price, i.description]), [['domoda', 240, 'Stew'], ['juice', 75, '']]);
assert.equal(list[2].category, 'Local'); // a restaurant the demo did not know still gets a card
assert.throws(() => toRestaurants(null, []));

// Totals use the database price and delivery fee.
useMenu(list);
const t = foodTotals('kitchen', {domoda: 2, juice: 1});
assert.deepEqual([t.subtotal, t.delivery, t.total], [555, 60, 615]);
useMenu(builtIn);
assert.equal(foodTotals('kitchen', {domoda: 2, juice: 1}).total, 575);

// Fetch sends only the publishable key and reports server errors.
const seen = [];
const fake = async (url, options) => {
  seen.push([String(url), options.headers.apikey]);
  return {ok: true, json: async () => String(url).includes('/restaurants') ? rows : items};
};
assert.equal((await fetchMenu({url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test'}, fake)).length, 3);
assert(seen.every(([url, key]) => url.startsWith('https://example.supabase.co/rest/v1/') && key === 'sb_publishable_test'));
await assert.rejects(fetchMenu({url: 'https://example.supabase.co', publishableKey: 'k'}, async () => ({ok: false, status: 401})), /401/);

console.log('PASS: Supabase menu mapping, demo card details, closed/invalid entries left out, database prices and delivery in totals, request headers and server errors.');
