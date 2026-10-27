"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { validateCheckout, type CheckoutForm, type CheckoutErrors } from "@/lib/checkout";

const inputClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, hydrated, totalCents, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutForm>({ name: "", email: "", phone: "", address: "" });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateCheckout(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong");
        if (data.fields) setErrors(data.fields);
        return;
      }

      router.push(`/orders/${data.orderId}`);
      clearCart();
    } catch {
      setServerError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return <p>Loading…</p>;

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
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <h1 className="text-2xl font-bold">Delivery details</h1>

        <Field label="Full name" error={errors.name}>
          <input name="name" value={form.name} onChange={handleChange} autoComplete="name" className={inputClass} />
        </Field>

        <Field label="Email" error={errors.email}>
          <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" className={inputClass} />
        </Field>

        <Field label="Phone" error={errors.phone}>
          <input name="phone" type="tel" inputMode="numeric" value={form.phone} onChange={handleChange} autoComplete="tel" className={inputClass} />
        </Field>

        <Field label="Delivery address" error={errors.address}>
          <textarea name="address" rows={3} value={form.address} onChange={handleChange} autoComplete="street-address" className={inputClass} />
        </Field>

        {serverError && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Placing order…" : `Place order · ${formatPrice(totalCents)}`}
        </Button>
      </form>

      <aside className="h-fit rounded-xl border p-4">
        <h2 className="mb-3 font-semibold">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-2">
              <span>{item.name} × {item.quantity}</span>
              <span>{formatPrice(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span>{formatPrice(totalCents)}</span>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-red-600">{error}</span>}
    </label>
  );
}