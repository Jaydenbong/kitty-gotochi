import { sql } from "./db";
import { isUuid } from "./checkout";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  handmade_additions: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
  prefecture: string;
  prefecture_ja: string;
  prefecture_slug: string;
  region: string;
};

export type Prefecture = {
  id: number;
  name_en: string;
  name_ja: string;
  slug: string;
  region: string;
  product_slug: string | null; // null = no Kitty for this prefecture yet
  image_url: string | null;
  price_cents: number | null;
  stock: number | null;
};

const productColumns = sql`
  p.id, p.name, p.slug, p.description, p.handmade_additions,
  p.price_cents, p.image_url, p.stock,
  pr.name_en as prefecture, pr.name_ja as prefecture_ja,
  pr.slug as prefecture_slug, pr.region
`;

export async function getProducts(prefectureSlug?: string | null) {
  return sql<Product[]>`
    select ${productColumns}
    from products p
    join prefectures pr on pr.id = p.prefecture_id
    where p.is_active
    ${prefectureSlug ? sql`and pr.slug = ${prefectureSlug}` : sql``}
    order by pr.id
  `;
}

export async function getProductBySlug(slug: string) {
  const rows = await sql<Product[]>`
    select ${productColumns}
    from products p
    join prefectures pr on pr.id = p.prefecture_id
    where p.slug = ${slug} and p.is_active
  `;
  return rows[0] ?? null;
}

export async function getPrefectures() {
  return sql<Prefecture[]>`
    select pr.id, pr.name_en, pr.name_ja, pr.slug, pr.region,
           p.slug as product_slug, p.image_url, p.price_cents, p.stock
    from prefectures pr
    left join products p on p.prefecture_id = pr.id and p.is_active
    order by pr.id
  `;
}

export type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  total_cents: number;
  payment_ref: string;
  status: "pending_payment" | "paid" | "fulfilled" | "cancelled";
  created_at: Date;
};

export type OrderItem = {
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export async function getOrder(id: string) {
  if (!isUuid(id)) return null;

  const [order] = await sql<Order[]>`
    select id, order_number, customer_name, total_cents, payment_ref, status, created_at
    from orders
    where id = ${id}
  `;
  if (!order) return null;

  const items = await sql<OrderItem[]>`
    select product_name, unit_price_cents, quantity
    from order_items
    where order_id = ${id}
    order by product_name
  `;

  return { ...order, items };
}