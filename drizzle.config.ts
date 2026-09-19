import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DRIZZLE_DATABASE_URL is the session/direct URL used by `npm run db:migrate`.
    // dotenv must not clobber it back to the transaction pooler.
    url: process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
