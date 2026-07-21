"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHouseholdContext } from "@/lib/auth/session";
import {
  formatWeekStart,
  getWeekDays,
  parseWeekStart,
} from "@/lib/week/dates";
import type { DayProfileType, MealType } from "@/types/database";
import { enqueueNotification } from "@/lib/notifications/notify";

const mealSchema = z.object({
  planDayId: z.string().uuid(),
  weeklyPlanId: z.string().uuid(),
  title: z.string().min(1).max(200),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack_prep", "other"]),
  assignedTo: z.enum(["both", "specific"]).default("both"),
  assignedToUserId: z.string().uuid().nullable().optional(),
  servings: z.coerce.number().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isLeftovers: z.boolean().optional(),
  leftoverFromMealId: z.string().uuid().nullable().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  recipeVersionId: z.string().uuid().nullable().optional(),
});

export async function ensureWeeklyPlan(weekStart: string) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const start = formatWeekStart(parseWeekStart(weekStart));

  const { data: existing } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("household_id", householdId)
    .eq("week_start", start)
    .maybeSingle();

  if (existing) {
    await ensurePlanDays(existing.id, householdId, start);
    return existing;
  }

  const { data: plan, error } = await supabase
    .from("weekly_plans")
    .insert({
      household_id: householdId,
      week_start: start,
      status: "draft",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !plan) {
    throw new Error(error?.message ?? "Failed to create weekly plan");
  }

  await ensurePlanDays(plan.id, householdId, start);
  return plan;
}

async function ensurePlanDays(
  weeklyPlanId: string,
  householdId: string,
  weekStart: string,
) {
  const { supabase } = await requireHouseholdContext();
  const days = getWeekDays(parseWeekStart(weekStart));

  const { data: existingDays } = await supabase
    .from("plan_days")
    .select("day_date")
    .eq("weekly_plan_id", weeklyPlanId);

  const have = new Set((existingDays ?? []).map((d) => d.day_date));
  const rows = days
    .map((d, index) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return {
        weekly_plan_id: weeklyPlanId,
        household_id: householdId,
        day_date: `${y}-${m}-${day}`,
        sort_order: index,
        profile_type: "normal" as const,
      };
    })
    .filter((row) => !have.has(row.day_date));

  if (rows.length) {
    await supabase.from("plan_days").insert(rows);
  }
}

export async function getWeekBundle(weekStart: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const plan = await ensureWeeklyPlan(weekStart);

  const { data: planDays } = await supabase
    .from("plan_days")
    .select("*")
    .eq("weekly_plan_id", plan.id)
    .order("sort_order");

  const { data: meals } = await supabase
    .from("planned_meals")
    .select("*")
    .eq("weekly_plan_id", plan.id)
    .order("sort_order");

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .eq("is_active", true);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", memberIds)
    : { data: [] as { id: string; display_name: string | null; email: string | null }[] };

  return {
    plan,
    planDays: planDays ?? [],
    meals: meals ?? [],
    members: (profiles ?? []).map((p) => ({
      user_id: p.id,
      profiles: p,
    })),
  };
}

export async function addPlannedMeal(input: z.infer<typeof mealSchema>) {
  const parsed = mealSchema.parse(input);
  const { user, householdId, supabase } = await requireHouseholdContext();

  const { data: maxSort } = await supabase
    .from("planned_meals")
    .select("sort_order")
    .eq("plan_day_id", parsed.planDayId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const assignedTo = parsed.assignedTo;
  const assignedToUserId =
    assignedTo === "specific" ? (parsed.assignedToUserId ?? null) : null;

  const { error } = await supabase.from("planned_meals").insert({
    plan_day_id: parsed.planDayId,
    weekly_plan_id: parsed.weeklyPlanId,
    household_id: householdId,
    title: parsed.title,
    meal_type: parsed.mealType as MealType,
    assigned_to: assignedTo,
    assigned_to_user_id: assignedToUserId,
    servings: parsed.servings ?? null,
    notes: parsed.notes ?? null,
    is_leftovers: parsed.isLeftovers ?? false,
    leftover_from_meal_id: parsed.leftoverFromMealId ?? null,
    recipe_id: parsed.recipeId ?? null,
    recipe_version_id: parsed.recipeVersionId ?? null,
    sort_order: (maxSort?.sort_order ?? 0) + 1,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  await enqueueNotification({
    householdId,
    eventType: "meals_added",
    dedupeKey: `meals_added:${parsed.weeklyPlanId}:${new Date().toISOString().slice(0, 13)}`,
    payload: { weekPlanId: parsed.weeklyPlanId, by: user.id },
  });

  revalidatePath("/app/week");
  return { success: true };
}

export async function updatePlannedMeal(
  mealId: string,
  patch: Partial<z.infer<typeof mealSchema>> & {
    sortOrder?: number;
    planDayId?: string;
  },
) {
  const { householdId, supabase } = await requireHouseholdContext();

  const update: {
    title?: string;
    meal_type?: MealType;
    assigned_to?: "both" | "specific";
    assigned_to_user_id?: string | null;
    servings?: number | null;
    notes?: string | null;
    is_leftovers?: boolean;
    recipe_id?: string | null;
    recipe_version_id?: string | null;
    sort_order?: number;
    plan_day_id?: string;
  } = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.mealType !== undefined) update.meal_type = patch.mealType;
  if (patch.assignedTo !== undefined) {
    update.assigned_to = patch.assignedTo;
    update.assigned_to_user_id =
      patch.assignedTo === "specific" ? patch.assignedToUserId ?? null : null;
  }
  if (patch.servings !== undefined) update.servings = patch.servings;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.isLeftovers !== undefined) update.is_leftovers = patch.isLeftovers;
  if (patch.recipeId !== undefined) update.recipe_id = patch.recipeId;
  if (patch.recipeVersionId !== undefined)
    update.recipe_version_id = patch.recipeVersionId;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (patch.planDayId !== undefined) update.plan_day_id = patch.planDayId;

  const { error } = await supabase
    .from("planned_meals")
    .update(update)
    .eq("id", mealId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/app/week");
  return { success: true };
}

export async function deletePlannedMeal(mealId: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("planned_meals")
    .delete()
    .eq("id", mealId)
    .eq("household_id", householdId);
  if (error) return { error: error.message };
  revalidatePath("/app/week");
  return { success: true };
}

export async function duplicatePlannedMeal(mealId: string) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const { data: meal } = await supabase
    .from("planned_meals")
    .select("*")
    .eq("id", mealId)
    .eq("household_id", householdId)
    .single();
  if (!meal) return { error: "Meal not found" };

  const { error } = await supabase.from("planned_meals").insert({
    plan_day_id: meal.plan_day_id,
    weekly_plan_id: meal.weekly_plan_id,
    household_id: householdId,
    meal_type: meal.meal_type,
    assigned_to: meal.assigned_to,
    assigned_to_user_id: meal.assigned_to_user_id,
    title: `${meal.title} (copy)`,
    recipe_id: meal.recipe_id,
    recipe_version_id: meal.recipe_version_id,
    servings: meal.servings,
    notes: meal.notes,
    is_leftovers: meal.is_leftovers,
    leftover_from_meal_id: meal.leftover_from_meal_id,
    sort_order: meal.sort_order + 1,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/week");
  return { success: true };
}

export async function updatePlanDay(
  planDayId: string,
  input: {
    profileType?: DayProfileType;
    appliesTo?: "both" | "specific";
    appliesToUserId?: string | null;
    maxActiveCookMinutes?: number | null;
    maxTotalCookMinutes?: number | null;
    needsMealPrep?: boolean;
    needsPortableSnacks?: boolean;
    reheatOnly?: boolean;
    notes?: string | null;
  },
) {
  const { householdId, supabase } = await requireHouseholdContext();
  const update: {
    profile_type?: DayProfileType;
    applies_to?: "both" | "specific";
    applies_to_user_id?: string | null;
    max_active_cook_minutes?: number | null;
    max_total_cook_minutes?: number | null;
    needs_meal_prep?: boolean;
    needs_portable_snacks?: boolean;
    reheat_only?: boolean;
    notes?: string | null;
  } = {};
  if (input.profileType !== undefined) update.profile_type = input.profileType;
  if (input.appliesTo !== undefined) {
    update.applies_to = input.appliesTo;
    update.applies_to_user_id =
      input.appliesTo === "specific" ? input.appliesToUserId ?? null : null;
  }
  if (input.maxActiveCookMinutes !== undefined)
    update.max_active_cook_minutes = input.maxActiveCookMinutes;
  if (input.maxTotalCookMinutes !== undefined)
    update.max_total_cook_minutes = input.maxTotalCookMinutes;
  if (input.needsMealPrep !== undefined)
    update.needs_meal_prep = input.needsMealPrep;
  if (input.needsPortableSnacks !== undefined)
    update.needs_portable_snacks = input.needsPortableSnacks;
  if (input.reheatOnly !== undefined) update.reheat_only = input.reheatOnly;
  if (input.notes !== undefined) update.notes = input.notes;

  const { error } = await supabase
    .from("plan_days")
    .update(update)
    .eq("id", planDayId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/app/week");
  return { success: true };
}

export async function approveWeeklyPlan(planId: string) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("id", planId)
    .eq("household_id", householdId)
    .single();

  if (!plan) return { error: "Plan not found" };
  if (plan.status !== "draft" && plan.status !== "approved") {
    return { error: `Cannot approve plan in status ${plan.status}` };
  }

  const { error } = await supabase
    .from("weekly_plans")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", planId);

  if (error) return { error: error.message };

  await enqueueNotification({
    householdId,
    eventType: "plan_approved",
    dedupeKey: `plan_approved:${planId}`,
    payload: { planId, by: user.id },
  });

  revalidatePath("/app/week");
  return { success: true };
}

export async function reopenWeeklyPlan(planId: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("weekly_plans")
    .update({
      status: "draft",
      approved_at: null,
      approved_by: null,
    })
    .eq("id", planId)
    .eq("household_id", householdId)
    .in("status", ["approved", "grocery_generated"]);

  if (error) return { error: error.message };
  revalidatePath("/app/week");
  return { success: true };
}
