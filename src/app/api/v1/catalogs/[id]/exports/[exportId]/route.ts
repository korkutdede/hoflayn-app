import { z, ZodError } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getCatalogExport } from "@/lib/services/catalogs";

type RouteContext = { params: Promise<{ id: string; exportId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const params = await context.params;
    const catalogId = z.string().uuid().parse(params.id);
    const exportId = z.string().uuid().parse(params.exportId);
    return apiSuccess(await getCatalogExport(tenant, catalogId, exportId));
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
