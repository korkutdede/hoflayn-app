import { LoginForm } from "./_components/login-form";
import { BetaAuthBadge } from "@/components/beta-auth-badge";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <BetaAuthBadge inviteError={error === "invite"} />
      <LoginForm
        oauthError={
          error === "google" || error === "auth_callback" ? error : undefined
        }
      />
    </main>
  );
}
