"use server";

import { revalidatePath } from "next/cache";
import { requireHouseholdContext } from "@/lib/auth/session";
import { enqueueNotification } from "@/lib/notifications/notify";
import { updateRecipeAsNewVersion, type RecipeInput } from "@/actions/recipes";

export async function listMealHistory(filters?: {
  q?: string;
  minRating?: number;
}) {
  const { householdId, supabase } = await requireHouseholdContext();
  let q = supabase
    .from("meal_history")
    .select("*")
    .eq("household_id", householdId)
    .order("cooked_at", { ascending: false });

  if (filters?.minRating) {
    q = q.gte("overall_rating", filters.minRating);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const recipeIds = [...new Set(rows.map((r) => r.recipe_id).filter(Boolean))] as string[];
  const entryIds = rows.map((r) => r.id);

  const { data: recipes } = recipeIds.length
    ? await supabase.from("recipes").select("id, title").in("id", recipeIds)
    : { data: [] as { id: string; title: string }[] };
  const { data: photos } = entryIds.length
    ? await supabase
        .from("meal_photos")
        .select("id, meal_history_id, storage_path, thumbnail_path, alt_text")
        .in("meal_history_id", entryIds)
    : { data: [] as { id: string; meal_history_id: string; storage_path: string; thumbnail_path: string | null; alt_text: string | null }[] };

  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));
  const photosByEntry = new Map<string, typeof photos>();
  for (const photo of photos ?? []) {
    const list = photosByEntry.get(photo.meal_history_id) ?? [];
    list.push(photo);
    photosByEntry.set(photo.meal_history_id, list);
  }

  let enriched = rows.map((r) => ({
    ...r,
    recipes: r.recipe_id ? recipeMap.get(r.recipe_id) ?? null : null,
    meal_photos: photosByEntry.get(r.id) ?? [],
  }));

  if (filters?.q?.trim()) {
    const needle = filters.q.trim().toLowerCase();
    enriched = enriched.filter((r) => {
      const title = r.recipes?.title ?? "";
      return (
        title.toLowerCase().includes(needle) ||
        (r.review ?? "").toLowerCase().includes(needle)
      );
    });
  }
  return enriched;
}

export async function getMealHistoryEntry(id: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data } = await supabase
    .from("meal_history")
    .select("*")
    .eq("id", id)
    .eq("household_id", householdId)
    .single();
  if (!data) return null;

  const [{ data: recipe }, { data: version }, { data: photos }, { data: participants }] =
    await Promise.all([
      data.recipe_id
        ? supabase.from("recipes").select("title").eq("id", data.recipe_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.recipe_version_id
        ? supabase
            .from("recipe_versions")
            .select("*")
            .eq("id", data.recipe_version_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("meal_photos").select("*").eq("meal_history_id", id),
      supabase
        .from("meal_history_participants")
        .select("*")
        .eq("meal_history_id", id),
    ]);

  return {
    ...data,
    recipes: recipe,
    recipe_versions: version,
    meal_photos: photos ?? [],
    meal_history_participants: participants ?? [],
  };
}

export async function createMealHistory(input: {
  plannedMealId?: string | null;
  recipeId?: string | null;
  recipeVersionId?: string | null;
  cookedAt?: string;
  cookedFor?: "both" | "specific";
  cookedForUserId?: string | null;
  overallRating?: number | null;
  review?: string | null;
  wouldMakeAgain?: "yes" | "maybe" | "no" | null;
  tags?: string[];
  participantRatings?: { userId: string; rating: number }[];
  recipeUpdate?: RecipeInput | null;
}) {
  const { user, householdId, supabase } = await requireHouseholdContext();

  let recipeVersionId = input.recipeVersionId ?? null;
  let recipeId = input.recipeId ?? null;

  if (input.plannedMealId) {
    const { data: meal } = await supabase
      .from("planned_meals")
      .select("*")
      .eq("id", input.plannedMealId)
      .single();
    if (meal) {
      recipeId = recipeId ?? meal.recipe_id;
      recipeVersionId = recipeVersionId ?? meal.recipe_version_id;
    }
  }

  const { data: entry, error } = await supabase
    .from("meal_history")
    .insert({
      household_id: householdId,
      planned_meal_id: input.plannedMealId ?? null,
      recipe_id: recipeId,
      recipe_version_id: recipeVersionId,
      cooked_at: input.cookedAt ?? new Date().toISOString(),
      cooked_for: input.cookedFor ?? "both",
      cooked_for_user_id:
        input.cookedFor === "specific" ? input.cookedForUserId ?? null : null,
      cooked_by: user.id,
      overall_rating: input.overallRating ?? null,
      review: input.review ?? null,
      would_make_again: input.wouldMakeAgain ?? null,
      tags: input.tags ?? [],
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !entry) return { error: error?.message ?? "Failed" };

  if (input.participantRatings?.length) {
    await supabase.from("meal_history_participants").insert(
      input.participantRatings.map((p) => ({
        meal_history_id: entry.id,
        household_id: householdId,
        user_id: p.userId,
        individual_rating: p.rating,
      })),
    );
  }

  if (input.recipeUpdate && recipeId) {
    await updateRecipeAsNewVersion(recipeId, input.recipeUpdate);
  }

  await enqueueNotification({
    householdId,
    eventType: "meal_review",
    dedupeKey: `meal_review:${entry.id}`,
    payload: { entryId: entry.id },
  });

  revalidatePath("/app/history");
  return { success: true, id: entry.id };
}
