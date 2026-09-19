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
import {
  analyzeProductSeo,
  applyProductSeo,
  getProductSeo,
} from "@/lib/services/product-seo";

type RouteContext = { params: Promise<{ id: string }> };

async function productId(context: RouteContext) {
  return z
    .string()
    .uuid()
    .parse((await context.params).id);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    return apiSuccess(await getProductSeo(tenant, await productId(context)));
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
      return apiFailure(ApiError.from(400, "seo_failed", error));
    }
    return apiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    return apiSuccess(
      await analyzeProductSeo(
        tenant,
        await productId(context),
        await readJson(request),
      ),
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
      return apiFailure(ApiError.from(400, "seo_failed", error));
    }
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      return apiFailure(new ApiError(403, "forbidden", "seo.error.applyRole"));
    }
    return apiSuccess(
      await applyProductSeo(
        tenant,
        await productId(context),
        await readJson(request),
      ),
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
      return apiFailure(ApiError.from(400, "seo_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
