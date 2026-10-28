"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";

type Status = "pending_payment" | "paid" | "fulfilled" | "cancelled";

type AdminOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  address: string;
  total_cents: number;
  payment_ref: string;
  status: Status;
  created_at: string;
  items: { name: string; quantity: number }[];
};

const STATUS_LABEL: Record<Status, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Shipped",
  cancelled: "Cancelled",
};

const TABS: { value: Status | "all"; label: string }[] = [
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "fulfilled", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Status | "all">("pending_payment");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders?status=${tab}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders);
    } catch {
      setError("Couldn't load orders. Try again.");
    } finally {
      setLoading(false);
    }
  }, [tab, router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function updateStatus(order: AdminOrder, status: Status) {
    if (status === "cancelled" && !confirm(`Cancel order #${order.order_number}? Its stock will be returned.`)) {
      return;
    }
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Update failed");
        return;
      }
      await loadOrders();
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
  }

  const query = search.trim().toLowerCase();
  const visible = query
    ? orders.filter((o) =>
        `${o.payment_ref} ${o.customer_name} ${o.order_number}`.toLowerCase().includes(query)
      )
    : orders;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button variant="outline" onClick={logout}>Log out</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.value} variant={tab === t.value ? "default" : "outline"} size="sm" onClick={() => setTab(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by payment reference, name or order number"
        className="mb-6 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      {loading && <p>Loading orders…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && visible.length === 0 && <p className="text-muted-foreground">No orders here.</p>}

      <ul className="space-y-4">
        {visible.map((o) => (
          <li key={o.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">#{o.order_number}</span>
                <Badge variant={o.status === "pending_payment" ? "secondary" : "default"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleString("en-SG")}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Name:</span> {o.customer_name}</p>
              <p><span className="text-muted-foreground">Phone:</span> {o.customer_phone ?? "-"}</p>
              <p><span className="text-muted-foreground">Email:</span> {o.customer_email}</p>
              <p><span className="text-muted-foreground">Reference:</span> <span className="font-mono">{o.payment_ref}</span></p>
              <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {o.address}</p>
            </div>

            <ul className="mt-3 text-sm">
              {o.items.map((item, i) => (
                <li key={i}>{item.name} × {item.quantity}</li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold">{formatPrice(o.total_cents)}</span>
              <div className="flex gap-2">
                {o.status === "pending_payment" && (
                  <Button size="sm" disabled={busyId === o.id} onClick={() => updateStatus(o, "paid")}>
                    Mark as paid
                  </Button>
                )}
                {o.status === "paid" && (
                  <Button size="sm" disabled={busyId === o.id} onClick={() => updateStatus(o, "fulfilled")}>
                    Mark as shipped
                  </Button>
                )}
                {(o.status === "pending_payment" || o.status === "paid") && (
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => updateStatus(o, "cancelled")}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}