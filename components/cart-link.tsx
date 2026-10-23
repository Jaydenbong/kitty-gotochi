"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

export function CartLink() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link href="/cart" className="flex items-center gap-2 text-sm hover:underline">
      <ShoppingBag className="size-4" />
      Cart{hydrated && itemCount > 0 && ` (${itemCount})`}
    </Link>
  );
}