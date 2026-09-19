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
import { SaleVoidConflictError, voidSale } from "@/lib/services/sales";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      return apiFailure(new ApiError(403, "forbidden", "sales.error.roleVoid"));
    }
    const { id } = await params;
    let body: unknown = {};
    try {
      body = await readJson(request);
    } catch {
      body = {};
    }
    const result = await voidSale(tenant, id, body);
    return apiSuccess(result, 200);
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
    if (error instanceof SaleVoidConflictError) {
      return apiFailure(ApiError.from(409, "sale_void_conflict", error));
    }
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "sale_void_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
