import { requireOnboardingPage } from "@/lib/auth/onboarding";
import { getTranslator } from "@/lib/i18n/server";
import { OnboardingForm } from "./_components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const NEXT_STEPS = ["studio", "product", "caption"] as const;

export default async function OnboardingPage() {
  const { tenant } = await requireOnboardingPage();
  const t = await getTranslator();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <OnboardingForm defaultName={tenant.name} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("onboarding.nextSteps.title")}
          </CardTitle>
          <CardDescription>
            {t("onboarding.nextSteps.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {NEXT_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                  {index + 1}
                </span>
                <span>
                  <span className="font-medium text-zinc-900">
                    {t(`onboarding.step.${step}.title`)}
                  </span>
                  <span className="mt-0.5 block text-zinc-500">
                    {t(`onboarding.step.${step}.body`)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
