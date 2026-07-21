import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedRaw = process.env.ALLOWED_EMAILS;
  const householdName = process.env.DEFAULT_HOUSEHOLD_NAME || "JT and Mary";

  if (!url || !serviceKey || !allowedRaw) {
    throw new Error(
      "Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ALLOWED_EMAILS",
    );
  }

  const allowed = allowedRaw.split(",").map(normalizeEmail).filter(Boolean);
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw listError;

  const users = (listed.users ?? []).filter(
    (u) => u.email && allowed.includes(normalizeEmail(u.email)),
  );

  if (users.length === 0) {
    console.error(
      "No auth users matched ALLOWED_EMAILS. Create users in Supabase Auth first.",
    );
    process.exit(1);
  }

  console.log(`Found ${users.length} allowed auth user(s).`);

  for (const user of users) {
    const email = normalizeEmail(user.email!);
    const display =
      (user.user_metadata?.display_name as string | undefined) ||
      email.split("@")[0];
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        display_name: display,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
    console.log(`Upserted profile for ${email}`);
  }

  let { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("name", householdName)
    .maybeSingle();

  if (!household) {
    const { data, error } = await supabase
      .from("households")
      .insert({ name: householdName })
      .select("*")
      .single();
    if (error) throw error;
    household = data;
    console.log(`Created household: ${householdName}`);
  } else {
    console.log(`Using existing household: ${householdName}`);
  }

  for (const user of users) {
    const { error } = await supabase.from("household_members").upsert(
      {
        household_id: household!.id,
        user_id: user.id,
        role: "member",
        is_active: true,
      },
      { onConflict: "household_id,user_id" },
    );
    if (error) throw error;

    const { error: prefError } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        household_id: household!.id,
        email_enabled: false,
      },
      { onConflict: "user_id,household_id" },
    );
    if (prefError) throw prefError;
    console.log(`Ensured membership + prefs for ${user.email}`);
  }

  console.log("Household setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
