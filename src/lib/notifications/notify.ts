import { isEmailEnabled, getEnvSafe } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type NotifyInput = {
  householdId: string;
  eventType: string;
  dedupeKey: string;
  payload?: Record<string, unknown>;
};

/** Deduped notification event. Sends via Resend when configured; otherwise logs. */
export async function enqueueNotification(input: NotifyInput) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notification_events").insert({
      household_id: input.householdId,
      event_type: input.eventType,
      dedupe_key: input.dedupeKey,
      payload: (input.payload ?? {}) as import("@/types/database").Json,
    });

    // Unique violation = already notified
    if (error) {
      if (error.code === "23505") return { skipped: true };
      console.error("notification_events insert failed", error.message);
      return { error: error.message };
    }

    if (!isEmailEnabled()) {
      console.info("[notify:dev]", input.eventType, input.dedupeKey);
      return { logged: true };
    }

    await sendHouseholdEmail(input);
    await supabase
      .from("notification_events")
      .update({ sent_at: new Date().toISOString() })
      .eq("household_id", input.householdId)
      .eq("dedupe_key", input.dedupeKey);

    return { sent: true };
  } catch (err) {
    console.error("enqueueNotification failed", err);
    return { error: "notification failed" };
  }
}

async function sendHouseholdEmail(input: NotifyInput) {
  const env = getEnvSafe();
  if (!env?.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return;

  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select(
      "user_id, email_enabled, notify_meals_added, notify_plan_approved, notify_grocery_generated, notify_grocery_changed, notify_meal_review",
    )
    .eq("household_id", input.householdId)
    .eq("email_enabled", true);

  const flagMap: Record<string, string> = {
    meals_added: "notify_meals_added",
    plan_approved: "notify_plan_approved",
    grocery_generated: "notify_grocery_generated",
    grocery_changed: "notify_grocery_changed",
    meal_review: "notify_meal_review",
  };

  const flag = flagMap[input.eventType];
  const recipients = (prefs ?? []).filter((p) => {
    if (!flag) return true;
    return Boolean((p as Record<string, unknown>)[flag]);
  });

  if (!recipients.length) return;

  const userIds = recipients.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);
  const emailByUser = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);

  for (const row of recipients) {
    const email = emailByUser.get(row.user_id);
    if (!email) continue;

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: `Mealplan: ${input.eventType.replaceAll("_", " ")}`,
      text: `Household update: ${input.eventType}\n\nOpen ${env.APP_URL}/app/week`,
    });
  }
}
