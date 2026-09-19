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
import { generateProductCaption } from "@/lib/services/product-ai";

type RouteContext = { params: Promise<{ id: string }> };

const inputSchema = z.object({
  tone: z.enum(["samimi", "hikaye", "sade"]),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const input = inputSchema.parse(await readJson(request));
    return apiSuccess(
      await generateProductCaption(tenant, id, input.tone),
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
      return apiFailure(ApiError.from(400, "caption_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
