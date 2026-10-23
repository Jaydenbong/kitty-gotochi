"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/components/cart-provider";

type Props = { product: Omit<CartItem, "quantity"> };

export function AddToCartButton({ product }: Props) {
  const { items, addItem, hydrated } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const inCart = items.find((i) => i.productId === product.productId)?.quantity ?? 0;
  const soldOut = product.stock === 0;
  const atLimit = inCart >= product.stock;

  function handleClick() {
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <Button size="lg" onClick={handleClick} disabled={!hydrated || soldOut || atLimit}>
      {soldOut ? "Sold out" : atLimit ? "Max in cart" : justAdded ? "Added ✓" : "Add to cart"}
    </Button>
  );
}