import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipeDetail, toggleFavorite } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const detail = await getRecipeDetail(recipeId);
  if (!detail) notFound();
  const { recipe, current, ingredients, steps, versions } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold">{recipe.title}</h1>
          <p className="text-sm text-muted-foreground">{recipe.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary">{recipe.source_type}</Badge>
            {recipe.cuisine ? <Badge variant="outline">{recipe.cuisine}</Badge> : null}
            {current ? <Badge variant="outline">v{current.version_number}</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <form action={async () => { "use server"; await toggleFavorite(recipeId); }}>
            <Button type="submit" variant="outline">{recipe.is_favorite ? "Unfavorite" : "Favorite"}</Button>
          </form>
          <Button asChild>
            <Link href={`/app/recipes/${recipeId}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Ingredients</h2>
        <ul className="space-y-1 text-sm">
          {ingredients.map((ing) => (
            <li key={ing.id}>
              {[ing.quantity, ing.unit, ing.ingredient_name].filter(Boolean).join(" ")}
              {ing.preparation_note ? `, ${ing.preparation_note}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Steps</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {steps.map((step) => (
            <li key={step.id}>{step.instruction}</li>
          ))}
        </ol>
      </section>

      {current?.storage_instructions || current?.reheating_instructions ? (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          {current.storage_instructions ? <p><strong>Storage:</strong> {current.storage_instructions}</p> : null}
          {current.reheating_instructions ? <p className="mt-2"><strong>Reheat:</strong> {current.reheating_instructions}</p> : null}
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Versions</h2>
        <ul className="text-sm text-muted-foreground">
          {versions.map((v) => (
            <li key={v.id}>
              v{v.version_number}{v.is_current ? " (current)" : ""} — {v.change_summary || "No summary"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
