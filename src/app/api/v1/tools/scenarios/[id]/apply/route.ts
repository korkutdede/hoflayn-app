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
import { applyToolScenarioToProduct } from "@/lib/services/tool-scenarios";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      throw new ApiError(403, "manager_required", "scenarios.error.applyRole");
    }
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const product = await applyToolScenarioToProduct(
      tenant,
      id,
      await readJson(request),
    );
    if (!product)
      throw new ApiError(404, "not_found", "products.error.notFound");
    return apiSuccess(product);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "invalid_apply",
          "api.error.invalidData",
          undefined,
          error.issues,
        ),
      );
    }
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "apply_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
