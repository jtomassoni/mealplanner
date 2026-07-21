"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addPlannedMeal } from "@/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEAL_TYPES } from "@/types/enums";

export function AddMealForm({
  planDayId,
  weeklyPlanId,
  members,
}: {
  planDayId: string;
  weeklyPlanId: string;
  members: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        Add meal
      </Button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const assigned = String(fd.get("assigned") ?? "both");
        start(async () => {
          const result = await addPlannedMeal({
            planDayId,
            weeklyPlanId,
            title: String(fd.get("title") ?? ""),
            mealType: String(fd.get("mealType") ?? "dinner") as never,
            assignedTo: assigned === "both" ? "both" : "specific",
            assignedToUserId: assigned === "both" ? null : assigned,
            servings: Number(fd.get("servings") || 2),
            notes: String(fd.get("notes") || "") || null,
            isLeftovers: fd.get("leftovers") === "on",
          });
          if (result.error) toast.error(result.error);
          else {
            toast.success("Meal added");
            setOpen(false);
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`title-${planDayId}`}>Meal</Label>
        <Input id={`title-${planDayId}`} name="title" required placeholder="Chicken Alfredo" className="min-h-11" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Type</Label>
          <select name="mealType" className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            {MEAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>For</Label>
          <select name="assigned" className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="both">Both</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Servings</Label>
        <Input name="servings" type="number" min={1} step={0.5} defaultValue={2} className="min-h-11" />
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Input name="notes" placeholder="Optional" className="min-h-11" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="leftovers" className="size-4" />
        Leftovers
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
