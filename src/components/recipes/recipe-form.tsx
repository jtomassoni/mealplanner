"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRecipe, updateRecipeAsNewVersion } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SOURCE_TYPES, DIFFICULTIES } from "@/types/enums";

type Ing = { ingredientName: string; quantity: string; unit: string; preparationNote: string };
type Step = { instruction: string };

export function RecipeForm({
  mode,
  recipeId,
  initial,
}: {
  mode: "create" | "edit";
  recipeId?: string;
  initial?: {
    title: string;
    description?: string | null;
    sourceType: string;
    sourceName?: string | null;
    cuisine?: string | null;
    defaultServings?: number;
    difficulty?: string | null;
    ingredients: Ing[];
    steps: Step[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ingredients, setIngredients] = useState<Ing[]>(
    initial?.ingredients?.length
      ? initial.ingredients
      : [{ ingredientName: "", quantity: "", unit: "", preparationNote: "" }],
  );
  const [steps, setSteps] = useState<Step[]>(
    initial?.steps?.length ? initial.steps : [{ instruction: "" }],
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const payload = {
            title: String(fd.get("title") ?? ""),
            description: String(fd.get("description") || "") || null,
            sourceType: String(fd.get("sourceType") ?? "household") as never,
            sourceName: String(fd.get("sourceName") || "") || null,
            cuisine: String(fd.get("cuisine") || "") || null,
            defaultServings: Number(fd.get("servings") || 4),
            difficulty: (String(fd.get("difficulty") || "") || null) as never,
            changeSummary: String(fd.get("changeSummary") || "") || null,
            ingredients: ingredients
              .filter((i) => i.ingredientName.trim())
              .map((i) => ({
                ingredientName: i.ingredientName,
                quantity: i.quantity ? Number(i.quantity) : null,
                unit: i.unit || null,
                preparationNote: i.preparationNote || null,
              })),
            steps: steps.filter((s) => s.instruction.trim()),
          };

          const result =
            mode === "create"
              ? await createRecipe(payload)
              : await updateRecipeAsNewVersion(recipeId!, payload);

          if (result.error) toast.error(result.error);
          else {
            toast.success(mode === "create" ? "Recipe saved" : "New version saved");
            const id =
              "recipeId" in result && result.recipeId
                ? result.recipeId
                : recipeId;
            router.push(`/app/recipes/${id}`);
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={initial?.title} className="min-h-11" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Source</Label>
          <select name="sourceType" defaultValue={initial?.sourceType ?? "household"} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            {SOURCE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Difficulty</Label>
          <select name="difficulty" defaultValue={initial?.difficulty ?? ""} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="">—</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Source name</Label>
          <Input name="sourceName" defaultValue={initial?.sourceName ?? ""} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Cuisine</Label>
          <Input name="cuisine" defaultValue={initial?.cuisine ?? ""} className="min-h-11" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Default servings</Label>
        <Input name="servings" type="number" min={1} defaultValue={initial?.defaultServings ?? 4} className="min-h-11" />
      </div>
      {mode === "edit" && (
        <div className="space-y-1">
          <Label>Change summary</Label>
          <Input name="changeSummary" placeholder="More garlic" className="min-h-11" />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setIngredients((v) => [...v, { ingredientName: "", quantity: "", unit: "", preparationNote: "" }])}>
            Add
          </Button>
        </div>
        {ingredients.map((ing, idx) => (
          <div key={idx} className="grid grid-cols-6 gap-2">
            <Input className="col-span-2 min-h-11" placeholder="Name" value={ing.ingredientName} onChange={(e) => setIngredients((rows) => rows.map((r, i) => i === idx ? { ...r, ingredientName: e.target.value } : r))} />
            <Input className="min-h-11" placeholder="Qty" value={ing.quantity} onChange={(e) => setIngredients((rows) => rows.map((r, i) => i === idx ? { ...r, quantity: e.target.value } : r))} />
            <Input className="min-h-11" placeholder="Unit" value={ing.unit} onChange={(e) => setIngredients((rows) => rows.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))} />
            <Input className="col-span-2 min-h-11" placeholder="Prep note" value={ing.preparationNote} onChange={(e) => setIngredients((rows) => rows.map((r, i) => i === idx ? { ...r, preparationNote: e.target.value } : r))} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Steps</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setSteps((v) => [...v, { instruction: "" }])}>
            Add
          </Button>
        </div>
        {steps.map((step, idx) => (
          <Textarea
            key={idx}
            placeholder={`Step ${idx + 1}`}
            value={step.instruction}
            onChange={(e) => setSteps((rows) => rows.map((r, i) => i === idx ? { instruction: e.target.value } : r))}
          />
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create recipe" : "Save as new version"}
      </Button>
    </form>
  );
}
