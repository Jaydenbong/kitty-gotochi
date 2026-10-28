import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { OrdersDashboard } from "./orders-dashboard";

export default function AdminPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AdminGate />
    </Suspense>
  );
}

// Check the session on the server so logged-out visitors never see the dashboard
async function AdminGate() {
  // Supabase checks token expiry with Date.now(), so this must run per request, never prerendered
  await connection();
  if (!(await getAdminUser())) {
    redirect("/admin/login");
  }
  return <OrdersDashboard />;
}
