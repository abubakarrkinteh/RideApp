// Database rule checks. Runs the Supabase migrations in an in-memory Postgres (PGlite)
// with a small stand-in for Supabase's auth schema, then acts as different users.
// This proves the SQL rules, not the hosted Supabase project itself.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

const root = path.resolve(import.meta.dirname, '..');
const db = new PGlite();

// Stand-in for what Supabase provides.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

const dir = path.join(root, 'supabase', 'migrations');
for (const file of fs.readdirSync(dir).sort()) await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
await db.exec(fs.readFileSync(path.join(root, 'supabase', 'seed.sql'), 'utf8'));

// Run SQL as a signed-in user (or anon when id is null), then go back to the owner.
async function as(id, sql, params = []) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id ?? '']);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
async function fails(id, sql, params, pattern) {
  await assert.rejects(as(id, sql, params), pattern);
}
async function signUp() {
  const id = randomUUID();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  return id;
}

const alice = await signUp(), bob = await signUp(), cook = await signUp(), otherCook = await signUp(), admin = await signUp();
await db.query(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [admin]); // first admin is set by the owner

// Sign-up gives a profile and only the customer role.
assert.deepEqual((await as(alice, 'select role from user_roles')).map(r => r.role), ['customer']);
assert.equal((await as(alice, 'select id from profiles')).length, 1);

// Users cannot give themselves roles.
await fails(alice, `insert into user_roles (user_id, role) values ($1, 'admin')`, [alice], /permission denied/);
await fails(alice, `update user_roles set role = 'admin'`, [], /permission denied/);
await fails(alice, `select grant_role($1, 'admin')`, [alice], /NOT_ALLOWED/);
await fails(alice, `select add_restaurant_staff('kitchen', $1)`, [alice], /NOT_ALLOWED/);

// Profiles: own name can change, nobody else's, and the id cannot change.
await as(alice, `update profiles set full_name = 'Alice'`);
await as(bob, `update profiles set full_name = 'Hacked' where id = $1`, [alice]);
assert.equal((await db.query('select full_name from profiles where id = $1', [alice])).rows[0].full_name, 'Alice');
await fails(alice, `update profiles set id = $1`, [bob], /permission denied/);
assert.equal((await as(bob, 'select * from profiles')).length, 1);

// Admin sets up restaurant staff.
await as(admin, `select add_restaurant_staff('kitchen', $1)`, [cook]);
await as(admin, `select add_restaurant_staff('grill', $1)`, [otherCook]);
assert.equal((await as(admin, 'select * from user_roles')).length, 8);

// Anyone can read the menu; visitors cannot read orders or profiles.
assert.equal((await as(null, 'select * from menu_items')).length, 10);
await fails(null, 'select * from orders', [], /permission denied/);
await fails(null, 'select * from profiles', [], /permission denied/);
await fails(null, `select place_order('kitchen', '[]', 'x', $1)`, [randomUUID()], /permission denied/);

// Server works out the price: 2 x Benachin D 250 + 1 juice D 75 + D 50 delivery = D 625.
const place = (user, key, items, expected = null, restaurant = 'kitchen') =>
  as(user, 'select * from place_order($1, $2, $3, $4, $5)', [restaurant, JSON.stringify(items), 'Brusubi, near the market', key, expected]);
const key = randomUUID();
const [order] = await place(alice, key, [{menu_item_id: 'benachin', quantity: 2}, {menu_item_id: 'juice', quantity: 1}], 62500);
assert.equal(order.status, 'placed');
assert.equal(order.subtotal_minor, 57500);
assert.equal(order.total_minor, 62500);
assert.equal(order.currency, 'GMD');
assert.equal(order.payment_mode, 'simulated');

// A retry with the same key returns the same order, not a second one.
const [again] = await place(alice, key, [{menu_item_id: 'benachin', quantity: 2}, {menu_item_id: 'juice', quantity: 1}], 62500);
assert.equal(again.id, order.id);
assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n, 1);

// Price changed since the customer looked: refused so they can confirm.
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'domoda', quantity: 1}], 1), /PRICE_CHANGED/);
// Bad orders are refused.
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'chicken', quantity: 1}]), /ITEM_NOT_AVAILABLE/); // other restaurant
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'nope', quantity: 1}]), /ITEM_NOT_AVAILABLE/);
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'domoda', quantity: 0}]), /BAD_QUANTITY/);
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'domoda', quantity: 21}]), /BAD_QUANTITY/);
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'domoda', quantity: 'two'}]), /BAD_ITEMS/);
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'domoda', quantity: 1}, {menu_item_id: 'domoda', quantity: 1}]), /DUPLICATE_ITEM/);
await assert.rejects(place(alice, randomUUID(), []), /EMPTY_ORDER/);
await db.exec(`update menu_items set is_available = false where id = 'fish'`);
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'fish', quantity: 1}]), /ITEM_NOT_AVAILABLE/);
await db.exec(`update restaurants set is_open = false where id = 'bowl'`);
await assert.rejects(place(alice, randomUUID(), [{menu_item_id: 'beans', quantity: 1}], null, 'bowl'), /RESTAURANT_CLOSED/);
assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n, 1);

// Old orders keep their price when the menu changes.
await db.exec(`update menu_items set price_minor = 99900 where id = 'benachin'`);
const [line] = await as(alice, 'select * from order_items where order_id = $1 and line_no = 1', [order.id]);
assert.equal(line.unit_price_minor, 25000);

// Orders cannot be written directly, only through the functions.
await fails(alice, `insert into orders (customer_id, restaurant_id, currency, subtotal_minor, delivery_fee_minor, total_minor, delivery_address, idempotency_key)
  values ($1, 'kitchen', 'GMD', 1, 0, 1, 'x', $2)`, [alice, randomUUID()], /permission denied/);
await fails(alice, `update orders set total_minor = 1`, [], /permission denied/);
await fails(alice, `update orders set status = 'delivered'`, [], /permission denied/);

// Who can see the order.
assert.equal((await as(alice, 'select * from orders')).length, 1);
assert.equal((await as(bob, 'select * from orders')).length, 0);
assert.equal((await as(bob, 'select * from order_items')).length, 0);
assert.equal((await as(cook, 'select * from orders')).length, 1);
assert.equal((await as(otherCook, 'select * from orders')).length, 0);
assert.equal((await as(admin, 'select * from orders')).length, 1);

// Only the right restaurant can accept, and only once.
await fails(alice, 'select respond_to_order($1, true)', [order.id], /NOT_ALLOWED/);
await fails(otherCook, 'select respond_to_order($1, true)', [order.id], /NOT_ALLOWED/);
await fails(bob, 'select cancel_order($1)', [order.id], /NOT_ALLOWED/);
await as(cook, 'select respond_to_order($1, true)', [order.id]);
await fails(cook, 'select respond_to_order($1, false)', [order.id], /WRONG_STATUS/);
await fails(alice, 'select cancel_order($1)', [order.id], /WRONG_STATUS/);
assert.deepEqual((await as(alice, 'select to_status from order_events where order_id = $1 order by id', [order.id])).map(e => e.to_status), ['placed', 'accepted']);

// Removing the staff role removes access, even if the staff link is still there.
await as(admin, `select revoke_role($1, 'restaurant_staff')`, [cook]);
assert.equal((await as(cook, 'select * from orders')).length, 0);

// Customer can cancel while the order is still waiting.
const [second] = await place(bob, randomUUID(), [{menu_item_id: 'plantain', quantity: 3}], 35000, 'grill');
await as(bob, 'select cancel_order($1)', [second.id]);
assert.equal((await as(bob, 'select status from orders where id = $1', [second.id]))[0].status, 'cancelled');
await fails(otherCook, 'select respond_to_order($1, true)', [second.id], /WRONG_STATUS/);

console.log('PASS: database rules for sign-up roles, no self-granted roles, profile privacy, server prices, retries without duplicates, price change confirmation, bad orders, price snapshots, order privacy, restaurant accept/reject, cancel and role removal.');
