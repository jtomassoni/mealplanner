import Link from "next/link";
import { requireHouseholdContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";

export default async function GroceryIndexPage() {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: lists } = await supabase
    .from("grocery_lists")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  const active = (lists ?? []).find((l) => l.status === "active");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Grocery</h1>
      {active ? (
        <Link
          href={`/app/grocery/${active.id}`}
          className="block rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium">Current list</p>
            <Badge>Active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {active.generated_at ? new Date(active.generated_at).toLocaleString() : "—"}
          </p>
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">
          No grocery list yet. Approve a week, then generate a list from the planner.
        </p>
      )}
      <ul className="space-y-2">
        {(lists ?? []).map((list) => (
          <li key={list.id}>
            <Link href={`/app/grocery/${list.id}`} className="text-sm text-primary underline">
              List {list.id.slice(0, 8)} · {list.status}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
