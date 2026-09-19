import { config } from "dotenv";
import dns from "node:dns";
import { resolve6 } from "node:dns/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Options, type Sql } from "postgres";

dns.setDefaultResultOrder("ipv6first");

config({ path: ".env" });
config({ path: ".env.local", override: true });

type Candidate = { summary: string; options: Options<{}> };

function isLocal(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function baseOptions(url: URL, sslServername?: string): Options<{}> {
  const hostname = url.hostname;
  const ssl = isLocal(hostname)
    ? false
    : sslServername
      ? { rejectUnauthorized: true, servername: sslServername }
      : "require";
  return {
    host: hostname,
    port: Number(url.port || "5432"),
    database: decodeURIComponent(url.pathname.replace(/^\//, "") || "postgres"),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl,
    prepare: false,
    max: 1,
    connect_timeout: 45,
  };
}

async function candidates(raw: string): Promise<Candidate[]> {
  const parsed = new URL(raw);
  const out: Candidate[] = [];
  const poolerUser = /^postgres\.([a-z0-9]+)$/i.exec(
    decodeURIComponent(parsed.username),
  );

  if (poolerUser) {
    const directHost = `db.${poolerUser[1]}.supabase.co`;
    const direct = new URL(parsed);
    direct.username = "postgres";
    direct.hostname = directHost;
    direct.port = "5432";
    try {
      const ipv6 = await resolve6(directHost);
      if (ipv6[0]) {
        out.push({
          summary: `${directHost}:5432 direct (ipv6)`,
          options: {
            ...baseOptions(direct, directHost),
            // Bracket the literal so postgres.js does not split IPv6 on ":".
            host: `[${ipv6[0]}]`,
            port: 5432,
          },
        });
      }
    } catch {
      // Fall through to hostname lookup.
    }
    out.push({
      summary: `${directHost}:5432 direct`,
      options: baseOptions(direct),
    });
  }

  if (parsed.port === "6543") {
    const session = new URL(parsed);
    session.port = "5432";
    out.push({
      summary: `${session.hostname}:5432 session pooler`,
      options: baseOptions(session),
    });
    if (session.hostname.startsWith("aws-0-")) {
      const alt = new URL(session);
      alt.hostname = session.hostname.replace("aws-0-", "aws-1-");
      out.push({
        summary: `${alt.hostname}:5432 session pooler (aws-1)`,
        options: baseOptions(alt),
      });
    }
  }

  out.push({
    summary: `${parsed.hostname}:${parsed.port || "5432"} as configured`,
    options: baseOptions(parsed),
  });
  if (parsed.hostname.startsWith("aws-0-")) {
    const alt = new URL(parsed);
    alt.hostname = parsed.hostname.replace("aws-0-", "aws-1-");
    out.push({
      summary: `${alt.hostname}:${alt.port || "5432"} pooler (aws-1)`,
      options: baseOptions(alt),
    });
  }
  return out;
}

async function probe(options: Options<{}>) {
  const client = postgres(options);
  try {
    await client`select 1 as ok`;
    return { ok: true as const, client };
  } catch (error) {
    await client.end({ timeout: 5 }).catch(() => undefined);
    const err = error as { message?: string; code?: string };
    return {
      ok: false as const,
      message: (err.message ?? "unknown").slice(0, 200),
      code: err.code,
    };
  }
}

async function main() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const options = await candidates(raw);
  let client: Sql | null = null;
  let summary = "";

  for (const option of options) {
    process.stdout.write(`probe ${option.summary} ... `);
    const result = await probe(option.options);
    if (result.ok) {
      console.log("ok");
      client = result.client;
      summary = option.summary;
      break;
    }
    console.log(`fail (${result.code ?? "err"}) ${result.message}`);
  }

  const poolers = options.filter((option) => /pooler|configured/.test(option.summary));
  for (let attempt = 1; !client && attempt <= 4; attempt += 1) {
    console.log(`restore lag: wait 20s then retry pooler (${attempt}/4)`);
    await new Promise((resolve) => setTimeout(resolve, 20_000));
    for (const option of poolers) {
      process.stdout.write(`probe ${option.summary} ... `);
      const result = await probe(option.options);
      if (result.ok) {
        console.log("ok");
        client = result.client;
        summary = option.summary;
        break;
      }
      console.log(`fail (${result.code ?? "err"}) ${result.message}`);
    }
  }

  if (!client) {
    console.error(
      "No usable migration connection. Wait a minute after restore, or paste the Dashboard Session/Direct URI into DATABASE_URL.",
    );
    process.exit(1);
  }

  console.log(`db:migrate via ${summary}`);
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("db:migrate complete");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  const err = error as {
    message?: string;
    cause?: { message?: string; code?: string };
  };
  console.error(err.message ?? error);
  if (err.cause?.message) {
    console.error("cause:", err.cause.message, err.cause.code ?? "");
  }
  process.exit(1);
});
