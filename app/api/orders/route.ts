import { randomBytes } from "crypto";
import { sql } from "@/lib/db";
import { isUuid, validateCheckout, type CheckoutForm } from "@/lib/checkout";

// Errors we expect (sold out, etc.) and want to show to the customer
class OrderError extends Error {}

function makePaymentRef() {
  return "KC" + randomBytes(4).toString("hex").toUpperCase(); // e.g. KC9F3A1B2C
}

type Body = {
  customer?: Partial<CheckoutForm>;
  items?: { productId?: unknown; quantity?: unknown }[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // 1. Validate customer details with the same rules as the checkout form
  const form: CheckoutForm = {
    name: String(body.customer?.name ?? "").trim(),
    email: String(body.customer?.email ?? "").trim(),
    phone: String(body.customer?.phone ?? "").replace(/\s/g, ""),
    address: String(body.customer?.address ?? "").trim(),
  };
  const fieldErrors = validateCheckout(form);
  if (Object.keys(fieldErrors).length > 0) {
    return Response.json({ error: "Please check your details", fields: fieldErrors }, { status: 400 });
  }

  // 2. Validate the cart and merge any duplicate products
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return Response.json({ error: "Your cart is empty" }, { status: 400 });
  }
  const quantities = new Map<string, number>();
  for (const item of items) {
    const qty = item.quantity;
    if (!isUuid(item.productId) || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return Response.json({ error: "Invalid cart" }, { status: 400 });
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + qty);
  }

  // 3. Everything below happens in ONE transaction: all of it succeeds, or none of it does
  try {
    const order = await sql.begin(async (tx) => {
      const ids = [...quantities.keys()];

      // Real prices and stock from the database. "for update" locks these rows
      // so two customers can't buy the last keychain at the same moment.
      const products = await tx<{ id: string; name: string; price_cents: number; stock: number }[]>`
        select id, name, price_cents, stock
        from products
        where id in ${tx(ids)} and is_active
        for update
      `;

      let totalCents = 0;
      for (const [id, qty] of quantities) {
        const product = products.find((p) => p.id === id);
        if (!product) throw new OrderError("An item in your cart is no longer available");
        if (qty > product.stock) {
          throw new OrderError(
            product.stock === 0 ? `${product.name} is sold out` : `Only ${product.stock} × ${product.name} left`
          );
        }
        totalCents += product.price_cents * qty;
      }

      const [created] = await tx<{ id: string }[]>`
        insert into orders (customer_name, customer_email, customer_phone, address, total_cents, payment_ref)
        values (${form.name}, ${form.email}, ${form.phone}, ${form.address}, ${totalCents}, ${makePaymentRef()})
        returning id
      `;

      for (const [id, qty] of quantities) {
        const product = products.find((p) => p.id === id)!;
        await tx`
          insert into order_items (order_id, product_id, product_name, unit_price_cents, quantity)
          values (${created.id}, ${id}, ${product.name}, ${product.price_cents}, ${qty})
        `;
        await tx`update products set stock = stock - ${qty} where id = ${id}`;
      }

      return created;
    });

    return Response.json({ orderId: order.id }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}