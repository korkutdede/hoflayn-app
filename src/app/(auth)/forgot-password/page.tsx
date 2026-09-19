import { ForgotPasswordForm } from "./_components/forgot-password-form";
import { BetaAuthBadge } from "@/components/beta-auth-badge";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <BetaAuthBadge />
      <ForgotPasswordForm />
    </main>
  );
}
