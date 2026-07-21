import {
  areUnitsCompatible,
  convertQuantity,
  normalizeUnit,
} from "@/lib/grocery/units";

export interface GroceryCandidate {
  name: string;
  quantity: number | null;
  unit: string;
  section: string;
  preferredStore: string;
  costcoBulkCandidate: boolean;
  sourceNote: string;
  plannedMealId?: string;
  recipeIngredientId?: string;
}

const IRREGULAR_PLURALS: Record<string, string> = {
  leaves: "leaf",
  halves: "half",
  potatoes: "potato",
  tomatoes: "tomato",
  heroes: "hero",
};

export function normalizeIngredientName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");

  if (IRREGULAR_PLURALS[normalized]) {
    return IRREGULAR_PLURALS[normalized];
  }

  const words = normalized.split(" ");
  const lastWord = words[words.length - 1];

  if (lastWord.endsWith("ies") && lastWord.length > 4) {
    words[words.length - 1] = `${lastWord.slice(0, -3)}y`;
  } else if (
    lastWord.endsWith("es") &&
    (lastWord.endsWith("ches") ||
      lastWord.endsWith("shes") ||
      lastWord.endsWith("xes") ||
      lastWord.endsWith("zes"))
  ) {
    words[words.length - 1] = lastWord.slice(0, -2);
  } else if (lastWord.endsWith("s") && !lastWord.endsWith("ss") && lastWord.length > 3) {
    words[words.length - 1] = lastWord.slice(0, -1);
  }

  return words.join(" ");
}

function mergeSourceNotes(existing: string, incoming: string): string {
  if (!existing) {
    return incoming;
  }
  if (!incoming || existing.includes(incoming)) {
    return existing;
  }
  return `${existing}; ${incoming}`;
}

function mergeItem(
  base: GroceryCandidate,
  incoming: GroceryCandidate,
): GroceryCandidate {
  const baseUnit = normalizeUnit(base.unit);
  const incomingUnit = normalizeUnit(incoming.unit);

  let mergedQuantity: number | null = null;

  if (base.quantity !== null && incoming.quantity !== null) {
    const converted = convertQuantity(
      incoming.quantity,
      incomingUnit,
      baseUnit,
    );
    if (converted !== null) {
      mergedQuantity = base.quantity + converted;
    } else {
      mergedQuantity = base.quantity + incoming.quantity;
    }
  } else if (base.quantity !== null) {
    mergedQuantity = base.quantity;
  } else {
    mergedQuantity = incoming.quantity;
  }

  return {
    ...base,
    quantity: mergedQuantity,
    unit: baseUnit || base.unit,
    section: base.section || incoming.section,
    preferredStore:
      base.preferredStore === "any" ? incoming.preferredStore : base.preferredStore,
    costcoBulkCandidate:
      base.costcoBulkCandidate || incoming.costcoBulkCandidate,
    sourceNote: mergeSourceNotes(base.sourceNote, incoming.sourceNote),
  };
}

export function consolidateGroceryItems(
  items: GroceryCandidate[],
): GroceryCandidate[] {
  const groups = new Map<string, GroceryCandidate[]>();

  for (const item of items) {
    const normalizedName = normalizeIngredientName(item.name);
    const normalizedUnit = normalizeUnit(item.unit);
    const key = `${normalizedName}::${normalizedUnit}`;
    const existing = groups.get(key);

    if (existing) {
      existing.push(item);
      continue;
    }

    const compatibleKey = [...groups.keys()].find((candidateKey) => {
      const [candidateName, candidateUnit] = candidateKey.split("::");
      return (
        candidateName === normalizedName &&
        areUnitsCompatible(candidateUnit, normalizedUnit)
      );
    });

    if (compatibleKey) {
      groups.get(compatibleKey)!.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const consolidated: GroceryCandidate[] = [];

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.name.localeCompare(b.name));
    let merged = {
      ...sorted[0],
      name: normalizeIngredientName(sorted[0].name),
      unit: normalizeUnit(sorted[0].unit),
    };

    for (let i = 1; i < sorted.length; i++) {
      merged = mergeItem(merged, sorted[i]);
    }

    consolidated.push(merged);
  }

  return consolidated.sort((a, b) => a.name.localeCompare(b.name));
}
