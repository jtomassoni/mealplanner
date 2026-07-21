"use server";

import { revalidatePath } from "next/cache";
import { requireHouseholdContext } from "@/lib/auth/session";
import {
  consolidateGroceryItems,
  type GroceryCandidate,
} from "@/lib/grocery/consolidate";
import { evaluateCostcoCandidate } from "@/lib/grocery/costco";
import { scaleIngredient } from "@/lib/grocery/scaling";
import { inferGrocerySection } from "@/lib/grocery/sections";
import { enqueueNotification } from "@/lib/notifications/notify";

const WORKDAY_SNACK_DEFAULTS: GroceryCandidate[] = [
  {
    name: "hummus",
    quantity: 1,
    unit: "container",
    section: "dairy",
    preferredStore: "any",
    costcoBulkCandidate: false,
    sourceNote: "Workday snack prep",
  },
  {
    name: "carrots",
    quantity: 1,
    unit: "bag",
    section: "produce",
    preferredStore: "any",
    costcoBulkCandidate: false,
    sourceNote: "Workday snack prep",
  },
  {
    name: "fruit",
    quantity: 1,
    unit: "bag",
    section: "produce",
    preferredStore: "any",
    costcoBulkCandidate: false,
    sourceNote: "Workday snack prep",
  },
  {
    name: "protein snacks",
    quantity: 1,
    unit: "pack",
    section: "snacks",
    preferredStore: "any",
    costcoBulkCandidate: true,
    sourceNote: "Workday snack prep",
  },
  {
    name: "portion containers",
    quantity: 1,
    unit: "pack",
    section: "household",
    preferredStore: "any",
    costcoBulkCandidate: false,
    sourceNote: "Workday snack prep",
  },
];

export async function generateGroceryList(
  weeklyPlanId: string,
  options?: { overwriteEdited?: boolean },
) {
  const { user, householdId, supabase } = await requireHouseholdContext();

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("id", weeklyPlanId)
    .eq("household_id", householdId)
    .single();

  if (!plan) return { error: "Plan not found" };
  if (plan.status !== "approved" && plan.status !== "grocery_generated") {
    return { error: "Approve the weekly plan before generating a grocery list." };
  }

  const { data: meals } = await supabase
    .from("planned_meals")
    .select("*")
    .eq("weekly_plan_id", weeklyPlanId);

  const { data: planDays } = await supabase
    .from("plan_days")
    .select("*")
    .eq("weekly_plan_id", weeklyPlanId);

  const { data: pantry } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("household_id", householdId)
    .eq("in_stock", true);

  const pantryNames = new Set(
    (pantry ?? []).map((p) => p.ingredient_name.trim().toLowerCase()),
  );

  const candidates: GroceryCandidate[] = [];
  const mealUseCounts = new Map<string, number>();

  for (const meal of meals ?? []) {
    if (!meal.recipe_version_id && !meal.recipe_id) {
      if (meal.meal_type === "snack_prep" || meal.notes) {
        candidates.push({
          name: meal.title,
          quantity: meal.servings ?? 1,
          unit: "item",
          section: inferGrocerySection(meal.title),
          preferredStore: "any",
          costcoBulkCandidate: false,
          sourceNote: `From ${meal.title}`,
          plannedMealId: meal.id,
        });
      }
      continue;
    }

    let versionId = meal.recipe_version_id;
    if (!versionId && meal.recipe_id) {
      const { data: current } = await supabase
        .from("recipe_versions")
        .select("id, default_servings")
        .eq("recipe_id", meal.recipe_id)
        .eq("is_current", true)
        .maybeSingle();
      versionId = current?.id ?? null;
    }
    if (!versionId) continue;

    const { data: version } = await supabase
      .from("recipe_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_version_id", versionId)
      .order("sort_order");

    const fromServings = version?.default_servings ?? 4;
    const toServings = meal.servings ?? fromServings;

    for (const ing of ingredients ?? []) {
      if (ing.optional) continue;
      const key = ing.ingredient_name.trim().toLowerCase();
      mealUseCounts.set(key, (mealUseCounts.get(key) ?? 0) + 1);

      candidates.push({
        name: ing.ingredient_name,
        quantity: scaleIngredient(ing.quantity, fromServings, toServings),
        unit: ing.unit ?? "item",
        section: ing.grocery_category ?? inferGrocerySection(ing.ingredient_name),
        preferredStore: ing.preferred_store ?? "any",
        costcoBulkCandidate: ing.costco_bulk_candidate,
        sourceNote: meal.title,
        plannedMealId: meal.id,
        recipeIngredientId: ing.id,
      });
    }
  }

  for (const day of planDays ?? []) {
    if (day.needs_portable_snacks || day.profile_type === "workday") {
      for (const snack of WORKDAY_SNACK_DEFAULTS) {
        candidates.push({ ...snack });
      }
    }
  }

  const consolidated = consolidateGroceryItems(candidates).map((item) => {
    const key = item.name.trim().toLowerCase();
    const mealCount = mealUseCounts.get(key) ?? 1;
    const evalResult = evaluateCostcoCandidate({
      ingredientName: item.name,
      normalizedName: key,
      mealCount,
      totalQuantity: item.quantity ?? 0,
      unit: item.unit,
      manualPreference: item.costcoBulkCandidate,
    });
    const owned = pantryNames.has(key);
    return {
      ...item,
      costcoBulkCandidate: evalResult.isCandidate,
      pantryStatus: owned ? ("owned" as const) : ("needed" as const),
      costcoReasons: evalResult.reasons,
    };
  });

  const { data: existingList } = await supabase
    .from("grocery_lists")
    .select("*")
    .eq("weekly_plan_id", weeklyPlanId)
    .eq("household_id", householdId)
    .eq("status", "active")
    .maybeSingle();

  let listId = existingList?.id;

  if (existingList) {
    const { data: existingItems } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("grocery_list_id", existingList.id);

    const manual = (existingItems ?? []).filter((i) => i.is_manual);
    const edited = (existingItems ?? []).filter(
      (i) => i.is_user_edited && !i.is_manual,
    );

    if (edited.length && !options?.overwriteEdited) {
      return {
        error: "edited_items",
        message:
          "Some generated items were edited. Confirm overwrite or keep edits.",
        listId: existingList.id,
        editedCount: edited.length,
      };
    }

    await supabase
      .from("grocery_items")
      .delete()
      .eq("grocery_list_id", existingList.id)
      .eq("is_manual", false);

    if (options?.overwriteEdited) {
      await supabase
        .from("grocery_items")
        .delete()
        .eq("grocery_list_id", existingList.id)
        .eq("is_user_edited", true)
        .eq("is_manual", false);
    }

    listId = existingList.id;

    // Preserve manuals — already kept since we only deleted non-manual
    void manual;
  } else {
    const { data: list, error } = await supabase
      .from("grocery_lists")
      .insert({
        household_id: householdId,
        weekly_plan_id: weeklyPlanId,
        status: "active",
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      })
      .select("*")
      .single();
    if (error || !list) return { error: error?.message ?? "List create failed" };
    listId = list.id;
  }

  await supabase
    .from("grocery_lists")
    .update({
      generated_at: new Date().toISOString(),
      generated_by: user.id,
    })
    .eq("id", listId!);

  const rows = consolidated.map((item, index) => {
    const store = (["king_soopers", "whole_foods", "costco", "any"] as const).includes(
      item.preferredStore as "king_soopers" | "whole_foods" | "costco" | "any",
    )
      ? (item.preferredStore as "king_soopers" | "whole_foods" | "costco" | "any")
      : ("any" as const);
    return {
      grocery_list_id: listId!,
      household_id: householdId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      section: item.section,
      preferred_store: store,
      costco_bulk_candidate: item.costcoBulkCandidate,
      pantry_status: item.pantryStatus,
      is_checked: false,
      notes: item.costcoReasons?.length
        ? `Costco suggestion: ${item.costcoReasons.join("; ")}`
        : item.sourceNote,
      is_manual: false,
      is_user_edited: false,
      sort_order: index,
    };
  });

  if (rows.length) {
    const { error } = await supabase.from("grocery_items").insert(rows);
    if (error) return { error: error.message };
  }

  await supabase
    .from("weekly_plans")
    .update({ status: "grocery_generated" })
    .eq("id", weeklyPlanId);

  await enqueueNotification({
    householdId,
    eventType: "grocery_generated",
    dedupeKey: `grocery_generated:${weeklyPlanId}:${listId}`,
    payload: { listId, planId: weeklyPlanId },
  });

  revalidatePath("/app/grocery");
  revalidatePath("/app/week");
  return { success: true, listId };
}

export async function toggleGroceryItem(itemId: string, checked: boolean) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("grocery_items")
    .update({
      is_checked: checked,
      checked_by: checked ? user.id : null,
      checked_at: checked ? new Date().toISOString() : null,
      pantry_status: checked ? "purchased" : "needed",
    })
    .eq("id", itemId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/app/grocery");
  return { success: true };
}

export async function addManualGroceryItem(input: {
  listId: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  section?: string | null;
}) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase.from("grocery_items").insert({
    grocery_list_id: input.listId,
    household_id: householdId,
    name: input.name,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    section: input.section ?? inferGrocerySection(input.name),
    preferred_store: "any",
    is_manual: true,
    pantry_status: "needed",
    sort_order: 9999,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/grocery");
  return { success: true };
}

export async function updateGroceryItem(
  itemId: string,
  patch: {
    name?: string;
    quantity?: number | null;
    unit?: string | null;
    section?: string | null;
    notes?: string | null;
    pantryStatus?: "needed" | "owned" | "purchased";
    preferredStore?: "king_soopers" | "whole_foods" | "costco" | "any";
  },
) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("grocery_items")
    .update({
      is_user_edited: true,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      ...(patch.section !== undefined ? { section: patch.section } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.pantryStatus !== undefined
        ? { pantry_status: patch.pantryStatus }
        : {}),
      ...(patch.preferredStore !== undefined
        ? { preferred_store: patch.preferredStore }
        : {}),
    })
    .eq("id", itemId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/app/grocery");
  return { success: true };
}

export async function deleteGroceryItem(itemId: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("grocery_items")
    .delete()
    .eq("id", itemId)
    .eq("household_id", householdId);
  if (error) return { error: error.message };
  revalidatePath("/app/grocery");
  return { success: true };
}
