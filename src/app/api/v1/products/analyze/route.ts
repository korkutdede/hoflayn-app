import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { analyzeProductImage } from "@/lib/services/products";

export async function POST(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      throw new ApiError(422, "image_required", "studio.error.noFile");
    }
    return apiSuccess(await analyzeProductImage(context, image), 201);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return apiFailure(
        new ApiError(402, "insufficient_credits", "credits.insufficient", {
          required: error.required,
          available: error.available,
        }),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
