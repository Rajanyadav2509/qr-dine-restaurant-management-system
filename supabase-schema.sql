-- ============================================================================
-- QR Dine — shared database schema for Supabase project "qr-dine-db"
-- (ref qpybzvfycamzosidytjj, region ap-south-1 Mumbai)
--
-- HOW TO RUN (Supabase dashboard):
--   1. Open the project → SQL Editor → New query
--   2. Paste this whole file and press Run
--   3. Confirm the "Schema created" notice, then check Table Editor shows
--      qrdine_tables, qrdine_menu, qrdine_orders, qrdine_settings,
--      qrdine_requests, qrdine_messages, qrdine_reviews,
--      qrdine_offers
--
-- SECURITY NOTE — DEMO-GRADE POLICIES:
--   The policies below let the anon (public) key read/write all eight tables.
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

-- Menu photos + attributes (added later; idempotent — safe to re-run).
alter table public.qrdine_menu add column if not exists image text;
alter table public.qrdine_menu add column if not exists spicy text check (spicy in ('None', 'Mild', 'Medium', 'Hot'));
alter table public.qrdine_menu add column if not exists tags text;

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

-- Order tracking timestamps (added later; idempotent — safe to re-run).
-- The app records preparing_at / served_at when the kitchen advances an
-- order, and still works if these columns do not exist yet (it keeps the
-- times locally and retries order writes without them).
alter table public.qrdine_orders add column if not exists preparing_at timestamptz;
alter table public.qrdine_orders add column if not exists served_at timestamptz;
alter table public.qrdine_orders add column if not exists offer_title text;

create table if not exists public.qrdine_settings (
  id               integer primary key,
  restaurant_name  text not null,
  address          text not null default '',
  upi_id           text not null,
  currency         text not null default '₹'
);

create table if not exists public.qrdine_requests (
  id         uuid primary key default gen_random_uuid(),
  table_id   text not null references public.qrdine_tables (id) on delete restrict,
  type       text not null check (type in ('Call Waiter', 'Water', 'Bill Please', 'Clean Table')),
  status     text not null default 'New' check (status in ('New', 'Done')),
  created_at timestamptz not null default now(),
  done_at    timestamptz
);

create table if not exists public.qrdine_messages (
  id           uuid primary key default gen_random_uuid(),
  order_number text not null,
  table_id     text not null,
  sender       text not null check (sender in ('owner', 'customer')),
  text         text not null,
  created_at   timestamptz not null default now()
);

-- Customer star ratings (1–5) left after an order. The app selects,
-- inserts and subscribes to this table; without it every page load 404s
-- on qrdine_reviews AND the whole Realtime channel stops delivering
-- order updates (the server rejects the channel's reviews subscription),
-- so live tracking never moves.
create table if not exists public.qrdine_reviews (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null,
  table_id      text not null,
  customer_name text,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now()
);

-- Owner offers (discounts shown on the customer menu). The app selects,
-- inserts/updates/deletes and subscribes to this table; without it offers
-- stay local-only per device (same fallback pattern as qrdine_requests).
create table if not exists public.qrdine_offers (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  type         text not null default 'percent' check (type in ('percent', 'flat')),
  value        numeric not null default 0 check (value >= 0),
  min_order    numeric not null default 0,
  max_discount numeric,
  starts_at    date,
  ends_at      date,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists qrdine_orders_table_id_idx   on public.qrdine_orders (table_id);
create index if not exists qrdine_orders_status_idx     on public.qrdine_orders (status);
create index if not exists qrdine_orders_created_at_idx on public.qrdine_orders (created_at desc);
create index if not exists qrdine_requests_table_id_idx   on public.qrdine_requests (table_id);
create index if not exists qrdine_requests_status_idx     on public.qrdine_requests (status);
create index if not exists qrdine_requests_created_at_idx on public.qrdine_requests (created_at);
create index if not exists qrdine_messages_order_idx    on public.qrdine_messages (order_number);
create index if not exists qrdine_messages_created_at_idx on public.qrdine_messages (created_at);
create index if not exists qrdine_reviews_order_idx    on public.qrdine_reviews (order_number);
create index if not exists qrdine_reviews_created_at_idx on public.qrdine_reviews (created_at);
create index if not exists qrdine_offers_active_idx    on public.qrdine_offers (active);
create index if not exists qrdine_offers_created_at_idx on public.qrdine_offers (created_at desc);

-- ---------------- Row Level Security (demo-grade open policies) ----------------

alter table public.qrdine_tables  enable row level security;
alter table public.qrdine_menu    enable row level security;
alter table public.qrdine_orders  enable row level security;
alter table public.qrdine_settings enable row level security;
alter table public.qrdine_requests enable row level security;
alter table public.qrdine_messages enable row level security;
alter table public.qrdine_reviews enable row level security;
alter table public.qrdine_offers enable row level security;

-- Drop first so re-running this file is safe.
drop policy if exists "demo: all access" on public.qrdine_tables;
drop policy if exists "demo: all access" on public.qrdine_menu;
drop policy if exists "demo: all access" on public.qrdine_orders;
drop policy if exists "demo: all access" on public.qrdine_settings;
drop policy if exists "demo: all access" on public.qrdine_requests;
drop policy if exists "demo: all access" on public.qrdine_messages;
drop policy if exists "demo: all access" on public.qrdine_reviews;
drop policy if exists "demo: all access" on public.qrdine_offers;

create policy "demo: all access" on public.qrdine_tables
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_menu
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_orders
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_settings
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_requests
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_messages
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_reviews
  for all to anon, authenticated using (true) with check (true);
create policy "demo: all access" on public.qrdine_offers
  for all to anon, authenticated using (true) with check (true);

-- ---------------- Table privileges (required!) ----------------
-- RLS policies alone do NOT grant access: the anon/authenticated roles also
-- need table-level privileges, or every request fails with 42501
-- "permission denied for table ..." and the app falls back to offline demo.
-- Re-running this file is safe (GRANT is idempotent).

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.qrdine_tables to anon, authenticated;
grant select, insert, update, delete on public.qrdine_menu to anon, authenticated;
grant select, insert, update, delete on public.qrdine_orders to anon, authenticated;
grant select, insert, update, delete on public.qrdine_settings to anon, authenticated;
grant select, insert, update, delete on public.qrdine_requests to anon, authenticated;
grant select, insert, update, delete on public.qrdine_messages to anon, authenticated;
grant select, insert, update, delete on public.qrdine_reviews to anon, authenticated;
grant select, insert, update, delete on public.qrdine_offers to anon, authenticated;

-- ---------------- Realtime ----------------
-- The dashboard subscribes to these tables so every device updates live.
-- Conditional: plain ADD fails on re-run ("already a member"), so check first.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_tables') then
    alter publication supabase_realtime add table public.qrdine_tables;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_orders') then
    alter publication supabase_realtime add table public.qrdine_orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_menu') then
    alter publication supabase_realtime add table public.qrdine_menu;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_settings') then
    alter publication supabase_realtime add table public.qrdine_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_requests') then
    alter publication supabase_realtime add table public.qrdine_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_messages') then
    alter publication supabase_realtime add table public.qrdine_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_reviews') then
    alter publication supabase_realtime add table public.qrdine_reviews;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qrdine_offers') then
    alter publication supabase_realtime add table public.qrdine_offers;
  end if;
end $$;

-- ---------------- seed data (same as the app's local demo data) ----------------

insert into public.qrdine_settings (id, restaurant_name, address, upi_id, currency)
values (1, 'Bhukhad Bachelors', 'Market, Royal Garden Park, Bokaro', 'yaduvanshirajan228@axl', '₹')
on conflict (id) do update set
  restaurant_name = excluded.restaurant_name,
  address = excluded.address,
  upi_id = excluded.upi_id,
  currency = excluded.currency;

insert into public.qrdine_menu (id, name, price, veg, category, special, available, image, spicy, tags) values
  ('m40', 'Veg Margherita Pizza', 199, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', 'Medium', 'Bestseller'),
  ('m41', 'Veggie Supreme Pizza', 249, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m42', 'Paneer Tikka Pizza', 269, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m43', 'Classic French Fries', 99, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m44', 'Peri Peri French Fries', 119, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m45', 'Cheesy French Fries', 139, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m46', 'Veg Burger', 99, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m47', 'Paneer Burger', 129, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m48', 'Veg Grilled Sandwich', 89, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m49', 'Paneer Grilled Sandwich', 119, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m50', 'Veg Momos (8 pc)', 120, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80', 'Mild', 'Bestseller'),
  ('m51', 'White Sauce Pasta', 169, true, 'Fast Food', false, true, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m17', 'Veg Manchurian', 150, true, 'Starters', false, true, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80', 'Medium', 'Bestseller'),
  ('m18', 'Paneer Tikka', 210, true, 'Starters', false, true, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80', 'Medium', 'Chef''s Special'),
  ('m20', 'Veg Samosa (2 pc)', 60, true, 'Starters', false, true, 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m1', 'Roti', 15, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m2', 'Butter Roti', 20, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m3', 'Plain Naan', 25, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m4', 'Butter Naan', 35, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=800&q=80', 'None', 'Bestseller'),
  ('m5', 'Garlic Naan', 40, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m6', 'Tandoori Roti', 18, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m7', 'Missi Roti', 30, true, 'Tandoor Se', false, true, 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m9', 'Crispy Baby Corn Chilli', 180, true, 'Chinese Special', true, true, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 'Hot', 'Bestseller'),
  ('m10', 'Crispy Chilli Mushroom', 200, true, 'Chinese Special', false, true, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80', 'Hot', ''),
  ('m11', 'Veg Hakka Noodles', 160, true, 'Chinese Special', false, true, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m12', 'Chilli Paneer', 190, true, 'Chinese Special', false, true, 'https://images.unsplash.com/photo-1618449840665-9ed506d73a34?auto=format&fit=crop&w=800&q=80', 'Hot', 'Bestseller'),
  ('m13', 'Veg Fried Rice', 150, true, 'Chinese Special', false, true, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m14', 'Schezwan Noodles', 170, true, 'Chinese Special', false, true, 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', 'Hot', ''),
  ('m22', 'Paneer Butter Masala', 220, true, 'Main Course', false, true, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', 'Medium', 'Bestseller'),
  ('m23', 'Dal Makhani', 180, true, 'Main Course', false, true, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m25', 'Veg Kolhapuri', 200, true, 'Main Course', false, true, 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80', 'Hot', ''),
  ('m52', 'Punjabi Thali Regular', 229, true, 'Thalis', false, true, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m53', 'Punjabi Thali Deluxe', 299, true, 'Thalis', false, true, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', 'Medium', 'Bestseller'),
  ('m54', 'Punjabi Family Thali', 549, true, 'Thalis', false, true, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m55', 'Gujarati Thali Regular', 199, true, 'Thalis', false, true, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m56', 'Gujarati Thali Deluxe', 269, true, 'Thalis', false, true, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', 'Mild', ''),
  ('m27', 'Veg Biryani', 180, true, 'Rice & Biryani', false, true, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', 'Medium', ''),
  ('m29', 'Jeera Rice', 140, true, 'Rice & Biryani', false, true, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m31', 'Gulab Jamun (2 pc)', 60, true, 'Desserts', false, true, 'https://images.unsplash.com/photo-1589119908995-c6837fa14848?auto=format&fit=crop&w=800&q=80', 'None', 'Bestseller'),
  ('m32', 'Rasmalai', 90, true, 'Desserts', false, true, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m33', 'Chocolate Brownie with Ice Cream', 140, true, 'Desserts', false, true, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m34', 'Vanilla Ice Cream', 70, true, 'Ice Cream', false, true, 'https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m59', 'Chocolate Ice Cream', 80, true, 'Ice Cream', false, true, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m60', 'Butterscotch Ice Cream', 90, true, 'Ice Cream', false, true, 'https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m61', 'Mango Ice Cream', 90, true, 'Ice Cream', false, true, 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m62', 'Kulfi', 70, true, 'Ice Cream', false, true, 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80', 'None', 'Bestseller'),
  ('m35', 'Masala Chai', 30, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m36', 'Sweet Lassi', 60, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80', 'None', 'Bestseller'),
  ('m37', 'Mango Lassi', 80, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m38', 'Cold Coffee', 90, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m39', 'Fresh Lime Soda', 50, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m57', 'Plain Chaach', 30, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m58', 'Masala Chaach', 40, true, 'Drinks & Beverages', false, true, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m63', 'Coca-Cola', 40, true, 'Cold Drink', false, true, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m64', 'Sprite', 40, true, 'Cold Drink', false, true, 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m65', 'Fanta', 40, true, 'Cold Drink', false, true, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m66', 'Pepsi', 40, true, 'Cold Drink', false, true, 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m67', 'Soda', 30, true, 'Cold Drink', false, true, 'https://images.unsplash.com/photo-1622480916113-9000ac49b79d?auto=format&fit=crop&w=800&q=80', 'None', ''),
  ('m68', 'Mineral Water', 25, true, 'Cold Drink', false, true, 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?auto=format&fit=crop&w=800&q=80', 'None', '')
on conflict (id) do update set
  image = excluded.image,
  spicy = excluded.spicy,
  tags  = excluded.tags;

-- Veg-only menu (Nov 2026): the non-veg dishes are gone from the seed above,
-- so remove them from the live database too. Idempotent — safe to re-run.
-- The live "Panner" dish is veg and is deliberately NOT touched here.
delete from public.qrdine_menu
where id in ('m8', 'm15', 'm16', 'm19', 'm21', 'm24', 'm26', 'm28', 'm30')
   or name in ('Tandoori Chicken (Half)', 'Chicken Manchurian', 'Chilli Chicken',
               'Chicken 65', 'Chicken Momos (8 pc)', 'Butter Chicken', 'Chicken Curry',
               'Chicken Biryani', 'Mutton Biryani');

-- Vanilla Ice Cream moved from Desserts to the new Ice Cream category.
update public.qrdine_menu set category = 'Ice Cream' where id = 'm34';

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
