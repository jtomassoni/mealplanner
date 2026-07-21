"use server";

import { revalidatePath } from "next/cache";
import { requireHouseholdContext } from "@/lib/auth/session";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadMealPhoto(formData: FormData) {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const entryId = String(formData.get("mealHistoryId") ?? "");
  const file = formData.get("file");
  const altText = String(formData.get("altText") ?? "Meal photo");

  if (!entryId || !(file instanceof File)) {
    return { error: "Missing photo or history entry." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Unsupported image type." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 8MB." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${householdId}/${entryId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("meal-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("meal_photos").insert({
    meal_history_id: entryId,
    household_id: householdId,
    storage_path: path,
    mime_type: file.type,
    file_size_bytes: file.size,
    alt_text: altText,
    uploaded_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/app/history");
  return { success: true, path };
}

export async function getSignedPhotoUrl(storagePath: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  if (!storagePath.startsWith(`${householdId}/`)) {
    return { error: "Unauthorized" };
  }
  const { data, error } = await supabase.storage
    .from("meal-photos")
    .createSignedUrl(storagePath, 60 * 30);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function deleteMealPhoto(photoId: string) {
  const { householdId, supabase } = await requireHouseholdContext();
  const { data: photo } = await supabase
    .from("meal_photos")
    .select("*")
    .eq("id", photoId)
    .eq("household_id", householdId)
    .single();
  if (!photo) return { error: "Not found" };

  await supabase.storage.from("meal-photos").remove([photo.storage_path]);
  if (photo.thumbnail_path) {
    await supabase.storage.from("meal-photos").remove([photo.thumbnail_path]);
  }
  await supabase.from("meal_photos").delete().eq("id", photoId);
  revalidatePath("/app/history");
  return { success: true };
}
