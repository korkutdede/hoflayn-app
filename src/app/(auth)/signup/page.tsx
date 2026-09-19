import { SignupForm } from "./_components/signup-form";
import { BetaAuthBadge } from "@/components/beta-auth-badge";

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <BetaAuthBadge />
      <SignupForm />
    </main>
  );
}
