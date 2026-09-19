import { ZodError } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import { listLabelExports, startLabelExport } from "@/lib/services/labels";

export async function GET(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    return apiSuccess(await listLabelExports(tenant));
  } catch (error) {
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "labels_failed", error));
    }
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      return apiFailure(new ApiError(403, "forbidden", "labels.error.role"));
    }
    return apiSuccess(
      await startLabelExport(tenant, await readJson(request)),
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
      return apiFailure(ApiError.from(400, "labels_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
