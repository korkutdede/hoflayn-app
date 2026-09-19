import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { tenantCurrency } from "@/lib/tenant/currency";
import { formatMoneyDecimal } from "@hoflayn/i18n";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { tenant } = await requireOnboardedTenant();
  const [t, locale] = await Promise.all([getTranslator(), getLocale()]);
  const currency = tenantCurrency(tenant);

  const rows = await db
    .select()
    .from(products)
    .where(eq(products.tenantId, tenant.id))
    .orderBy(desc(products.updatedAt))
    .limit(50);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{t("products.eyebrow")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {t("nav.products")}
          </h1>
        </div>
        <Button asChild>
          <Link href="/products/new">{t("products.new")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("products.card.title")}</CardTitle>
          <CardDescription>{t("products.card.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              title={t("products.empty.title")}
              description={t("products.empty.description")}
              actionHref="/products/new"
              actionLabel={t("products.empty.action")}
            />
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {rows.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/products/${p.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-900">{p.name}</span>
                    <span className="shrink-0 text-zinc-500">
                      {p.price
                        ? formatMoneyDecimal(p.price, currency, locale)
                        : "—"}
                      {p.descriptionAiGenerated ? " · AI" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
