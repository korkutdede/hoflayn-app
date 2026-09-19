import { z, ZodError } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getCatalog } from "@/lib/services/catalogs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    return apiSuccess(await getCatalog(tenant, id));
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "invalid_input",
          "api.error.invalidData",
          undefined,
          error.issues,
        ),
      );
    }
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "catalog_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
