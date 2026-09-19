import { apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { listCoverOptions } from "@/lib/services/products";

export async function GET(request: Request) {
  try {
    const { tenant } = await requireApiOnboardedTenant(request);
    return apiSuccess(await listCoverOptions(tenant.id));
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
