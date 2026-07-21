"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updatePlanDay } from "@/actions/plans";
import { DAY_PROFILES } from "@/types/enums";
import type { PlanDay } from "@/types/database";

export function DayProfileForm({ day }: { day: PlanDay }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2 text-xs"
      onChange={(e) => {
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const r = await updatePlanDay(day.id, {
            profileType: String(fd.get("profileType")) as never,
            needsPortableSnacks: fd.get("snacks") === "on",
            needsMealPrep: fd.get("prep") === "on",
            reheatOnly: fd.get("reheat") === "on",
          });
          if (r.error) toast.error(r.error);
        });
      }}
    >
      <select
        name="profileType"
        defaultValue={day.profile_type}
        disabled={pending}
        className="min-h-9 rounded-lg border border-input bg-background px-2"
        aria-label="Day profile"
      >
        {DAY_PROFILES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="snacks" defaultChecked={day.needs_portable_snacks} />
        Snacks
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="prep" defaultChecked={day.needs_meal_prep} />
        Prep
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="reheat" defaultChecked={day.reheat_only} />
        Reheat
      </label>
    </form>
  );
}
