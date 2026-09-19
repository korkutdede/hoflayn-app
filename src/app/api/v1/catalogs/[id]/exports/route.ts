import { z, ZodError } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { startCatalogExport } from "@/lib/services/catalogs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      return apiFailure(
        new ApiError(403, "forbidden", "catalogs.error.exportRole"),
      );
    }
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    return apiSuccess(
      await startCatalogExport(tenant, id, await readJson(request)),
      201,
    );
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
