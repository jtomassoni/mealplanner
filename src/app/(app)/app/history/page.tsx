import Link from "next/link";
import { listMealHistory } from "@/actions/history";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minRating?: string }>;
}) {
  const params = await searchParams;
  const entries = await listMealHistory({
    q: params.q,
    minRating: params.minRating ? Number(params.minRating) : undefined,
  });

  const thisWeekLastYear = entries.filter((e) => {
    const d = new Date(e.cooked_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && Math.abs(d.getDate() - now.getDate()) <= 7 && d.getFullYear() < now.getFullYear();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">History</h1>
        <Button asChild variant="secondary">
          <Link href="/app/history/new">Log a meal</Link>
        </Button>
      </div>
      <form className="flex gap-2">
        <Input name="q" defaultValue={params.q} placeholder="Search" className="min-h-11" />
        <Input name="minRating" type="number" min={1} max={5} defaultValue={params.minRating} placeholder="Min ★" className="min-h-11 w-24" />
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      {thisWeekLastYear.length > 0 && (
        <section className="rounded-xl border border-border bg-accent/40 p-3">
          <h2 className="font-display text-base font-semibold">Around this week in prior years</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {thisWeekLastYear.map((e) => (
              <li key={e.id}>
                <Link href={`/app/history/${e.id}`} className="underline">
                  {e.recipes?.title ?? "Meal"} · {new Date(e.cooked_at).getFullYear()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-2">
        {entries.map((entry) => {
          const title = entry.recipes?.title ?? "Meal";
          const photos = entry.meal_photos ?? [];
          return (
            <li key={entry.id}>
              <Link href={`/app/history/${entry.id}`} className="block rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.cooked_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {entry.overall_rating ? <Badge>{entry.overall_rating}★</Badge> : null}
                    {photos.length ? <Badge variant="outline">{photos.length} photo</Badge> : null}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
