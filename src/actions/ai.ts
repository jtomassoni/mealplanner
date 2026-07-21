"use server";

import { revalidatePath } from "next/cache";
import { requireHouseholdContext } from "@/lib/auth/session";
import { getAiProvider } from "@/lib/ai/provider";
import { createRecipe, findHouseholdRecipeByTitle } from "@/actions/recipes";
import { isAiEnabled } from "@/lib/env";

async function logAi(params: {
  householdId: string;
  userId: string;
  operationType: string;
  relatedPlanId?: string | null;
  relatedRecipeId?: string | null;
  model?: string | null;
  inputSummary: string;
  outputStatus: "success" | "error" | "validation_failed";
  tokenUsage?: unknown;
  errorDetails?: string | null;
}) {
  const { supabase } = await requireHouseholdContext();
  await supabase.from("ai_generations").insert({
    household_id: params.householdId,
    requested_by: params.userId,
    operation_type: params.operationType,
    related_plan_id: params.relatedPlanId ?? null,
    related_recipe_id: params.relatedRecipeId ?? null,
    model: params.model ?? null,
    input_summary: params.inputSummary,
    output_status: params.outputStatus,
    token_usage: (params.tokenUsage as never) ?? null,
    error_details: params.errorDetails ?? null,
  });
}

export async function generateRecipeForIdea(input: {
  mealIdea: string;
  servings?: number;
  notes?: string;
  save?: boolean;
}) {
  if (!isAiEnabled()) {
    return { error: "AI is not configured. Set OPENAI_API_KEY and ENABLE_AI_FEATURES=true." };
  }

  const { user, householdId, supabase } = await requireHouseholdContext();

  const matches = await findHouseholdRecipeByTitle(input.mealIdea);
  if (matches.length) {
    return {
      success: true,
      usedHouseholdRecipe: true,
      recipes: matches.map((m) => ({ id: m.id, title: m.title })),
      message: "Found matching household recipe(s). Household recipes take precedence over AI.",
    };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("display_name, dietary_restrictions, ingredient_dislikes, favorite_cuisines")
    .in(
      "id",
      (
        await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId)
          .eq("is_active", true)
      ).data?.map((m) => m.user_id) ?? [],
    );

  const prompt = [
    `Create a practical recipe for: ${input.mealIdea}`,
    `Servings: ${input.servings ?? 4}`,
    input.notes ? `Notes: ${input.notes}` : "",
    `Household profiles: ${JSON.stringify(profiles ?? [])}`,
    "Return JSON with title, description, cuisine, mealTypes, dietaryTags, defaultServings, times, equipment, storage/reheating, leftoverNotes, difficulty, ingredients[{ingredientName,quantity,unit,preparationNote,optional,groceryCategory}], steps[{instruction}].",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const provider = getAiProvider();
    const result = await provider.generateRecipe(prompt);
    await logAi({
      householdId,
      userId: user.id,
      operationType: "generate_recipe",
      model: result.model,
      inputSummary: input.mealIdea,
      outputStatus: "success",
      tokenUsage: result.usage,
    });

    if (input.save) {
      const saved = await createRecipe({
        title: result.data.title,
        description: result.data.description ?? null,
        sourceType: "ai",
        sourceName: result.model,
        cuisine: result.data.cuisine ?? null,
        mealTypes: result.data.mealTypes,
        dietaryTags: result.data.dietaryTags,
        defaultServings: result.data.defaultServings,
        prepTimeMinutes: result.data.prepTimeMinutes ?? null,
        cookTimeMinutes: result.data.cookTimeMinutes ?? null,
        totalTimeMinutes: result.data.totalTimeMinutes ?? null,
        equipment: result.data.equipment,
        storageInstructions: result.data.storageInstructions ?? null,
        reheatingInstructions: result.data.reheatingInstructions ?? null,
        freezingSuitable: result.data.freezingSuitable ?? null,
        leftoverNotes: result.data.leftoverNotes ?? null,
        difficulty: result.data.difficulty ?? null,
        ingredients: result.data.ingredients.map((i) => ({
          ingredientName: i.ingredientName,
          quantity: i.quantity ?? null,
          unit: i.unit ?? null,
          preparationNote: i.preparationNote ?? null,
          optional: i.optional ?? false,
          groceryCategory: i.groceryCategory ?? null,
        })),
        steps: result.data.steps,
      });
      revalidatePath("/app/recipes");
      return { success: true, recipe: result.data, saved };
    }

    return { success: true, recipe: result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    await logAi({
      householdId,
      userId: user.id,
      operationType: "generate_recipe",
      inputSummary: input.mealIdea,
      outputStatus: message.includes("validation") ? "validation_failed" : "error",
      errorDetails: message,
    });
    return { error: message };
  }
}

export async function suggestMealsForWeek(input: {
  weeklyPlanId: string;
  mode: "full_week" | "open_days" | "favorites" | "low_effort" | "use_pantry";
}) {
  if (!isAiEnabled()) {
    return { error: "AI is not configured." };
  }

  const { user, householdId, supabase } = await requireHouseholdContext();

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("id", input.weeklyPlanId)
    .eq("household_id", householdId)
    .single();
  if (!plan) return { error: "Plan not found" };

  const { data: days } = await supabase
    .from("plan_days")
    .select("*")
    .eq("weekly_plan_id", input.weeklyPlanId);
  const { data: meals } = await supabase
    .from("planned_meals")
    .select("plan_day_id, title, meal_type")
    .eq("weekly_plan_id", input.weeklyPlanId);
  const { data: favorites } = await supabase
    .from("recipes")
    .select("title, cuisine")
    .eq("household_id", householdId)
    .eq("is_favorite", true)
    .limit(20);
  const { data: historyRows } = await supabase
    .from("meal_history")
    .select("overall_rating, would_make_again, recipe_id")
    .eq("household_id", householdId)
    .order("cooked_at", { ascending: false })
    .limit(30);
  const historyRecipeIds = [
    ...new Set((historyRows ?? []).map((h) => h.recipe_id).filter(Boolean)),
  ] as string[];
  const { data: historyRecipes } = historyRecipeIds.length
    ? await supabase.from("recipes").select("id, title").in("id", historyRecipeIds)
    : { data: [] as { id: string; title: string }[] };
  const historyTitleMap = new Map((historyRecipes ?? []).map((r) => [r.id, r.title]));
  const history = (historyRows ?? []).map((h) => ({
    ...h,
    recipes: h.recipe_id
      ? { title: historyTitleMap.get(h.recipe_id) ?? null }
      : null,
  }));
  const { data: pantry } = await supabase
    .from("pantry_items")
    .select("ingredient_name")
    .eq("household_id", householdId)
    .eq("in_stock", true);

  const prompt = JSON.stringify({
    mode: input.mode,
    weekStart: plan.week_start,
    days,
    existingMeals: meals,
    favorites,
    recentHistory: history,
    pantry,
    instruction:
      "Return JSON { suggestions: [{ dayDate, title, mealType, assignedTo, servings, notes, rationale }] }. Preview only — do not claim the plan was changed.",
  });

  try {
    const provider = getAiProvider();
    const result = await provider.suggestMeals(prompt);
    await logAi({
      householdId,
      userId: user.id,
      operationType: `suggest_meals_${input.mode}`,
      relatedPlanId: input.weeklyPlanId,
      model: result.model,
      inputSummary: input.mode,
      outputStatus: "success",
      tokenUsage: result.usage,
    });
    return { success: true, suggestions: result.data.suggestions };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    await logAi({
      householdId,
      userId: user.id,
      operationType: `suggest_meals_${input.mode}`,
      relatedPlanId: input.weeklyPlanId,
      inputSummary: input.mode,
      outputStatus: "error",
      errorDetails: message,
    });
    return { error: message };
  }
}
