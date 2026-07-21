import { notFound } from "next/navigation";
import { getRecipeDetail } from "@/actions/recipes";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const detail = await getRecipeDetail(recipeId);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Improve recipe</h1>
      <p className="text-sm text-muted-foreground">
        Saving creates a new version and keeps the previous one for history.
      </p>
      <RecipeForm
        mode="edit"
        recipeId={recipeId}
        initial={{
          title: detail.recipe.title,
          description: detail.recipe.description,
          sourceType: detail.recipe.source_type,
          sourceName: detail.recipe.source_name,
          cuisine: detail.recipe.cuisine,
          defaultServings: detail.current?.default_servings ?? 4,
          difficulty: detail.current?.difficulty,
          ingredients: detail.ingredients.map((i) => ({
            ingredientName: i.ingredient_name,
            quantity: i.quantity?.toString() ?? "",
            unit: i.unit ?? "",
            preparationNote: i.preparation_note ?? "",
          })),
          steps: detail.steps.map((s) => ({ instruction: s.instruction })),
        }}
      />
    </div>
  );
}
