import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const live = process.argv.includes("--live");
const openAiKey = process.env.OPENAI_API_KEY;
const replicateToken = process.env.REPLICATE_API_TOKEN;
const rembgVersion =
  process.env.REPLICATE_REMBG_VERSION ??
  "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";

async function check(name: string, request: () => Promise<Response>) {
  const response = await request();
  if (!response.ok) {
    throw new Error(`${name} authentication failed (${response.status}).`);
  }
  console.log(`OK  ${name} credentials`);
}

async function main() {
  if (!openAiKey || !replicateToken) {
    console.error(
      "MISSING  OPENAI_API_KEY and REPLICATE_API_TOKEN are both required.",
    );
    process.exit(1);
  }
  console.log("OK  provider credentials are configured");
  if (!live) {
    console.log("SKIP  network checks (run with --live to authenticate)");
    return;
  }
  await check("OpenAI", () =>
    fetch(
      `https://api.openai.com/v1/models/${process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini"}`,
      {
        headers: { Authorization: `Bearer ${openAiKey}` },
        signal: AbortSignal.timeout(15_000),
      },
    ),
  );
  await check("Replicate", () =>
    fetch(`https://api.replicate.com/v1/models/cjwbw/rembg/versions/${rembgVersion}`, {
      headers: { Authorization: `Token ${replicateToken}` },
      signal: AbortSignal.timeout(15_000),
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
