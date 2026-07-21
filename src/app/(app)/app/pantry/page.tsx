import { listPantry, upsertPantryItem, deletePantryItem } from "@/actions/pantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function PantryPage() {
  const items = await listPantry();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Pantry</h1>
      <form
        action={async (fd) => {
          "use server";
          await upsertPantryItem({
            ingredientName: String(fd.get("name") ?? ""),
            quantity: fd.get("quantity") ? Number(fd.get("quantity")) : null,
            unit: String(fd.get("unit") || "") || null,
            isStaple: fd.get("staple") === "on",
            inStock: true,
          });
        }}
        className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4"
      >
        <Input name="name" placeholder="Ingredient" required className="min-h-11 sm:col-span-2" />
        <Input name="quantity" placeholder="Qty" className="min-h-11" />
        <Input name="unit" placeholder="Unit" className="min-h-11" />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="staple" /> Usually on hand
        </label>
        <Button type="submit" className="sm:col-span-2">Add pantry item</Button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
            <div>
              <p className="font-medium">{item.ingredient_name}</p>
              <p className="text-xs text-muted-foreground">
                {[item.quantity, item.unit].filter(Boolean).join(" ") || "—"}
              </p>
              <div className="mt-1 flex gap-1">
                {item.in_stock ? <Badge variant="secondary">In stock</Badge> : <Badge variant="outline">Out</Badge>}
                {item.is_staple ? <Badge variant="outline">Staple</Badge> : null}
                {item.is_low ? <Badge>Low</Badge> : null}
              </div>
            </div>
            <form action={async () => { "use server"; await deletePantryItem(item.id); }}>
              <Button type="submit" variant="ghost" size="sm">Delete</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
