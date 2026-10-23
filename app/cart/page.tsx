"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, hydrated, totalCents, updateQuantity, removeItem } = useCart();

  if (!hydrated) return <p>Loading cart…</p>;

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className="mt-4 inline-block underline">
          Browse prefectures
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your cart</h1>

      <ul className="divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.productId} className="flex flex-wrap items-center gap-4 p-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="min-w-32 flex-1">
              <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
                {item.name}
              </Link>
              <p className="text-sm text-muted-foreground">{formatPrice(item.priceCents)} each</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Decrease quantity"
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              >
                <Minus />
              </Button>
              <span className="w-6 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Increase quantity"
                disabled={item.quantity >= item.stock}
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              >
                <Plus />
              </Button>
            </div>

            <p className="w-20 text-right font-medium">
              {formatPrice(item.priceCents * item.quantity)}
            </p>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove item"
              onClick={() => removeItem(item.productId)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg">
          Total: <span className="font-bold">{formatPrice(totalCents)}</span>
        </p>
        <Link
          href="/checkout"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}