"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

type Form = { name: string; email: string; phone: string; address: string };
type Errors = Partial<Record<keyof Form, string>>;

const inputClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "Please enter your name";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Please enter a valid email";
  if (!/^[689]\d{7}$/.test(form.phone.replace(/\s/g, "")))
    errors.phone = "Please enter an 8-digit Singapore number";
  if (form.address.trim().length < 10) errors.address = "Please enter your full delivery address";
  return errors;
}

export default function CheckoutPage() {
  const { items, hydrated, totalCents } = useCart();
  const [form, setForm] = useState<Form>({ name: "", email: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Errors>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Day 4: send the order to POST /api/orders
    alert("Form looks good! Placing the order comes on Day 4.");
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

        <Button type="submit" size="lg" className="w-full">
          Continue to payment
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