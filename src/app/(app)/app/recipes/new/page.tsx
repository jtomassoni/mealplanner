import { RecipeForm } from "@/components/recipes/recipe-form";

export default function NewRecipePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">New recipe</h1>
      <RecipeForm mode="create" />
    </div>
  );
}
