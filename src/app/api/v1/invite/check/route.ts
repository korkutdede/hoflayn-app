import { z } from "zod";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { getInviteGateStatus, verifyInviteEmail } from "@/lib/auth/invite";
import {
  inviteErrorStatus,
  inviteMessageKey,
  inviteMessageVars,
} from "@/lib/auth/invite-messages";

const schema = z.object({ email: z.string().trim().min(1).max(320) });

export async function GET() {
  try {
    return apiSuccess(await getInviteGateStatus());
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(422, "invalid_email", "auth.error.invalidEmail");
    }
    const result = await verifyInviteEmail(parsed.data.email);
    if (!result.ok) {
      throw new ApiError(
        inviteErrorStatus(result.code),
        result.code,
        inviteMessageKey(result.code),
        inviteMessageVars(),
      );
    }
    return apiSuccess({
      allowed: true as const,
      status: result.status,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
