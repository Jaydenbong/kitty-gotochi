import { sql } from "@/lib/db";
import { getAdminUser } from "@/lib/admin-auth";
import { isUuid } from "@/lib/checkout";

// The only allowed status changes: a simple state machine
const TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

class TransitionError extends Error {}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Order not found" }, { status: 404 });

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const nextStatus = body.status;
  if (typeof nextStatus !== "string") {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const updated = await sql.begin(async (tx) => {
      // Lock the order so two clicks can't change it at the same time
      const [order] = await tx<{ status: string }[]>`
        select status from orders where id = ${id} for update
      `;
      if (!order) throw new TransitionError("Order not found");
      if (!TRANSITIONS[order.status]?.includes(nextStatus)) {
        throw new TransitionError(`Can't change an order from "${order.status}" to "${nextStatus}"`);
      }

      // Cancelling puts the keychains back in stock
      if (nextStatus === "cancelled") {
        await tx`
          update products p
          set stock = p.stock + oi.quantity
          from order_items oi
          where oi.order_id = ${id} and oi.product_id = p.id
        `;
      }

      const [row] = await tx`
        update orders
        set status = ${nextStatus},
            paid_at = case when ${nextStatus} = 'paid' then now() else paid_at end
        where id = ${id}
        returning id, status
      `;
      return row;
    });

    return Response.json({ order: updated });
  } catch (err) {
    if (err instanceof TransitionError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}