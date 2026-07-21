"use server";

import { revalidatePath } from "next/cache";
import { requireHouseholdContext } from "@/lib/auth/session";

export async function updateProfile(input: {
  displayName?: string;
  dietaryRestrictions?: string[];
  ingredientDislikes?: string[];
  ingredientPreferences?: string[];
  favoriteCuisines?: string[];
  nutritionNotes?: string | null;
  portionMultiplier?: number;
}) {
  const { user, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      dietary_restrictions: input.dietaryRestrictions,
      ingredient_dislikes: input.ingredientDislikes,
      ingredient_preferences: input.ingredientPreferences,
      favorite_cuisines: input.favoriteCuisines,
      nutrition_notes: input.nutritionNotes,
      portion_multiplier: input.portionMultiplier,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app/settings/profile");
  return { success: true };
}

export async function updateNotificationPreferences(input: {
  emailEnabled: boolean;
  notifyMealsAdded: boolean;
  notifyPlanApproved: boolean;
  notifyGroceryGenerated: boolean;
  notifyGroceryChanged: boolean;
  notifyMealReview: boolean;
}) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        household_id: householdId,
        email_enabled: input.emailEnabled,
        notify_meals_added: input.notifyMealsAdded,
        notify_plan_approved: input.notifyPlanApproved,
        notify_grocery_generated: input.notifyGroceryGenerated,
        notify_grocery_changed: input.notifyGroceryChanged,
        notify_meal_review: input.notifyMealReview,
      },
      { onConflict: "user_id,household_id" },
    );
  if (error) return { error: error.message };
  revalidatePath("/app/settings/notifications");
  return { success: true };
}
