import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sql } from "@/lib/db";

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [admin] = await sql`select 1 from admins where user_id = ${user.id}`;
  return admin ? user : null;
}