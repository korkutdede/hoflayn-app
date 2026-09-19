import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle client backed by postgres.js.
 *
 * Use the Supabase connection string in DATABASE_URL. Prefer the transaction
 * pooler (port 6543) in serverless environments; `prepare: false` is required
 * for the transaction pooler. The connection is created lazily on first query,
 * so importing this module at build time is safe even without env vars.
 */

const connectionString = process.env.DATABASE_URL ?? "";

const globalForDb = globalThis as unknown as {
  __hoflaynPg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__hoflaynPg ??
  postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__hoflaynPg = client;
}

export const db = drizzle(client, { schema });

export { schema };
