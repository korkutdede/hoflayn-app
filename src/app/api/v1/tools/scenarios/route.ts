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
  createToolScenario,
  listToolScenarios,
} from "@/lib/services/tool-scenarios";

export async function GET(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    const kind = new URL(request.url).searchParams.get("kind");
    const parsed =
      kind == null ? undefined : z.enum(["desi", "profit"]).parse(kind);
    return apiSuccess(await listToolScenarios(context.tenant.id, parsed));
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(422, "invalid_kind", "scenarios.error.invalidKind"),
      );
    }
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    return apiSuccess(
      await createToolScenario(context, await readJson(request)),
      201,
    );
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

export const OPTIONS = apiOptions;
