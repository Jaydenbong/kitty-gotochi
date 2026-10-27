import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getOrder } from "@/lib/queries";
import { buildPayNowPayload, getPayNowConfig } from "@/lib/paynow";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABEL = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Shipped",
  cancelled: "Cancelled",
} as const;

export default function OrderPage({ params }: Props) {
  return (
    <Suspense fallback={<p>Loading order…</p>}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  let qr: string | null = null;
  if (order.status === "pending_payment") {
    const payload = buildPayNowPayload({
      ...getPayNowConfig(),
      amountCents: order.total_cents,
      reference: order.payment_ref,
    });
    qr = await QRCode.toDataURL(payload, { width: 320, margin: 1 });
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Thanks, {order.customer_name}!</h1>
        <Badge variant={order.status === "pending_payment" ? "secondary" : "default"}>
          {STATUS_LABEL[order.status]}
        </Badge>
      </div>

      {qr && (
        <div className="mt-6 rounded-2xl border p-6 text-center">
          <p className="font-semibold">Pay {formatPrice(order.total_cents)} with PayNow</p>
          <img src={qr} alt="PayNow QR code" className="mx-auto my-4 size-64" />
          <p className="text-sm text-muted-foreground">
            Scan with your banking app. The amount and reference{" "}
            <span className="font-mono font-medium text-foreground">{order.payment_ref}</span> fill in
            automatically.
          </p>
          <a
            href={qr}
            download={`paynow-${order.payment_ref}.png`}
            className="mt-4 inline-block text-sm underline"
          >
            On your phone? Save the QR image
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            Then open your banking app's PayNow scanner and choose the image from your gallery.
          </p>
        </div>
      )}

      {order.status === "paid" && (
        <p className="mt-6 rounded-xl border p-4">Payment received. We're preparing your order!</p>
      )}
      {order.status === "fulfilled" && (
        <p className="mt-6 rounded-xl border p-4">Your order is on its way.</p>
      )}

      <div className="mt-6 rounded-xl border p-4">
        <h2 className="mb-3 font-semibold">Your order</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.product_name} className="flex justify-between gap-2">
              <span>{item.product_name} × {item.quantity}</span>
              <span>{formatPrice(item.unit_price_cents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total_cents)}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Bookmark this page to check your order status.{" "}
        <Link href="/" className="underline">Continue shopping</Link>
      </p>
    </div>
  );
}