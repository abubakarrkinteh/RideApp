// Sends a food order to the server. The server works out the price and saves the order.
// Payment is not taken. The restaurant and courier steps after saving are still a demo.
export class OrderError extends Error {
  constructor(message, code, newTotal) { super(message); this.code = code; this.newTotal = newTotal; }
}

const MESSAGES = {
  PRICE_CHANGED: 'Prices have changed. Please check the new total, then place the order again.',
  RESTAURANT_CLOSED: 'This restaurant is closed right now.',
  RESTAURANT_NOT_FOUND: 'This restaurant is not available any more.',
  ITEM_NOT_AVAILABLE: 'Something in your basket is not available any more.',
  BAD_QUANTITY: 'Choose a quantity from 1 to 20.',
  NOT_ALLOWED: 'Please sign in again.',
  JWT: 'Please sign in again.'
};

export function orderError(body) {
  const text = String(body?.message || '');
  const code = Object.keys(MESSAGES).find(k => text.includes(k)) || (body?.code === 'PGRST301' || /jwt/i.test(text) ? 'JWT' : 'UNKNOWN');
  const newTotal = code === 'PRICE_CHANGED' && /^\d+$/.test(String(body?.details || '')) ? Number(body.details) : undefined;
  return new OrderError(MESSAGES[code] || 'The order could not be saved. Please try again.', code, newTotal);
}

// Money goes to the server in bututs (D 1 = 100 bututs).
export const toMinor = dalasi => Math.round(dalasi * 100);

export async function placeOrder({url, publishableKey}, token, order, fetchFn = globalThis.fetch) {
  let response;
  try {
    response = await fetchFn(new URL('/rest/v1/rpc/place_order', url), {
      method: 'POST',
      headers: {apikey: publishableKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({
        p_restaurant_id: order.restaurantId,
        p_items: order.lines.map(l => ({menu_item_id: l.id, quantity: l.quantity})),
        p_delivery_address: order.address,
        p_idempotency_key: order.key,
        p_expected_total_minor: toMinor(order.total),
        p_delivery_note: order.note || null
      })
    });
  } catch { throw new OrderError('No connection. Please try again. Trying again will not make a second order.', 'OFFLINE'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw orderError(data);
  return data;
}
