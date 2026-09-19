import { ResetPasswordForm } from "./_components/reset-password-form";
import { BetaAuthBadge } from "@/components/beta-auth-badge";

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <BetaAuthBadge />
      <ResetPasswordForm />
    </main>
  );
}
