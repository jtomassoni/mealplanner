import { createClient } from "@/lib/supabase/server";
import { getEnv } from "@/lib/env";
import { isEmailAllowed, parseAllowedEmails } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "unauthenticated" | "unauthorized" | "no_household" = "unauthorized",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("You must be signed in.", "unauthenticated");
  }

  const env = getEnv();
  const allowed = parseAllowedEmails(env.ALLOWED_EMAILS);
  if (!user.email || !isEmailAllowed(user.email, allowed)) {
    throw new AuthError("Your account is not authorized for this app.", "unauthorized");
  }

  return user;
}

export async function requireHouseholdContext() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership, error } = await supabase
    .from("household_members")
    .select("household_id, role, households(id, name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    throw new AuthError(
      "No household membership found. Run the household setup script.",
      "no_household",
    );
  }

  return {
    user,
    householdId: membership.household_id as string,
    role: membership.role as string,
    supabase,
  };
}

export async function getCurrentProfile() {
  const { user, householdId, supabase } = await requireHouseholdContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, householdId, profile, supabase };
}
