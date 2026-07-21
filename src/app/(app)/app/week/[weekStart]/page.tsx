import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { WeekNavigator } from "@/components/week/week-navigator";
import { WeekActions } from "@/components/week/week-actions";
import { AddMealForm } from "@/components/week/add-meal-form";
import { MealCard } from "@/components/week/meal-card";
import { DayProfileForm } from "@/components/week/day-profile-form";
import { getWeekBundle } from "@/actions/plans";
import { PLAN_STATUSES } from "@/types/enums";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ weekStart: string }>;
}) {
  const { weekStart } = await params;
  const { plan, planDays, meals, members } = await getWeekBundle(weekStart);

  const memberOptions = members.map((m) => {
    const p = m.profiles;
    return {
      id: m.user_id,
      name: p?.display_name || p?.email || "Member",
    };
  });

  const nameById = Object.fromEntries(memberOptions.map((m) => [m.id, m.name]));
  const statusLabel =
    PLAN_STATUSES.find((s) => s.value === plan.status)?.label ?? plan.status;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-semibold">This week</h1>
          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        <WeekNavigator weekStart={weekStart} />
        <WeekActions planId={plan.id} status={plan.status} />
      </div>

      <div className="space-y-4">
        {planDays.map((day) => {
          const dayMeals = meals
            .filter((m) => m.plan_day_id === day.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const date = new Date(`${day.day_date}T12:00:00`);
          return (
            <section
              key={day.id}
              className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {format(date, "EEEE")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {format(date, "MMM d")}
                  </p>
                </div>
                <DayProfileForm day={day} />
              </div>
              <div className="space-y-2">
                {dayMeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No meals yet.</p>
                ) : (
                  dayMeals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      memberName={
                        meal.assigned_to_user_id
                          ? nameById[meal.assigned_to_user_id]
                          : null
                      }
                    />
                  ))
                )}
              </div>
              <div className="mt-3">
                <AddMealForm
                  planDayId={day.id}
                  weeklyPlanId={plan.id}
                  members={memberOptions}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
