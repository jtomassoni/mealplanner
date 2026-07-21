import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthError, requireHouseholdContext } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { householdId, supabase } = await requireHouseholdContext();
    const { data: household } = await supabase
      .from("households")
      .select("name")
      .eq("id", householdId)
      .single();

    return (
      <AppShell householdName={household?.name ?? "Household"}>
        {children}
      </AppShell>
    );
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "unauthenticated" || error.code === "unauthorized") {
        redirect("/login");
      }
      return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
          <h1 className="font-display text-2xl font-semibold">Household setup needed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in, but no household membership was found. Run{" "}
            <code className="rounded bg-muted px-1">pnpm setup:household</code> after
            creating auth users in Supabase.
          </p>
        </div>
      );
    }
    throw error;
  }
}
