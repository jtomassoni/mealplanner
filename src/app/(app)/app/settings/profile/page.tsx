import { getCurrentProfile } from "@/lib/auth/session";
import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function ProfileSettingsPage() {
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Profile</h1>
      <form
        action={async (fd) => {
          "use server";
          const split = (v: FormDataEntryValue | null) =>
            String(v ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          await updateProfile({
            displayName: String(fd.get("displayName") ?? ""),
            dietaryRestrictions: split(fd.get("dietary")),
            ingredientDislikes: split(fd.get("dislikes")),
            ingredientPreferences: split(fd.get("prefs")),
            favoriteCuisines: split(fd.get("cuisines")),
            nutritionNotes: String(fd.get("notes") || "") || null,
            portionMultiplier: Number(fd.get("portion") || 1),
          });
        }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label>Display name</Label>
          <Input name="displayName" defaultValue={profile?.display_name ?? ""} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Dietary restrictions (comma-separated)</Label>
          <Input name="dietary" defaultValue={(profile?.dietary_restrictions ?? []).join(", ")} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Dislikes</Label>
          <Input name="dislikes" defaultValue={(profile?.ingredient_dislikes ?? []).join(", ")} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Preferences</Label>
          <Input name="prefs" defaultValue={(profile?.ingredient_preferences ?? []).join(", ")} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Favorite cuisines</Label>
          <Input name="cuisines" defaultValue={(profile?.favorite_cuisines ?? []).join(", ")} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Portion multiplier</Label>
          <Input name="portion" type="number" step="0.1" min="0.1" defaultValue={profile?.portion_multiplier ?? 1} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label>Nutrition notes</Label>
          <Textarea name="notes" defaultValue={profile?.nutrition_notes ?? ""} />
        </div>
        <Button type="submit" className="w-full">Save profile</Button>
      </form>
    </div>
  );
}
