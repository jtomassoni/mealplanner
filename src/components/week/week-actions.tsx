"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveWeeklyPlan, reopenWeeklyPlan } from "@/actions/plans";
import { generateGroceryList } from "@/actions/grocery";
import { suggestMealsForWeek } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import type { PlanStatus } from "@/types/database";

export function WeekActions({
  planId,
  status,
}: {
  planId: string;
  status: PlanStatus;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && (
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await approveWeeklyPlan(planId);
              if (r.error) toast.error(r.error);
              else toast.success("Week approved");
            })
          }
        >
          Approve week
        </Button>
      )}
      {(status === "approved" || status === "grocery_generated") && (
        <>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await generateGroceryList(planId);
                if (r.error === "edited_items") {
                  const ok = window.confirm(
                    `${r.message}\n\nOverwrite edited generated items? Manual additions are kept.`,
                  );
                  if (ok) {
                    const again = await generateGroceryList(planId, {
                      overwriteEdited: true,
                    });
                    if (again.error) toast.error(String(again.error));
                    else {
                      toast.success("Grocery list generated");
                      router.push(`/app/grocery/${again.listId}`);
                    }
                  }
                  return;
                }
                if (r.error) toast.error(String(r.error));
                else {
                  toast.success("Grocery list generated");
                  router.push(`/app/grocery/${r.listId}`);
                }
              })
            }
          >
            Generate grocery list
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await reopenWeeklyPlan(planId);
                if (r.error) toast.error(r.error);
                else toast.success("Week reopened as draft");
              })
            }
          >
            Reopen draft
          </Button>
        </>
      )}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const ok = window.confirm(
              "Use AI to suggest meals for open days? This will not auto-replace your plan.",
            );
            if (!ok) return;
            const r = await suggestMealsForWeek({
              weeklyPlanId: planId,
              mode: "open_days",
            });
            if (r.error) toast.error(r.error);
            else {
              toast.message("AI suggestions ready (preview)", {
                description: `${r.suggestions?.length ?? 0} ideas. Accept them individually from the console for now — open recipes/week to add manually.`,
              });
              console.info("AI meal suggestions", r.suggestions);
            }
          })
        }
      >
        Suggest meals (AI)
      </Button>
    </div>
  );
}
