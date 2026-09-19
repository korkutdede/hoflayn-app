import { ZodError } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { requireApiTenant } from "@/lib/auth/api-session";
import { completeWorkshop, workshopInputSchema } from "@/lib/services/workshop";

export async function PATCH(request: Request) {
  try {
    const context = await requireApiTenant(request);
    const input = workshopInputSchema.parse(await readJson(request));
    return apiSuccess(await completeWorkshop(context, input));
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "validation_error",
          "api.error.validation.workshop",
          undefined,
          error.issues,
        ),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
