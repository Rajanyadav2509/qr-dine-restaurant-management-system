-- ============================================================================
-- QR Dine — shared database schema for Supabase project "qr-dine-db"
-- (ref qpybzvfycamzosidytjj, region ap-south-1 Mumbai)
--
-- HOW TO RUN (Supabase dashboard):
--   1. Open the project → SQL Editor → New query
--   2. Paste this whole file and press Run
--   3. Confirm the "Schema created" notice, then check Table Editor shows
--      qrdine_tables, qrdine_menu, qrdine_orders, qrdine_settings
--
-- SECURITY NOTE — DEMO-GRADE POLICIES:
--   The policies below let the anon (public) key read/write all four tables.
--   That is intentional for this demo: the customer menu must write orders
--   with NO login, and the owner dashboard must read/write from any device.
--   BEFORE real production use, tighten them: e.g. allow anon INSERT only on
--   qrdine_orders, allow SELECT on menu/tables, and require an authenticated
--   owner (Supabase Auth) for UPDATE/DELETE and for reading orders.
--   Never put the service_role (secret) key in the website code.
-- ============================================================================

-- ---------------- tables ----------------

create table if not exists public.qrdine_tables (
  id     text primary key,
  name   text not null,
  pin    text not null check (pin ~ '^[0-9]{3}$'),
  type   text not null default 'table' check (type in ('table', 'room')),
  status text not null default 'Available' check (status in ('Available', 'Occupied'))
);

create table if not exists public.qrdine_menu (
  id        text primary key,
  name      text not null,
  price     numeric not null check (price > 0),
  veg       boolean not null default true,
  category  text not null default 'Tandoor Se',
  special   boolean not null default false,
  available boolean not null default true
);

create table if not exists public.qrdine_orders (
  id            uuid primary key default gen_random_uuid(),
  number        text not null unique,
  table_id      text not null references public.qrdine_tables (id) on delete restrict,
  customer_name text not null,
  phone         text,
  notes         text,
  status        text not null default 'New'
                check (status in ('New', 'Preparing', 'Served', 'Paid', 'Cancelled')),
  items         jsonb not null default '[]'::jsonb,
  payment_mode  text,
  subtotal      numeric not null default 0,
  discount      numeric not null default 0,
  extra         numeric not null default 0,
  grand         numeric not null default 0,
  final_total   numeric,
  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);

create table if not exists public.qrdine_settings (
  id               integer primary key,
  restaurant_name  text not null,
  address          text not null default '',
  upi_id           text not null,
  currency         text not null default '₹'
);

create index if not exists qrdine_orders_table_id_idx   on public.qrdine_orders (table_id);
create index if not exists qrdine_orders_status_idx     on public.qrdine_orders (status);
create index if not exists qrdine_orders_created_at_idx on public.qrdine_orders (created_at desc);

-- ---------------- Row Level Security (demo-grade open policies) ----------------

alter table public.qrdine_tables  enable row level security;
alter table public.qrdine_menu    enable row level security;
alter table public.qrdine_orders  enable row level security;
alter table public.qrdine_settings enable row level security;

-- Drop first so re-running this file is safe.
drop policy if exists "demo: all access" on public.qrdine_tables;
drop policy if exists "demo: all access" on public.qrdine_menu;
drop policy if exists "demo: all access" on public.qrdine_orders;
drop policy if exists "demo: all access" on public.qrdine_settings;

create policy "demo: all access" on public.qrdine_tables
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_menu
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_orders
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_settings
  for all to anon, authenticated using (true) with check (true);

-- ---------------- Realtime ----------------
-- The dashboard subscribes to these tables so every device updates live.

alter publication supabase_realtime add table public.qrdine_tables;
alter publication supabase_realtime add table public.qrdine_orders;
alter publication supabase_realtime add table public.qrdine_menu;
alter publication supabase_realtime add table public.qrdine_settings;

-- ---------------- seed data (same as the app's local demo data) ----------------

insert into public.qrdine_settings (id, restaurant_name, address, upi_id, currency)
values (1, 'Bhukhad Bachelors', 'Market, Royal Garden Park, Bokaro', 'yaduvanshirajan228@axl', '₹')
on conflict (id) do update set
  restaurant_name = excluded.restaurant_name,
  address = excluded.address,
  upi_id = excluded.upi_id,
  currency = excluded.currency;

insert into public.qrdine_menu (id, name, price, veg, category, special, available) values
  ('m1',  'Roti',                   15, true,  'Tandoor Se',      false, true),
  ('m2',  'Butter Roti',            20, true,  'Tandoor Se',      false, true),
  ('m3',  'Plain Naan',             25, true,  'Tandoor Se',      false, true),
  ('m4',  'Butter Naan',            35, true,  'Tandoor Se',      false, true),
  ('m5',  'Garlic Naan',            40, true,  'Tandoor Se',      false, true),
  ('m6',  'Tandoori Roti',          18, true,  'Tandoor Se',      false, true),
  ('m7',  'Missi Roti',             30, true,  'Tandoor Se',      false, true),
  ('m8',  'Tandoori Chicken (Half)',260, false, 'Tandoor Se',      false, true),
  ('m9',  'Crispy Baby Corn Chilli',180, true,  'Chinese Special', true,  true),
  ('m10', 'Crispy Chilli Mushroom', 200, true,  'Chinese Special', false, true),
  ('m11', 'Veg Hakka Noodles',      160, true,  'Chinese Special', false, true),
  ('m12', 'Chilli Paneer',          190, true,  'Chinese Special', false, true),
  ('m13', 'Veg Fried Rice',         150, true,  'Chinese Special', false, true),
  ('m14', 'Schezwan Noodles',       170, true,  'Chinese Special', false, true),
  ('m15', 'Chicken Manchurian',     220, false, 'Chinese Special', false, true),
  ('m16', 'Chilli Chicken',         240, false, 'Chinese Special', false, true)
on conflict (id) do nothing;

insert into public.qrdine_tables (id, name, pin, type, status) values
  ('t1',  'Table 1',     '936', 'table', 'Available'),
  ('t2',  'Table 2',     '937', 'table', 'Available'),
  ('t3',  'Table 3',     '938', 'table', 'Available'),
  ('t4',  'Table 4',     '939', 'table', 'Available'),
  ('t5',  'Table 5',     '940', 'table', 'Available'),
  ('t6',  'Table 6',     '941', 'table', 'Available'),
  ('t7',  'Table 7',     '942', 'table', 'Available'),
  ('t8',  'Table 8',     '943', 'table', 'Available'),
  ('t9',  'Table 9',     '944', 'table', 'Available'),
  ('t10', 'Table 10',    '945', 'table', 'Available'),
  ('t11', 'Lounge Room', '950', 'room',  'Available')
on conflict (id) do nothing;

-- No seed orders: the restaurant starts with a clean order book.

select 'QR Dine schema ready' as result;
