import { sql } from "@/lib/db";
import { getAdminUser } from "@/lib/admin-auth";

const STATUSES = ["pending_payment", "paid", "fulfilled", "cancelled"];

export async function GET(request: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const filter = status && STATUSES.includes(status) ? status : null;

  try {
    const orders = await sql`
      select o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.address,
             o.total_cents, o.payment_ref, o.status, o.created_at,
             coalesce(
               json_agg(json_build_object('name', oi.product_name, 'quantity', oi.quantity))
                 filter (where oi.id is not null),
               '[]'
             ) as items
      from orders o
      left join order_items oi on oi.order_id = o.id
      ${filter ? sql`where o.status = ${filter}` : sql``}
      group by o.id
      order by o.created_at desc
      limit 200
    `;
    return Response.json({ orders });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to load orders" }, { status: 500 });
  }
}