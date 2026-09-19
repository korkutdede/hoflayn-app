import { ZodError } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { createStudioJob } from "@/lib/services/studio";

export async function POST(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      throw new ApiError(422, "image_required", "studio.error.noFile");
    }
    const job = await createStudioJob(context, image, formData.get("mode"));
    return apiSuccess(job, 201);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return apiFailure(
        new ApiError(402, "insufficient_credits", "credits.insufficient", {
          required: error.required,
          available: error.available,
        }),
      );
    }
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "validation_error",
          "api.error.validation.studio",
          undefined,
          error.issues,
        ),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
