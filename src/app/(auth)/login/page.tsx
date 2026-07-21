import { LoginForm } from "@/components/auth/login-form";
import {
  getDevLoginCredentials,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-bypass";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  let initialError: string | null = null;
  if (params.error === "unauthorized") {
    initialError = "This account is not authorized for this household app.";
  } else if (params.error === "config") {
    initialError =
      "Missing environment configuration. Copy .env.example to .env.local.";
  }

  const showDevBypass = isDevAuthBypassEnabled();
  const creds = getDevLoginCredentials();
  const devLoginLabel = creds
    ? `Skip login as ${creds.email}`
    : "Skip login (dev)";

  return (
    <main className="landing">
      <div className="landing-visual" aria-hidden="true">
        <div className="landing-visual-photo" />
        <div className="landing-visual-wash" />
      </div>

      <div className="landing-panel">
        <div className="landing-copy">
          <p className="landing-brand">Mealplan</p>
          <h1 className="landing-headline">
            Plan the week.
            <span className="landing-headline-break"> Shop once.</span>
          </h1>
          <p className="landing-lede">
            A private household space for shared meals, family recipes, and a
            grocery list you can actually use at the store.
          </p>
        </div>

        <section className="landing-signin" aria-labelledby="signin-heading">
          <h2 id="signin-heading" className="landing-signin-title">
            Sign in
          </h2>
          <p className="landing-signin-note">
            Invite-free. Household members only.
          </p>
          <LoginForm
            initialError={initialError}
            showDevBypass={showDevBypass}
            devLoginLabel={devLoginLabel}
          />
        </section>
      </div>
    </main>
  );
}
