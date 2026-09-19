import { processDueAiJobs } from "@/lib/ai/jobs/worker";
import { verifyBearerSecret } from "@/lib/security/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function batchSize() {
  const parsed = Number(process.env.AI_WORKER_BATCH_SIZE ?? 3);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, 10)) : 3;
}

async function run(request: Request) {
  const configured =
    process.env.AI_WORKER_SECRET ?? process.env.CRON_SECRET;
  if (!configured) {
    return Response.json(
      { ok: false, error: "AI worker is not configured." },
      { status: 503 },
    );
  }
  if (
    !verifyBearerSecret(request.headers.get("authorization"), configured)
  ) {
    return Response.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const summary = await processDueAiJobs(batchSize());
  return Response.json({ ok: true, data: summary });
}

export const GET = run;
export const POST = run;
