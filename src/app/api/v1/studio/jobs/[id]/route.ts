import { z } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getStudioJob } from "@/lib/services/studio";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenant } = await requireApiOnboardedTenant(request);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new ApiError(400, "invalid_job_id", "api.error.invalidStudioJobId");
    }
    const job = await getStudioJob(tenant.id, id);
    if (!job)
      throw new ApiError(404, "not_found", "api.error.studioJobNotFound");
    return apiSuccess(job);
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
