import { ZodError, z } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import {
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/lib/services/products";

type RouteContext = { params: Promise<{ id: string }> };

async function productId(context: RouteContext) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError(
      400,
      "invalid_product_id",
      "products.error.invalidProduct",
    );
  }
  return id;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenant } = await requireApiOnboardedTenant(request);
    const product = await getProduct(tenant.id, await productId(context));
    if (!product)
      throw new ApiError(404, "not_found", "products.error.notFound");
    return apiSuccess(product);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tenant } = await requireApiOnboardedTenant(request);
    const product = await updateProduct(
      tenant.id,
      await productId(context),
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { tenant, role } = await requireApiOnboardedTenant(request);
    if (role === "member") {
      throw new ApiError(403, "manager_required", "products.error.deleteRole");
    }
    const deleted = await deleteProduct(tenant.id, await productId(context));
    if (!deleted)
      throw new ApiError(404, "not_found", "products.error.notFound");
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
