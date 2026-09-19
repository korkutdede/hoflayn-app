import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getSale } from "@/lib/services/sales";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const { id } = await params;
    return apiSuccess(await getSale(tenant, id));
  } catch (error) {
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "sales_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
