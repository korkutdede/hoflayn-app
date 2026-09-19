import { ZodError } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { createProduct, listProducts } from "@/lib/services/products";

export async function GET(request: Request) {
  try {
    const { tenant } = await requireApiOnboardedTenant(request);
    return apiSuccess(await listProducts(tenant.id));
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { tenant } = await requireApiOnboardedTenant(request);
    const product = await createProduct(tenant.id, await readJson(request));
    return apiSuccess(product, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "validation_error",
          "api.error.validation.product",
          undefined,
          error.issues,
        ),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
