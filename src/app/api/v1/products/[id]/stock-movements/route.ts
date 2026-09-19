import { ZodError, z } from "zod";
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
  applyStockMovement,
  InsufficientStockError,
  listStockMovements,
} from "@/lib/services/stock-movements";

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
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    return apiSuccess(
      await listStockMovements(tenant, await productId(context), limit),
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
      return apiFailure(ApiError.from(400, "stock_failed", error));
    }
    return apiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    return apiSuccess(
      await applyStockMovement(
        tenant,
        await productId(context),
        await readJson(request),
      ),
      201,
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return apiFailure(
        ApiError.from(409, "insufficient_stock", error, {
          productId: error.productId,
          requested: error.requested,
          available: error.available,
        }),
      );
    }
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
      return apiFailure(ApiError.from(400, "stock_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
