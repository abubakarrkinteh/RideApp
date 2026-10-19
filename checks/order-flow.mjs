// Clicks through sign-in and a saved test order against a fake Supabase.
// It proves the app's behaviour, not the hosted project.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';

const {window} = parseHTML(fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));
globalThis.window = window; globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', {value: {}, configurable: true});
window.scrollTo = () => {}; window.confirm = () => true;
globalThis.requestAnimationFrame = fn => fn();
console.warn = () => {};

// Fake Supabase.
let domodaPrice = 22500, rpcMode = 'ok';
const rpcCalls = [], authCalls = [];
const reply = (status, body) => ({ok: status < 400, status, json: async () => body});
globalThis.fetch = async (url, options = {}) => {
  const u = new URL(url), body = options.body ? JSON.parse(options.body) : null;
  if (u.pathname === '/rest/v1/restaurants') return reply(200, [{id: 'kitchen', name: 'Sample kitchen', is_open: true, is_test: true, currency: 'GMD', delivery_fee_minor: 5000}]);
  if (u.pathname === '/rest/v1/menu_items') return reply(200, [
    {id: 'domoda', restaurant_id: 'kitchen', name: 'Domoda', description: 'Stew', price_minor: domodaPrice},
    {id: 'juice', restaurant_id: 'kitchen', name: 'Fresh juice', description: 'Drink', price_minor: 7500}]);
  if (u.pathname === '/auth/v1/token') {
    authCalls.push(body);
    if (body.password !== 'right-password') return reply(400, {error_code: 'invalid_credentials', msg: 'Invalid login credentials'});
    return reply(200, {access_token: 'token-1', refresh_token: 'refresh-1', expires_in: 3600, user: {email: body.email}});
  }
  if (u.pathname === '/auth/v1/signup') return reply(200, {id: 'new-user', email: body.email});
  if (u.pathname === '/auth/v1/logout') return reply(204, {});
  if (u.pathname === '/rest/v1/rpc/place_order') {
    rpcCalls.push({auth: options.headers.Authorization, ...body});
    if (rpcMode === 'offline-once') { rpcMode = 'ok'; throw new TypeError('Failed to fetch'); }
    const total = (domodaPrice * 2 + 7500 + 5000);
    if (body.p_expected_total_minor !== total) return reply(400, {code: '22023', message: 'PRICE_CHANGED', details: String(total)});
    return reply(200, {id: 'a1b2c3d4-0000-4000-8000-000000000001', status: 'placed', subtotal_minor: total - 5000, delivery_fee_minor: 5000, total_minor: total});
  }
  throw new Error('Unexpected request ' + u.pathname);
};

await import('../dist/app.js');
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0)); };
const $ = s => { const el = document.querySelector(s); assert(el, 'Missing ' + s); return el; };
const click = async s => { $(s).dispatchEvent(new window.Event('click', {bubbles: true})); await settle(); };
const input = (s, v) => { const el = $(s); el.value = v; el.dispatchEvent(new window.Event('input', {bubbles: true})); };
const text = () => $('#app').textContent;
await settle();

// Fill a basket from the database menu and go to the order review.
async function basket() {
  await click('[data-action="food"]'); await click('[data-action="restaurant"][data-id="kitchen"]');
  assert(text().includes('Menu and prices from the RideApp test database.'));
  await click('[data-id="domoda"][data-delta="1"]'); await click('[data-id="domoda"][data-delta="1"]'); await click('[data-id="juice"][data-delta="1"]');
  await click('[data-action="cart"]'); await click('[data-action="delivery"]');
  input('#landmark', 'Near the market'); await click('[data-action="review-food"]');
}
await basket();
assert(text().includes('D 575'));
assert(!document.querySelector('[data-action="place-food"]'), 'Signed-out people cannot place a saved order');

// Sign in: wrong password first, then the right one, then back to the order.
await click('[data-action="sign-in-to-order"]');
assert(text().includes('Sign in.'));
input('#auth-email', 'kinteh@example.com'); $('#auth-password').value = 'short';
await click('[data-action="sign-in"]');
assert($('#form-error').textContent.includes('at least 8 characters'));
assert.equal(authCalls.length, 0, 'Too-short password is stopped before sending');
$('#auth-password').value = 'wrong-password'; await click('[data-action="sign-in"]');
assert($('#form-error').textContent.includes('Email or password is not right.'));
$('#auth-password').value = 'right-password'; await click('[data-action="sign-in"]');
assert(text().includes('Your order.'), 'After sign-in the person returns to their order');
assert(text().includes('This order is saved in the RideApp test database.'));

// First try has no connection; the retry uses the same key, so only one order can exist.
rpcMode = 'offline-once';
await click('[data-action="place-food"]');
assert($('#form-error').textContent.includes('will not make a second order'));
await click('[data-action="place-food"]');
assert.equal(rpcCalls.length, 2);
assert.equal(rpcCalls[0].p_idempotency_key, rpcCalls[1].p_idempotency_key);
assert.equal(rpcCalls[1].auth, 'Bearer token-1');
assert.equal(rpcCalls[1].p_expected_total_minor, 57500);
assert.deepEqual(rpcCalls[1].p_items, [{menu_item_id: 'domoda', quantity: 2}, {menu_item_id: 'juice', quantity: 1}]);
assert(text().includes('RA-A1B2C3D4 · Saved test order'));
assert(text().includes('Server status: placed.'));
assert.equal($('#activity-count').textContent, '1');

// The price changed on the server: the order is refused and the new total is shown.
domodaPrice = 24000;
await basket();
assert(text().includes('D 575'));
await click('[data-action="place-food"]');
assert($('#form-error').textContent.includes('Prices have changed'));
assert(text().includes('D 605'), 'The new total is shown after the menu reloads');
const refusedKey = rpcCalls.at(-1).p_idempotency_key;
await click('[data-action="place-food"]');
assert.equal(rpcCalls.at(-1).p_expected_total_minor, 60500);
assert.notEqual(rpcCalls.at(-1).p_idempotency_key, refusedKey);
assert.equal($('#activity-count').textContent, '2');

// Account screen, sign out, and a new account that must confirm its email.
await click('[data-action="activity"]');
assert(text().includes('Signed in as kinteh@example.com'));
await click('[data-action="account"]'); await click('[data-action="sign-out"]');
assert(text().includes('Sign in.'));
input('#auth-email', 'new@example.com'); $('#auth-password').value = 'new-password-1';
await click('[data-action="sign-up"]');
assert(text().includes('We sent an email to new@example.com'));

console.log('PASS: sign-in errors and success, return to the order, saved test order with server price, retry without a second order, price change refused and re-shown, sign-out and new-account email step.');
