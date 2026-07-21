import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addWeeks, formatWeekStart, getWeekStart, parseWeekStart } from "@/lib/week/dates";
import { format } from "date-fns";

export function WeekNavigator({ weekStart }: { weekStart: string }) {
  const start = parseWeekStart(weekStart);
  const prev = formatWeekStart(addWeeks(start, -1));
  const next = formatWeekStart(addWeeks(start, 1));
  const current = formatWeekStart(getWeekStart(new Date()));
  const end = addWeeks(start, 0);
  end.setDate(start.getDate() + 6);

  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/app/week/${prev}`} aria-label="Previous week">
          <ChevronLeft />
        </Link>
      </Button>
      <div className="text-center">
        <p className="font-display text-lg font-semibold">
          {format(start, "MMM d")} – {format(end, "MMM d")}
        </p>
        {weekStart !== current && (
          <Link href={`/app/week/${current}`} className="text-xs text-primary underline">
            Jump to this week
          </Link>
        )}
      </div>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/app/week/${next}`} aria-label="Next week">
          <ChevronRight />
        </Link>
      </Button>
    </div>
  );
}
