-- Restaurants, menus and food orders.
-- Money is stored as whole bututs (1 dalasi = 100 bututs) with an explicit currency.
-- Prices are always worked out on the server. The browser total is never trusted.
-- Payment is simulated for now. There is no real payment state yet.

create table public.restaurants (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 100),
  is_open boolean not null default false,
  is_test boolean not null default true,
  currency char(3) not null default 'GMD' check (currency = 'GMD'),
  delivery_fee_minor integer not null check (delivery_fee_minor >= 0),
  created_at timestamptz not null default now()
);

create table public.restaurant_staff (
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table public.menu_items (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 300),
  price_minor integer not null check (price_minor > 0),
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index menu_items_restaurant on public.menu_items (restaurant_id, sort_order);

create type public.order_status as enum (
  'placed', 'accepted', 'rejected', 'cancelled', 'ready', 'picked_up', 'delivered'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id),
  restaurant_id text not null references public.restaurants (id),
  status public.order_status not null default 'placed',
  currency char(3) not null,
  subtotal_minor integer not null check (subtotal_minor > 0),
  delivery_fee_minor integer not null check (delivery_fee_minor >= 0),
  total_minor integer not null,
  payment_mode text not null default 'simulated' check (payment_mode = 'simulated'),
  delivery_address text not null check (char_length(delivery_address) between 1 and 300),
  delivery_note text check (char_length(delivery_note) <= 300),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_minor = subtotal_minor + delivery_fee_minor),
  unique (customer_id, idempotency_key)
);
create index orders_customer on public.orders (customer_id, created_at desc);
create index orders_restaurant on public.orders (restaurant_id, status, created_at desc);

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Name and price are copied at order time, so later menu changes do not alter old orders.
create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  line_no integer not null check (line_no > 0),
  menu_item_id text not null references public.menu_items (id),
  name text not null,
  unit_price_minor integer not null check (unit_price_minor > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_minor integer not null,
  primary key (order_id, line_no),
  check (line_total_minor = unit_price_minor * quantity)
);

-- History of every status change.
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references auth.users (id) on delete set null,
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);
create index order_events_order on public.order_events (order_id, id);

create function public.is_restaurant_staff(p_restaurant_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff s
    join public.user_roles r on r.user_id = s.user_id and r.role = 'restaurant_staff'
    where s.restaurant_id = p_restaurant_id and s.user_id = (select auth.uid())
  );
$$;

create function public.can_see_order(p_order_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (o.customer_id = (select auth.uid())
           or public.is_restaurant_staff(o.restaurant_id)
           or public.has_role('admin'))
  );
$$;

-- Customer places an order.
-- p_items: [{"menu_item_id": "benachin", "quantity": 2}, ...]
-- p_expected_total_minor: the total the customer saw. If the server total differs,
--   the order is refused with PRICE_CHANGED so the customer can confirm the new price.
-- Sending the same p_idempotency_key again returns the first order instead of a new one.
create function public.place_order(
  p_restaurant_id text,
  p_items jsonb,
  p_delivery_address text,
  p_idempotency_key uuid,
  p_expected_total_minor integer default null,
  p_delivery_note text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_restaurant public.restaurants;
  v_subtotal integer := 0;
  v_total integer;
  v_line record;
  v_count integer;
begin
  if v_uid is null or not public.has_role('customer') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'MISSING_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  -- A retry returns the order that was already made.
  select * into v_order from public.orders
  where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_order;
  end if;

  select * into v_restaurant from public.restaurants where id = p_restaurant_id;
  if not found then
    raise exception 'RESTAURANT_NOT_FOUND' using errcode = '22023';
  end if;
  if not v_restaurant.is_open then
    raise exception 'RESTAURANT_CLOSED' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'TOO_MANY_LINES' using errcode = '22023';
  end if;

  -- Check each line against the real menu.
  create temporary table if not exists pg_temp.order_lines (
    line_no integer, menu_item_id text, quantity integer
  ) on commit drop;
  delete from pg_temp.order_lines;

  begin
    insert into pg_temp.order_lines
    select ord::integer, e->>'menu_item_id', (e->>'quantity')::integer
    from jsonb_array_elements(p_items) with ordinality as t(e, ord);
  exception when others then
    raise exception 'BAD_ITEMS' using errcode = '22023';
  end;

  if exists (select 1 from pg_temp.order_lines where quantity is null or quantity < 1 or quantity > 20) then
    raise exception 'BAD_QUANTITY' using errcode = '22023';
  end if;
  if (select count(distinct menu_item_id) from pg_temp.order_lines)
     <> (select count(*) from pg_temp.order_lines) then
    raise exception 'DUPLICATE_ITEM' using errcode = '22023';
  end if;

  select count(*) into v_count
  from pg_temp.order_lines l
  join public.menu_items m on m.id = l.menu_item_id
  where m.restaurant_id = p_restaurant_id and m.is_available;
  if v_count <> (select count(*) from pg_temp.order_lines) then
    raise exception 'ITEM_NOT_AVAILABLE' using errcode = '22023';
  end if;

  select sum(m.price_minor * l.quantity)::integer into v_subtotal
  from pg_temp.order_lines l join public.menu_items m on m.id = l.menu_item_id;
  v_total := v_subtotal + v_restaurant.delivery_fee_minor;

  if p_expected_total_minor is not null and p_expected_total_minor <> v_total then
    raise exception 'PRICE_CHANGED' using errcode = '22023', detail = v_total::text;
  end if;

  -- The unique key makes a second, simultaneous attempt fall through to the existing order.
  insert into public.orders (
    customer_id, restaurant_id, currency, subtotal_minor, delivery_fee_minor, total_minor,
    delivery_address, delivery_note, idempotency_key
  ) values (
    v_uid, p_restaurant_id, v_restaurant.currency, v_subtotal, v_restaurant.delivery_fee_minor,
    v_total, trim(p_delivery_address), nullif(trim(p_delivery_note), ''), p_idempotency_key
  )
  on conflict (customer_id, idempotency_key) do nothing
  returning * into v_order;

  if v_order.id is null then
    select * into v_order from public.orders
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
    return v_order;
  end if;

  insert into public.order_items (order_id, line_no, menu_item_id, name, unit_price_minor, quantity, line_total_minor)
  select v_order.id, l.line_no, m.id, m.name, m.price_minor, l.quantity, m.price_minor * l.quantity
  from pg_temp.order_lines l join public.menu_items m on m.id = l.menu_item_id;

  insert into public.order_events (order_id, from_status, to_status, actor_id)
  values (v_order.id, null, 'placed', v_uid);

  return v_order;
end $$;

-- Restaurant staff accept or reject a new order.
create function public.respond_to_order(p_order_id uuid, p_accept boolean, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_to public.order_status := case when p_accept then 'accepted'::public.order_status else 'rejected'::public.order_status end;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or not public.is_restaurant_staff(v_order.restaurant_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  update public.orders set status = v_to
  where id = p_order_id and status = 'placed'
  returning * into v_order;
  if not found then
    raise exception 'WRONG_STATUS' using errcode = '22023';
  end if;

  insert into public.order_events (order_id, from_status, to_status, actor_id, reason)
  values (p_order_id, 'placed', v_to, auth.uid(), p_reason);
  return v_order;
end $$;

-- Customer cancels their own order before the restaurant answers.
create function public.cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  update public.orders set status = 'cancelled'
  where id = p_order_id and customer_id = auth.uid() and status = 'placed'
  returning * into v_order;
  if not found then
    if exists (select 1 from public.orders where id = p_order_id and customer_id = auth.uid()) then
      raise exception 'WRONG_STATUS' using errcode = '22023';
    end if;
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  insert into public.order_events (order_id, from_status, to_status, actor_id, reason)
  values (p_order_id, 'placed', 'cancelled', auth.uid(), p_reason);
  return v_order;
end $$;

-- Admin only: link a user to a restaurant as staff.
create function public.add_restaurant_staff(p_restaurant_id text, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, 'restaurant_staff', auth.uid()) on conflict do nothing;
  insert into public.restaurant_staff (restaurant_id, user_id)
  values (p_restaurant_id, p_user_id) on conflict do nothing;
end $$;

alter table public.restaurants enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create policy restaurants_read on public.restaurants for select to anon, authenticated using (true);
create policy menu_items_read on public.menu_items for select to anon, authenticated using (true);
create policy restaurant_staff_read on public.restaurant_staff for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));
create policy orders_read on public.orders for select to authenticated
  using (customer_id = (select auth.uid())
         or public.is_restaurant_staff(restaurant_id)
         or public.has_role('admin'));
create policy order_items_read on public.order_items for select to authenticated
  using (public.can_see_order(order_id));
create policy order_events_read on public.order_events for select to authenticated
  using (public.can_see_order(order_id));

-- Read-only tables for the app. All changes go through the functions above.
revoke all on public.restaurants, public.restaurant_staff, public.menu_items,
  public.orders, public.order_items, public.order_events from anon, authenticated;
grant select on public.restaurants, public.menu_items to anon, authenticated;
grant select on public.restaurant_staff, public.orders, public.order_items, public.order_events to authenticated;

revoke execute on function public.is_restaurant_staff(text) from public, anon;
revoke execute on function public.can_see_order(uuid) from public, anon;
revoke execute on function public.place_order(text, jsonb, text, uuid, integer, text) from public, anon;
revoke execute on function public.respond_to_order(uuid, boolean, text) from public, anon;
revoke execute on function public.cancel_order(uuid, text) from public, anon;
revoke execute on function public.add_restaurant_staff(text, uuid) from public, anon;
grant execute on function public.is_restaurant_staff(text) to authenticated;
grant execute on function public.can_see_order(uuid) to authenticated;
grant execute on function public.place_order(text, jsonb, text, uuid, integer, text) to authenticated;
grant execute on function public.respond_to_order(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.add_restaurant_staff(text, uuid) to authenticated;
