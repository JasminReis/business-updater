import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(callbackUrl ?? "/dashboard");

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          <span className="text-accent">◆</span> PresenceAI
        </h1>
        <p className="mt-2 text-center text-content-muted">
          Your online presence, in your pocket.
        </p>

        <form
          className="mt-10"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-card border border-border bg-surface-raised px-4 py-3.5 font-medium active:scale-[0.98]"
          >
            Continue with Google
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-sm text-content-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: formData.get("email"),
              redirectTo: callbackUrl ?? "/dashboard",
            });
          }}
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@business.com"
            autoComplete="email"
            className="w-full rounded-card border border-border bg-surface-raised px-4 py-3.5"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-card bg-accent px-4 py-3.5 font-medium text-white active:scale-[0.98]"
          >
            Email me a login link
          </button>
        </form>
      </div>
    </main>
  );
}
