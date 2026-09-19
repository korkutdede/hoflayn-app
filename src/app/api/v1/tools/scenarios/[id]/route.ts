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
import {
  deleteToolScenario,
  getToolScenario,
  updateToolScenario,
} from "@/lib/services/tool-scenarios";

type RouteContext = { params: Promise<{ id: string }> };

async function scenarioId(context: RouteContext) {
  return z
    .string()
    .uuid()
    .parse((await context.params).id);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const row = await getToolScenario(
      tenant.tenant.id,
      await scenarioId(context),
    );
    if (!row) throw new ApiError(404, "not_found", "scenarios.error.notFound");
    return apiSuccess(row);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const row = await updateToolScenario(
      tenant,
      await scenarioId(context),
      await readJson(request),
    );
    if (!row) throw new ApiError(404, "not_found", "scenarios.error.notFound");
    return apiSuccess(row);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "invalid_scenario",
          "api.error.invalidData",
          undefined,
          error.issues,
        ),
      );
    }
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "scenario_failed", error));
    }
    return apiFailure(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const deleted = await deleteToolScenario(
      tenant.tenant.id,
      await scenarioId(context),
    );
    if (!deleted)
      throw new ApiError(404, "not_found", "scenarios.error.notFound");
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
