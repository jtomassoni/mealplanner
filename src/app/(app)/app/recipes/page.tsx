import Link from "next/link";
import { listRecipes } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recipes = await listRecipes(q);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">Recipes</h1>
        <Button asChild>
          <Link href="/app/recipes/new">New</Link>
        </Button>
      </div>
      <form>
        <Input name="q" defaultValue={q} placeholder="Search recipes" className="min-h-11" />
      </form>
      <ul className="space-y-2">
        {recipes.length === 0 ? (
          <li className="text-sm text-muted-foreground">No recipes yet. Add a family favorite.</li>
        ) : (
          recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/app/recipes/${recipe.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground">{recipe.source_type}</p>
                </div>
                {recipe.is_favorite ? <Badge>Favorite</Badge> : null}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
