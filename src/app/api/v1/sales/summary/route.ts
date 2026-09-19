import { z, ZodError } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { getSalesSummary } from "@/lib/services/sales";

const querySchema = z.object({
  productId: z.string().uuid().optional(),
  topN: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      productId: url.searchParams.get("productId") ?? undefined,
      topN: url.searchParams.get("topN") ?? undefined,
    });
    return apiSuccess(
      await getSalesSummary(tenant, {
        productId: parsed.productId,
        topN: parsed.topN,
      }),
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
      return apiFailure(ApiError.from(400, "sales_summary_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
