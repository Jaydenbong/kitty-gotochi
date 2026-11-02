import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getOrder } from "@/lib/queries";
import { buildPayNowPayload, getPayNowConfig } from "@/lib/paynow";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { OrderStatusWatcher } from "@/components/order-status-watcher";

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
  let qrFailed = false;
  if (order.status === "pending_payment") {
    // A payment setup problem shouldn't stop customers seeing their order
    try {
      const payload = buildPayNowPayload({
        ...getPayNowConfig(),
        amountCents: order.total_cents,
        reference: order.payment_ref,
      });
      qr = await QRCode.toDataURL(payload, { width: 320, margin: 1 });
    } catch (err) {
      console.error(err);
      qrFailed = true;
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <OrderStatusWatcher orderId={order.id} status={order.status} />
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
            Then open your banking app&apos;s PayNow scanner and choose the image from your gallery.
          </p>
        </div>
      )}

      {qrFailed && (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          We couldn&apos;t load the payment QR code. Your order is saved, so please refresh this page in a
          little while. Your payment reference is{" "}
          <span className="font-mono font-medium">{order.payment_ref}</span>.
        </p>
      )}

      {order.status === "paid" && (
        <p className="mt-6 rounded-xl border p-4">Payment received. We&apos;re preparing your order!</p>
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