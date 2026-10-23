import "server-only";
import postgres from "postgres";

// Reuse one connection pool during dev hot-reloads instead of opening new ones
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.sql ?? postgres(process.env.DATABASE_URL!, { prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

