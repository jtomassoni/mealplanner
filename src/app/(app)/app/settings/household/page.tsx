import { requireHouseholdContext } from "@/lib/auth/session";

export default async function HouseholdSettingsPage() {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", householdId)
    .eq("is_active", true);

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", ids)
    : { data: [] as { id: string; display_name: string | null; email: string | null }[] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Household</h1>
      <p className="text-sm text-muted-foreground">
        {household?.name}. Membership is managed via the setup script for v1.
      </p>
      <ul className="space-y-2">
        {(members ?? []).map((m) => {
          const p = profileMap.get(m.user_id);
          return (
            <li
              key={m.user_id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <p className="font-medium">{p?.display_name || p?.email}</p>
              <p className="text-xs text-muted-foreground">
                {p?.email} · {m.role}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
