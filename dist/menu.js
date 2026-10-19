// Reads restaurants and menu items from Supabase and turns them into the shape the screens use.
// Prices arrive in bututs (100 bututs = D 1). Ordering is still simulated in the app.
import {RESTAURANTS} from './core.js';

// Card details the database does not hold yet. Taken from the built-in demo before any swap.
const LOOKS = Object.fromEntries(RESTAURANTS.map((r, index) => [r.id, {tag: r.tag, area: r.area, emoji: r.emoji, category: r.category, index}]));
const DEFAULT_LOOK = {tag: 'Restaurant', area: 'senegambia', emoji: '🍽️', category: 'Local', index: 999};

const wholeNumber = n => Number.isInteger(n) && n >= 0;

export function toRestaurants(restaurants, items) {
  if (!Array.isArray(restaurants) || !Array.isArray(items)) throw new Error('Unexpected menu data.');
  return restaurants
    .filter(r => r && r.is_open && r.currency === 'GMD' && wholeNumber(r.delivery_fee_minor))
    .map(r => {
      const look = LOOKS[r.id] || DEFAULT_LOOK;
      return {
        id: r.id, name: r.name, tag: look.tag, area: look.area, emoji: look.emoji, category: look.category,
        delivery: r.delivery_fee_minor / 100, isTest: r.is_test !== false, order: look.index,
        items: items
          .filter(i => i && i.restaurant_id === r.id && wholeNumber(i.price_minor) && i.price_minor > 0)
          .map(i => ({id: i.id, name: i.name, description: i.description || '', price: i.price_minor / 100}))
      };
    })
    .filter(r => r.items.length)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(({order, ...r}) => r);
}

export async function fetchMenu({url, publishableKey}, fetchFn = globalThis.fetch, timeoutMs = 8000) {
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  const get = async path => {
    const response = await fetchFn(new URL('/rest/v1/' + path, url), {headers: {apikey: publishableKey, Accept: 'application/json'}, signal});
    if (!response.ok) throw new Error('Menu request failed (' + response.status + ').');
    return response.json();
  };
  const [restaurants, items] = await Promise.all([
    get('restaurants?select=id,name,is_open,is_test,currency,delivery_fee_minor&is_open=eq.true'),
    get('menu_items?select=id,restaurant_id,name,description,price_minor,sort_order&is_available=eq.true&order=sort_order')
  ]);
  return toRestaurants(restaurants, items);
}
