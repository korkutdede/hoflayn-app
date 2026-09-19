import { z, ZodError } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { setProductCover } from "@/lib/services/products";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({ coverImageId: z.string().uuid() });

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const productId = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const input = schema.parse(await readJson(request));
    const product = await setProductCover(
      tenant.tenant.id,
      productId,
      input.coverImageId,
    );
    if (!product)
      throw new ApiError(404, "not_found", "products.error.notFound");
    return apiSuccess(product);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(422, "invalid_cover", "products.error.invalidCover"),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
