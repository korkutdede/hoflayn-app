import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { aiJobs, products } from "@/db/schema";

export type BetaWelcomeProgress = {
  studioPhoto: boolean;
  productCreated: boolean;
  captionGenerated: boolean;
  allDone: boolean;
};

/**
 * First-session checklist for closed beta producers.
 */
export async function getBetaWelcomeProgress(
  tenantId: string,
): Promise<BetaWelcomeProgress> {
  const [[studioRow], [productRow], [captionRow]] = await Promise.all([
    db
      .select({ id: aiJobs.id })
      .from(aiJobs)
      .where(
        and(
          eq(aiJobs.tenantId, tenantId),
          eq(aiJobs.status, "succeeded"),
          inArray(aiJobs.operation, ["remove_bg", "white_bg"]),
        ),
      )
      .limit(1),
    db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .limit(1),
    db
      .select({ id: aiJobs.id })
      .from(aiJobs)
      .where(
        and(
          eq(aiJobs.tenantId, tenantId),
          eq(aiJobs.status, "succeeded"),
          eq(aiJobs.operation, "generate_caption"),
        ),
      )
      .limit(1),
  ]);

  const studioPhoto = Boolean(studioRow);
  const productCreated = Boolean(productRow);
  const captionGenerated = Boolean(captionRow);

  return {
    studioPhoto,
    productCreated,
    captionGenerated,
    allDone: studioPhoto && productCreated && captionGenerated,
  };
}
