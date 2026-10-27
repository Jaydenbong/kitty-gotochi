"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OrderStatusWatcher({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "pending_payment") return; // only watch while unpaid

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (!res.ok) return; // 404/500: don't treat a missing status as a change
        const data = await res.json();
        if (data.status !== status) router.refresh(); // re-render the server page
      } catch {
        // network blip: try again next tick
      }
    }, 5000);

    return () => clearInterval(timer); // stop when leaving the page
  }, [orderId, status, router]);

  return null; // renders nothing, it just watches
}