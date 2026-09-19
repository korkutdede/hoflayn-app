import { ZodError } from "zod";
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
  listLowStockAlerts,
  updateLowStockSettings,
} from "@/lib/services/low-stock";

export async function GET(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    return apiSuccess(await listLowStockAlerts(tenant));
  } catch (error) {
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "low_stock_failed", error));
    }
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      return apiFailure(
        new ApiError(403, "forbidden", "stock.error.thresholdRole"),
      );
    }
    return apiSuccess(
      await updateLowStockSettings(tenant, await readJson(request)),
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
      return apiFailure(ApiError.from(400, "low_stock_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
