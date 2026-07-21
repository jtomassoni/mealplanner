"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addManualGroceryItem,
  deleteGroceryItem,
  toggleGroceryItem,
  updateGroceryItem,
} from "@/actions/grocery";
import { addGroceryItemToPantry } from "@/actions/pantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GROCERY_SECTIONS } from "@/lib/grocery/sections";
import { STORES } from "@/lib/grocery/stores";
import type { GroceryItem } from "@/types/database";
import { cn } from "@/lib/utils";

export function GroceryListClient({
  listId,
  items: initialItems,
}: {
  listId: string;
  items: GroceryItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [optimistic, setOptimistic] = useOptimistic(items);
  const [pending, start] = useTransition();
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [uncheckedOnly, setUncheckedOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<"section" | "store">("section");
  const [syncState, setSyncState] = useState<"saved" | "saving" | "error">("saved");

  const visible = useMemo(() => {
    return optimistic.filter((item) => {
      if (uncheckedOnly && item.is_checked) return false;
      if (storeFilter !== "all" && item.preferred_store !== storeFilter) return false;
      return true;
    });
  }, [optimistic, uncheckedOnly, storeFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, GroceryItem[]>();
    for (const item of visible) {
      const key =
        groupBy === "store"
          ? item.preferred_store || "any"
          : item.section || "other";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [visible, groupBy]);

  function patchLocal(id: string, patch: Partial<GroceryItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            "rounded-full px-2 py-1",
            syncState === "saved" && "bg-accent text-accent-foreground",
            syncState === "saving" && "bg-muted text-muted-foreground",
            syncState === "error" && "bg-destructive/10 text-destructive",
          )}
        >
          {syncState === "saved" ? "Synced" : syncState === "saving" ? "Saving…" : "Sync error"}
        </span>
        <select
          className="min-h-9 rounded-lg border border-input bg-background px-2"
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
        >
          <option value="all">All stores</option>
          {STORES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={uncheckedOnly}
            onChange={(e) => setUncheckedOnly(e.target.checked)}
          />
          Unchecked only
        </label>
        <select
          className="min-h-9 rounded-lg border border-input bg-background px-2"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as "section" | "store")}
        >
          <option value="section">Group by section</option>
          <option value="store">Group by store</option>
        </select>
      </div>

      {groups.map(([group, groupItems]) => {
        const label =
          groupBy === "store"
            ? STORES.find((s) => s.id === group)?.label ?? group
            : GROCERY_SECTIONS.find((s) => s.id === group)?.label ?? group;
        return (
          <section key={group} className="space-y-2">
            <h2 className="font-display text-lg font-semibold">{label}</h2>
            <ul className="space-y-2">
              {groupItems.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-stretch gap-3 rounded-xl border border-border bg-card p-2",
                    item.is_checked && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    aria-label={item.is_checked ? "Uncheck item" : "Check item"}
                    className={cn(
                      "min-h-14 min-w-14 shrink-0 rounded-xl border text-lg font-bold",
                      item.is_checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background",
                    )}
                    onClick={() => {
                      const next = !item.is_checked;
                      start(async () => {
                        setSyncState("saving");
                        setOptimistic(
                          items.map((i) =>
                            i.id === item.id ? { ...i, is_checked: next } : i,
                          ),
                        );
                        patchLocal(item.id, { is_checked: next });
                        const r = await toggleGroceryItem(item.id, next);
                        if (r.error) {
                          setSyncState("error");
                          toast.error(r.error);
                          patchLocal(item.id, { is_checked: !next });
                        } else setSyncState("saved");
                      });
                    }}
                  >
                    {item.is_checked ? "✓" : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", item.is_checked && "line-through")}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[item.quantity, item.unit].filter(Boolean).join(" ")}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.costco_bulk_candidate ? (
                        <Badge variant="secondary">Costco suggestion</Badge>
                      ) : null}
                      {item.pantry_status === "owned" ? (
                        <Badge variant="outline">Already owned</Badge>
                      ) : null}
                      {item.is_manual ? <Badge variant="outline">Manual</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await updateGroceryItem(item.id, { pantryStatus: "owned" });
                            patchLocal(item.id, { pantry_status: "owned" });
                          })
                        }
                      >
                        Mark owned
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await addGroceryItemToPantry(item.id);
                            toast.success("Added to pantry");
                          })
                        }
                      >
                        To pantry
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await deleteGroceryItem(item.id);
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get("name") ?? "").trim();
          if (!name) return;
          start(async () => {
            const r = await addManualGroceryItem({ listId, name });
            if (r.error) toast.error(r.error);
            else {
              toast.success("Item added");
              (e.target as HTMLFormElement).reset();
              window.location.reload();
            }
          });
        }}
      >
        <Input name="name" placeholder="Add item" className="min-h-12" />
        <Button type="submit" disabled={pending}>Add</Button>
      </form>
    </div>
  );
}
