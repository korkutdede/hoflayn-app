import { ZodError } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { parseCraftCategories } from "@/lib/craft/categories";
import { updateWorkshop, workshopInputSchema } from "@/lib/services/workshop";

export async function PATCH(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    if (context.role === "member") {
      throw new ApiError(403, "manager_required", "settings.error.role");
    }
    const tenant = await updateWorkshop(
      context,
      workshopInputSchema.parse(await readJson(request)),
    );
    return apiSuccess({
      id: tenant.id,
      name: tenant.name,
      craftCategory: parseCraftCategories(tenant.craftCategory)[0] ?? null,
      craftCategories: parseCraftCategories(tenant.craftCategory),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "invalid_settings",
          "api.error.invalidData",
          undefined,
          error.issues,
        ),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
