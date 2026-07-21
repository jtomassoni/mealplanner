"use server";

import { revalidatePath } from "next/cache";
import { requireHouseholdContext } from "@/lib/auth/session";

export async function listPantry() {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data, error } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("household_id", householdId)
    .order("ingredient_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertPantryItem(input: {
  id?: string;
  ingredientName: string;
  quantity?: number | null;
  unit?: string | null;
  inStock?: boolean;
  isLow?: boolean;
  isStaple?: boolean;
  expirationDate?: string | null;
  notes?: string | null;
}) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  if (input.id) {
    const { error } = await supabase
      .from("pantry_items")
      .update({
        ingredient_name: input.ingredientName,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        in_stock: input.inStock ?? true,
        is_low: input.isLow ?? false,
        is_staple: input.isStaple ?? false,
        expiration_date: input.expirationDate ?? null,
        notes: input.notes ?? null,
        updated_by: user.id,
      })
      .eq("id", input.id)
      .eq("household_id", householdId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pantry_items").insert({
      household_id: householdId,
      ingredient_name: input.ingredientName,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      in_stock: input.inStock ?? true,
      is_low: input.isLow ?? false,
      is_staple: input.isStaple ?? false,
      expiration_date: input.expirationDate ?? null,
      notes: input.notes ?? null,
      updated_by: user.id,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/app/pantry");
  return { success: true };
}

export async function deletePantryItem(id: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { error } = await supabase
    .from("pantry_items")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: error.message };
  revalidatePath("/app/pantry");
  return { success: true };
}

export async function addGroceryItemToPantry(groceryItemId: string) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const { data: item } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("id", groceryItemId)
    .eq("household_id", householdId)
    .single();
  if (!item) return { error: "Item not found" };

  await supabase.from("pantry_items").insert({
    household_id: householdId,
    ingredient_name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    in_stock: true,
    preferred_store: item.preferred_store,
    updated_by: user.id,
  });

  await supabase
    .from("grocery_items")
    .update({ pantry_status: "owned" })
    .eq("id", groceryItemId);

  revalidatePath("/app/pantry");
  revalidatePath("/app/grocery");
  return { success: true };
}
