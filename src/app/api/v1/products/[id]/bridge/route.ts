import { z, ZodError } from "zod";
import { ApiError, apiFailure, apiOptions, apiSuccess } from "@/lib/api/http";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import {
  BridgeConfigurationError,
  BridgeExportError,
  exportProduct,
  getProductBridgeStatus,
} from "@/lib/bridge";

type RouteContext = { params: Promise<{ id: string }> };

async function idFrom(context: RouteContext) {
  return z
    .string()
    .uuid()
    .parse((await context.params).id);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    const productId = await idFrom(context);
    const status = await getProductBridgeStatus({
      tenantId: tenant.tenant.id,
      productId,
      userEmail: tenant.user.email,
    });
    if (!status) {
      throw new ApiError(404, "not_found", "products.error.notFound");
    }
    return apiSuccess(status);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(404, "not_found", "products.error.notFound"),
      );
    }
    return apiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      throw new ApiError(403, "manager_required", "bridge.error.role");
    }
    const productId = await idFrom(context);
    const result = await exportProduct({
      tenantId: tenant.tenant.id,
      productId,
      userEmail: tenant.user.email,
    });
    return apiSuccess({
      configured: true,
      status: result.status,
      externalId: result.externalId ?? undefined,
      externalUrl: result.externalUrl ?? undefined,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BridgeConfigurationError) {
      return apiFailure(ApiError.from(503, error.code, error));
    }
    if (error instanceof BridgeExportError) {
      const status =
        error.statusCode === 404 || error.statusCode === 422
          ? error.statusCode
          : 502;
      return apiFailure(ApiError.from(status, error.code, error));
    }
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(404, "not_found", "products.error.notFound"),
      );
    }
    return apiFailure(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const tenant = await requireApiOnboardedTenant(request);
    if (tenant.role === "member") {
      throw new ApiError(403, "manager_required", "bridge.error.archiveRole");
    }
    const result = await exportProduct({
      tenantId: tenant.tenant.id,
      productId: await idFrom(context),
      userEmail: tenant.user.email,
      operation: "archive",
    });
    return apiSuccess({
      configured: true,
      status: result.status,
      externalId: result.externalId ?? undefined,
      externalUrl: result.externalUrl ?? undefined,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BridgeConfigurationError) {
      return apiFailure(ApiError.from(503, error.code, error));
    }
    if (error instanceof BridgeExportError) {
      const status =
        error.statusCode === 404 || error.statusCode === 422
          ? error.statusCode
          : 502;
      return apiFailure(ApiError.from(status, error.code, error));
    }
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(404, "not_found", "products.error.notFound"),
      );
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
