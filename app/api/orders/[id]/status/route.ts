import { sql } from "@/lib/db";
import { isUuid } from "@/lib/checkout";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const [order] = await sql<{ status: string }[]>`select status from orders where id = ${id}`;
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ status: order.status });
}