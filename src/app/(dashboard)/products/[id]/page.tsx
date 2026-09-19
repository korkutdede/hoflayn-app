import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { isModuleEnabled } from "@/lib/entitlements/check";
import { listCoverOptions } from "../_actions/product-actions";
import { ProductForm } from "../_components/product-form";
import { AiDescriptionPanel } from "../_components/ai-description-panel";
import { InstagramCaptionPanel } from "../_components/instagram-caption-panel";
import { HoflaynWebExportPanel } from "../_components/hoflayn-web-export-panel";
import { getProductSyncLink } from "@/lib/bridge";
import { getTranslator } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { tenant } = await requireOnboardedTenant();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenant.id)))
    .limit(1);

  if (!product) notFound();

  const [covers, writerEnabled, syncLink, t] = await Promise.all([
    listCoverOptions(tenant.id),
    isModuleEnabled(tenant.id, "writer"),
    getProductSyncLink(tenant.id, product.id),
    getTranslator(),
  ]);
  const devWriterBypassEnabled =
    process.env.NODE_ENV === "development" ||
    process.env.DEV_UNLOCK_WRITER === "true";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{t("products.eyebrow")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {product.name}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/products">{t("products.backToList")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.detail.editTitle")}</CardTitle>
          <CardDescription>
            {product.descriptionAiGenerated
              ? t("products.detail.aiApproved")
              : t("products.detail.manualOrAi")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="edit"
            covers={covers}
            values={{
              id: product.id,
              name: product.name,
              description: product.description ?? "",
              price: product.price ?? "",
              costPrice: product.costPrice ?? "",
              stockQuantity: product.stockQuantity,
              category: product.category ?? "",
              tags: product.tags ?? "",
              coverImageId: product.coverImageId,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.detail.caption.title")}</CardTitle>
          <CardDescription>
            {t("products.detail.caption.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstagramCaptionPanel
            productId={product.id}
            writerEnabled={writerEnabled}
            devBypassEnabled={devWriterBypassEnabled}
            creditBalance={tenant.creditBalance}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.detail.description.title")}</CardTitle>
          <CardDescription>
            {t("products.detail.description.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiDescriptionPanel
            productId={product.id}
            productName={product.name}
            category={product.category ?? ""}
            writerEnabled={writerEnabled}
            creditBalance={tenant.creditBalance}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.detail.bridge.title")}</CardTitle>
          <CardDescription>
            {t("products.detail.bridge.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoflaynWebExportPanel
            productId={product.id}
            syncStatus={syncLink?.status ?? null}
            externalId={syncLink?.externalId ?? null}
            externalUrl={syncLink?.externalUrl ?? null}
            rejectionReason={syncLink?.rejectionReason ?? null}
            needsUpdate={
              Boolean(
                syncLink?.lastSuccessAt &&
                  product.updatedAt > syncLink.lastSuccessAt,
              )
            }
            lastError={syncLink?.lastError ?? null}
            lastAttemptAt={syncLink?.lastAttemptAt?.toISOString() ?? null}
            lastSyncedAt={syncLink?.lastSyncedAt?.toISOString() ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
