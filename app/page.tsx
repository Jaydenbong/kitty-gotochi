import { Suspense } from "react";
import Link from "next/link";
import { getPrefectures, type Prefecture } from "@/lib/queries";
import { formatPrice } from "@/lib/format";

export default function HomePage() {
  return (
    <>
      <section className="mb-10 text-center">
        <h1 className="text-3xl font-bold">Gotochi Kitty from across Japan</h1>
        <p className="mt-2 text-muted-foreground">
          Official regional Kitty keychains, finished with handmade charms.
        </p>
      </section>
      <Suspense fallback={<p className="text-center">Loading prefectures…</p>}>
        <PrefectureGrid />
      </Suspense>
    </>
  );
}

async function PrefectureGrid() {
  const prefectures = await getPrefectures();

  // Group by region, keeping the north-to-south order from the database
  const regions: Record<string, Prefecture[]> = {};
  for (const p of prefectures) (regions[p.region] ??= []).push(p);

  return (
    <>
      {Object.entries(regions).map(([region, list]) => (
        <section key={region} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{region}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {list.map((p) => <PrefectureCard key={p.id} prefecture={p} />)}
          </div>
        </section>
      ))}
    </>
  );
}

function PrefectureCard({ prefecture: p }: { prefecture: Prefecture }) {
  const hasKitty = p.product_slug !== null;

  const card = (
    <div className={`rounded-xl border p-3 transition ${hasKitty ? "hover:shadow-md" : "opacity-40"}`}>
      <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
        {p.image_url
          ? <img src={p.image_url} alt={p.name_en} className="h-full w-full object-cover" />
          : <span className="text-2xl">{p.name_ja}</span>}
      </div>
      <p className="font-medium">{p.name_en}</p>
      <p className="text-sm text-muted-foreground">
        {!hasKitty ? "Coming soon" : p.stock === 0 ? "Sold out" : formatPrice(p.price_cents!)}
      </p>
    </div>
  );

  return hasKitty ? <Link href={`/products/${p.product_slug}`}>{card}</Link> : card;
}