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
import { importSalesFromCsv } from "@/lib/services/sales";
import { InsufficientStockError } from "@/lib/services/stock-movements";

const importBodySchema = z.object({
  csv: z.string().min(1).max(500_000),
  note: z.string().trim().max(400).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      return apiFailure(
        new ApiError(403, "forbidden", "sales.error.roleImport"),
      );
    }
    const body = importBodySchema.parse(await readJson(request));
    const result = await importSalesFromCsv(tenant, body);
    return apiSuccess(result, result.reused ? 200 : 201);
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
    if (error instanceof InsufficientStockError) {
      return apiFailure(
        ApiError.from(409, "insufficient_stock", error, {
          productId: error.productId,
          requested: error.requested,
          available: error.available,
        }),
      );
    }
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "sales_import_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
