-- Accounts and roles.
-- Every new sign-in gets a profile and the customer role.
-- Only an admin can grant other roles. Users can never grant roles to themselves.

create type public.app_role as enum ('customer', 'restaurant_staff', 'courier', 'driver', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  phone text check (char_length(phone) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- True when the signed-in user has the role.
create function public.has_role(p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = p_role
  );
$$;

-- New sign-in: create the profile and the customer role.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin only: give a role to a user.
create function public.grant_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, auth.uid())
  on conflict do nothing;
end $$;

-- Admin only: remove a role from a user.
create function public.revoke_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  delete from public.user_roles where user_id = p_user_id and role = p_role;
end $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));

-- Lock tables down, then open only what the app needs.
revoke all on public.profiles, public.user_roles from anon, authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.grant_role(uuid, public.app_role) from public, anon;
revoke execute on function public.revoke_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.grant_role(uuid, public.app_role) to authenticated;
grant execute on function public.revoke_role(uuid, public.app_role) to authenticated;
