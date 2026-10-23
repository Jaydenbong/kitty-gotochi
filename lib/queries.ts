import { sql } from "./db";

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
  prefecture_slug: string;
  region: string;
};

export type Prefecture = {
  id: number;
  name_en: string;
  name_ja: string;
  slug: string;
  region: string;
  product_count: number;
};

export async function getProducts(prefectureSlug?: string | null) {
  return sql<Product[]>`
    select p.id, p.name, p.slug, p.description, p.handmade_additions,
           p.price_cents, p.image_url, p.stock,
           pr.name_en as prefecture, pr.slug as prefecture_slug, pr.region
    from products p
    join prefectures pr on pr.id = p.prefecture_id
    where p.is_active
    ${prefectureSlug ? sql`and pr.slug = ${prefectureSlug}` : sql``}
    order by pr.id
  `;
}

export async function getPrefectures() {
  return sql<Prefecture[]>`
    select pr.id, pr.name_en, pr.name_ja, pr.slug, pr.region,
           count(p.id)::int as product_count
    from prefectures pr
    left join products p on p.prefecture_id = pr.id and p.is_active
    group by pr.id
    order by pr.id
  `;
}