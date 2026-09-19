import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getHomePulse } from "@/lib/services/home-pulse";

export async function GET(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    return apiSuccess(await getHomePulse(tenant));
  } catch (error) {
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "home_pulse_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
