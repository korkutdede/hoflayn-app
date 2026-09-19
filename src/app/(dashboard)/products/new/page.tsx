import Link from "next/link";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { getTranslator } from "@/lib/i18n/server";
import { listCoverOptions } from "../_actions/product-actions";
import { ProductForm } from "../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { tenant } = await requireOnboardedTenant();
  const [covers, t] = await Promise.all([
    listCoverOptions(tenant.id),
    getTranslator(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{t("products.eyebrow")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {t("products.new")}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/products">{t("products.backToList")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.form.cardTitle")}</CardTitle>
          <CardDescription>
            {t("products.form.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="create"
            covers={covers}
            values={{
              name: "",
              description: "",
              price: "",
              costPrice: "",
              stockQuantity: 0,
              category: tenant.craftCategory ?? "",
              tags: "",
              coverImageId: null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
