import { requireHouseholdContext } from "@/lib/auth/session";
import { createMealHistory } from "@/actions/history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { redirect } from "next/navigation";

export default async function NewHistoryPage() {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("title");

  async function save(formData: FormData) {
    "use server";
    const recipeId = String(formData.get("recipeId") || "") || null;
    let recipeVersionId: string | null = null;
    if (recipeId) {
      const ctx = await requireHouseholdContext();
      const { data: version } = await ctx.supabase
        .from("recipe_versions")
        .select("id")
        .eq("recipe_id", recipeId)
        .eq("is_current", true)
        .maybeSingle();
      recipeVersionId = version?.id ?? null;
    }
    const result = await createMealHistory({
      recipeId,
      recipeVersionId,
      overallRating: formData.get("rating") ? Number(formData.get("rating")) : null,
      wouldMakeAgain: (String(formData.get("again") || "") || null) as never,
      review: String(formData.get("review") || "") || null,
    });
    if (result.id) redirect(`/app/history/${result.id}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Log a meal</h1>
      <form action={save} className="space-y-3">
        <div className="space-y-1">
          <Label>Recipe</Label>
          <select name="recipeId" className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="">No recipe</option>
            {(recipes ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Rating</Label>
          <Input name="rating" type="number" min={1} max={5} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Make again?</Label>
          <select name="again" className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Review</Label>
          <Textarea name="review" placeholder="Quick notes" />
        </div>
        <Button type="submit" size="lg" className="w-full">Save</Button>
      </form>
    </div>
  );
}
