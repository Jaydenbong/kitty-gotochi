-- Database schema. Run this in the Supabase SQL editor, then run seed.sql.

create table prefectures (
  id smallint primary key check (id between 1 and 47),
  name_en text not null unique,
  name_ja text not null unique,
  slug text not null unique,
  region text not null
);

create table products (
  id uuid primary key default gen_random_uuid(),
  prefecture_id smallint not null unique references prefectures (id),
  name text not null,
  slug text not null unique,
  description text,
  handmade_additions text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence orders_order_number_seq start with 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer not null unique default nextval('orders_order_number_seq'),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  address text not null,
  total_cents integer not null check (total_cents >= 0),
  payment_ref text not null unique,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'fulfilled', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter sequence orders_order_number_seq owned by orders.order_number;

create index orders_status_idx on orders (status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on order_items (order_id);

create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- No policies are defined, so the public Supabase key can't read or change these
-- tables. The app reaches them only from the server, through DATABASE_URL.
alter table prefectures enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admins enable row level security;
