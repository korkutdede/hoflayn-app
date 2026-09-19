import { apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiTenant } from "@/lib/auth/api-session";
import { getMobileMe } from "@/lib/services/workshop";

export async function POST(request: Request) {
  try {
    const context = await requireApiTenant(request);
    return apiSuccess(await getMobileMe(context));
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
