import { z } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getTenantAiJob } from "@/lib/services/jobs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const parsed = z
      .string()
      .uuid()
      .safeParse((await context.params).id);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_job_id", "api.error.invalidJobId");
    }
    const id = parsed.data;
    const job = await getTenantAiJob(tenant.tenant.id, id);
    if (!job) throw new ApiError(404, "not_found", "api.error.jobNotFound");
    return apiSuccess(job);
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
