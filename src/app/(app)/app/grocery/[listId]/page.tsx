import { notFound } from "next/navigation";
import { requireHouseholdContext } from "@/lib/auth/session";
import { GroceryListClient } from "@/components/grocery/grocery-list-client";

export default async function GroceryListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: list } = await supabase
    .from("grocery_lists")
    .select("*")
    .eq("id", listId)
    .eq("household_id", householdId)
    .single();
  if (!list) notFound();

  const { data: items } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("grocery_list_id", listId)
    .order("sort_order");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Shopping list</h1>
        <p className="text-sm text-muted-foreground">
          Large tap targets for one-handed shopping. Costco labels are suggestions only.
        </p>
      </div>
      <GroceryListClient listId={listId} items={items ?? []} />
    </div>
  );
}
