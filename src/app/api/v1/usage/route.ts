import { apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getTenantCostSummary } from "@/lib/ai/cost-summary";

export async function GET(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    const summary = await getTenantCostSummary(context.tenant.id);
    return apiSuccess({
      windowDays: summary.windowDays,
      creditsUsed: summary.creditsUsed,
      jobCount: summary.jobCount,
      succeededJobs: summary.succeededJobs,
      byOperation: summary.byOperation,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
