import { requireHouseholdContext } from "@/lib/auth/session";
import { updateNotificationPreferences } from "@/actions/profile";
import { Button } from "@/components/ui/button";

export default async function NotificationSettingsPage() {
  const { user, householdId, supabase } = await requireHouseholdContext();
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .eq("household_id", householdId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Notifications</h1>
      <p className="text-sm text-muted-foreground">
        Email notifications are off by default and only send when Resend is configured.
      </p>
      <form
        action={async (fd) => {
          "use server";
          await updateNotificationPreferences({
            emailEnabled: fd.get("emailEnabled") === "on",
            notifyMealsAdded: fd.get("notifyMealsAdded") === "on",
            notifyPlanApproved: fd.get("notifyPlanApproved") === "on",
            notifyGroceryGenerated: fd.get("notifyGroceryGenerated") === "on",
            notifyGroceryChanged: fd.get("notifyGroceryChanged") === "on",
            notifyMealReview: fd.get("notifyMealReview") === "on",
          });
        }}
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        {[
          ["emailEnabled", "Enable email notifications", prefs?.email_enabled],
          ["notifyMealsAdded", "Meals added to the week", prefs?.notify_meals_added ?? true],
          ["notifyPlanApproved", "Plan approved", prefs?.notify_plan_approved ?? true],
          ["notifyGroceryGenerated", "Grocery list generated", prefs?.notify_grocery_generated ?? true],
          ["notifyGroceryChanged", "Grocery list changed", prefs?.notify_grocery_changed ?? true],
          ["notifyMealReview", "Meal review or photo added", prefs?.notify_meal_review ?? true],
        ].map(([name, label, checked]) => (
          <label key={String(name)} className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="size-5" />
            {label}
          </label>
        ))}
        <Button type="submit" className="w-full">Save preferences</Button>
      </form>
    </div>
  );
}
