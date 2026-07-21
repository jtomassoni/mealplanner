"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deletePlannedMeal, duplicatePlannedMeal } from "@/actions/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlannedMeal } from "@/types/database";

export function MealCard({
  meal,
  memberName,
}: {
  meal: PlannedMeal;
  memberName?: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium leading-tight">{meal.title}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="secondary">{meal.meal_type.replace("_", " ")}</Badge>
            <Badge variant="outline">
              {meal.assigned_to === "both" ? "Both" : memberName ?? "One person"}
            </Badge>
            {meal.is_leftovers && <Badge>Leftovers</Badge>}
            {meal.servings ? <Badge variant="outline">{meal.servings} srv</Badge> : null}
          </div>
          {meal.notes ? (
            <p className="mt-1 text-xs text-muted-foreground">{meal.notes}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await duplicatePlannedMeal(meal.id);
              if (r.error) toast.error(r.error);
            })
          }
        >
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await deletePlannedMeal(meal.id);
              if (r.error) toast.error(r.error);
            })
          }
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
