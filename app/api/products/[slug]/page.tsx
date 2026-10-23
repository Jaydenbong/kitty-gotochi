import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export default function ProductPage({ params }: Props) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const soldOut = product.stock === 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-muted">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          : <span className="text-5xl">{product.prefecture_ja}</span>}
      </div>

      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All prefectures
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          {product.region} · {product.prefecture} {product.prefecture_ja}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
        <p className="mt-4 text-2xl">{formatPrice(product.price_cents)}</p>

        {product.description && <p className="mt-4">{product.description}</p>}

        {product.handmade_additions && (
          <div className="mt-6 rounded-xl border p-4">
            <p className="text-sm font-medium">Handmade additions</p>
            <p className="text-sm text-muted-foreground">{product.handmade_additions}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button size="lg" disabled={soldOut}>
            {soldOut ? "Sold out" : "Add to cart"}
          </Button>
          {!soldOut && <Badge variant="secondary">{product.stock} left</Badge>}
        </div>
      </div>
    </div>
  );
}