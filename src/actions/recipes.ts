"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHouseholdContext } from "@/lib/auth/session";
import type { RecipeSourceType } from "@/types/database";
import { inferGrocerySection } from "@/lib/grocery/sections";

const ingredientSchema = z.object({
  rawText: z.string().optional(),
  ingredientName: z.string().min(1),
  quantity: z.coerce.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  preparationNote: z.string().nullable().optional(),
  optional: z.boolean().optional(),
  groceryCategory: z.string().nullable().optional(),
  preferredStore: z
    .enum(["king_soopers", "whole_foods", "costco", "any"])
    .nullable()
    .optional(),
  costcoBulkCandidate: z.boolean().optional(),
});

const stepSchema = z.object({
  instruction: z.string().min(1),
});

const recipeInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  sourceType: z.enum([
    "household",
    "family",
    "ai",
    "imported",
    "transcribed",
  ]),
  sourceName: z.string().nullable().optional(),
  cuisine: z.string().nullable().optional(),
  mealTypes: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  defaultServings: z.coerce.number().positive().optional(),
  prepTimeMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
  totalTimeMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
  equipment: z.array(z.string()).optional(),
  storageInstructions: z.string().nullable().optional(),
  reheatingInstructions: z.string().nullable().optional(),
  freezingSuitable: z.boolean().nullable().optional(),
  leftoverNotes: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  changeSummary: z.string().nullable().optional(),
  ingredients: z.array(ingredientSchema).default([]),
  steps: z.array(stepSchema).default([]),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

export async function listRecipes(query?: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  let q = supabase
    .from("recipes")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("title");

  if (query?.trim()) {
    q = q.ilike("title", `%${query.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findHouseholdRecipeByTitle(title: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data } = await supabase
    .from("recipes")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .ilike("title", title.trim())
    .limit(5);

  return data ?? [];
}

export async function getRecipeDetail(recipeId: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("household_id", householdId)
    .single();
  if (error || !recipe) return null;

  const { data: versions } = await supabase
    .from("recipe_versions")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("version_number", { ascending: false });

  const current = versions?.find((v) => v.is_current) ?? versions?.[0];
  let ingredients: import("@/types/database").RecipeIngredient[] = [];
  let steps: import("@/types/database").RecipeStep[] = [];

  if (current) {
    const { data: ings } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_version_id", current.id)
      .order("sort_order");
    const { data: stps } = await supabase
      .from("recipe_steps")
      .select("*")
      .eq("recipe_version_id", current.id)
      .order("step_number");
    ingredients = ings ?? [];
    steps = stps ?? [];
  }

  return { recipe, versions: versions ?? [], current, ingredients, steps };
}

async function insertVersionContent(
  supabase: Awaited<
    ReturnType<typeof requireHouseholdContext>
  >["supabase"],
  householdId: string,
  versionId: string,
  input: RecipeInput,
) {
  if (input.ingredients.length) {
    await supabase.from("recipe_ingredients").insert(
      input.ingredients.map((ing, index) => ({
        recipe_version_id: versionId,
        household_id: householdId,
        raw_text:
          ing.rawText ??
          [ing.quantity, ing.unit, ing.ingredientName]
            .filter(Boolean)
            .join(" "),
        ingredient_name: ing.ingredientName,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        preparation_note: ing.preparationNote ?? null,
        optional: ing.optional ?? false,
        grocery_category:
          ing.groceryCategory ?? inferGrocerySection(ing.ingredientName),
        preferred_store: ing.preferredStore ?? null,
        costco_bulk_candidate: ing.costcoBulkCandidate ?? false,
        sort_order: index,
      })),
    );
  }

  if (input.steps.length) {
    await supabase.from("recipe_steps").insert(
      input.steps.map((step, index) => ({
        recipe_version_id: versionId,
        household_id: householdId,
        step_number: index + 1,
        instruction: step.instruction,
      })),
    );
  }
}

export async function createRecipe(raw: RecipeInput) {
  const input = recipeInputSchema.parse(raw);
  const { user, householdId, supabase } = await requireHouseholdContext();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      household_id: householdId,
      title: input.title,
      description: input.description ?? null,
      source_type: input.sourceType as RecipeSourceType,
      source_name: input.sourceName ?? null,
      cuisine: input.cuisine ?? null,
      meal_types: input.mealTypes ?? [],
      dietary_tags: input.dietaryTags ?? [],
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !recipe) return { error: error?.message ?? "Create failed" };

  const { data: version, error: vError } = await supabase
    .from("recipe_versions")
    .insert({
      recipe_id: recipe.id,
      household_id: householdId,
      version_number: 1,
      is_current: true,
      change_summary: input.changeSummary ?? "Initial version",
      default_servings: input.defaultServings ?? 4,
      prep_time_minutes: input.prepTimeMinutes ?? null,
      cook_time_minutes: input.cookTimeMinutes ?? null,
      total_time_minutes: input.totalTimeMinutes ?? null,
      equipment: input.equipment ?? [],
      storage_instructions: input.storageInstructions ?? null,
      reheating_instructions: input.reheatingInstructions ?? null,
      freezing_suitable: input.freezingSuitable ?? null,
      leftover_notes: input.leftoverNotes ?? null,
      difficulty: input.difficulty ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (vError || !version) return { error: vError?.message ?? "Version failed" };

  await insertVersionContent(supabase, householdId, version.id, input);
  revalidatePath("/app/recipes");
  return { success: true, recipeId: recipe.id };
}

export async function updateRecipeAsNewVersion(
  recipeId: string,
  raw: RecipeInput,
) {
  const input = recipeInputSchema.parse(raw);
  const { user, householdId, supabase } = await requireHouseholdContext();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("household_id", householdId)
    .single();
  if (!recipe) return { error: "Recipe not found" };

  const { data: latest } = await supabase
    .from("recipe_versions")
    .select("version_number")
    .eq("recipe_id", recipeId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("recipe_versions")
    .update({ is_current: false })
    .eq("recipe_id", recipeId)
    .eq("is_current", true);

  const nextVersion = (latest?.version_number ?? 0) + 1;

  const { data: version, error: vError } = await supabase
    .from("recipe_versions")
    .insert({
      recipe_id: recipeId,
      household_id: householdId,
      version_number: nextVersion,
      is_current: true,
      change_summary: input.changeSummary ?? `Version ${nextVersion}`,
      default_servings: input.defaultServings ?? 4,
      prep_time_minutes: input.prepTimeMinutes ?? null,
      cook_time_minutes: input.cookTimeMinutes ?? null,
      total_time_minutes: input.totalTimeMinutes ?? null,
      equipment: input.equipment ?? [],
      storage_instructions: input.storageInstructions ?? null,
      reheating_instructions: input.reheatingInstructions ?? null,
      freezing_suitable: input.freezingSuitable ?? null,
      leftover_notes: input.leftoverNotes ?? null,
      difficulty: input.difficulty ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (vError || !version) return { error: vError?.message ?? "Version failed" };

  await supabase
    .from("recipes")
    .update({
      title: input.title,
      description: input.description ?? null,
      source_type: input.sourceType as RecipeSourceType,
      source_name: input.sourceName ?? null,
      cuisine: input.cuisine ?? null,
      meal_types: input.mealTypes ?? [],
      dietary_tags: input.dietaryTags ?? [],
    })
    .eq("id", recipeId);

  await insertVersionContent(supabase, householdId, version.id, input);
  revalidatePath("/app/recipes");
  revalidatePath(`/app/recipes/${recipeId}`);
  return { success: true, versionId: version.id };
}

export async function toggleFavorite(recipeId: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("is_favorite")
    .eq("id", recipeId)
    .eq("household_id", householdId)
    .single();
  if (!recipe) return { error: "Not found" };

  await supabase
    .from("recipes")
    .update({ is_favorite: !recipe.is_favorite })
    .eq("id", recipeId);

  revalidatePath("/app/recipes");
  return { success: true };
}
