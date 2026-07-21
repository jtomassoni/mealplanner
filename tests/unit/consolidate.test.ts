import { describe, expect, it } from "vitest";

import {
  consolidateGroceryItems,
  normalizeIngredientName,
  type GroceryCandidate,
} from "@/lib/grocery/consolidate";

function makeItem(
  overrides: Partial<GroceryCandidate> & Pick<GroceryCandidate, "name">,
): GroceryCandidate {
  return {
    quantity: 1,
    unit: "cup",
    section: "pantry",
    preferredStore: "any",
    costcoBulkCandidate: false,
    sourceNote: "",
    ...overrides,
  };
}

describe("normalizeIngredientName", () => {
  it("lowercases and trims", () => {
    expect(normalizeIngredientName("  Tomatoes  ")).toBe("tomato");
  });

  it("singularizes basic plurals", () => {
    expect(normalizeIngredientName("onions")).toBe("onion");
    expect(normalizeIngredientName("bell peppers")).toBe("bell pepper");
    expect(normalizeIngredientName("cherries")).toBe("cherry");
  });

  it("handles irregular plurals", () => {
    expect(normalizeIngredientName("potatoes")).toBe("potato");
    expect(normalizeIngredientName("leaves")).toBe("leaf");
  });
});

describe("consolidateGroceryItems", () => {
  it("merges items with same normalized name and unit", () => {
    const items = [
      makeItem({ name: "Onions", quantity: 2, unit: "whole", sourceNote: "Meal A" }),
      makeItem({ name: "onion", quantity: 3, unit: "whole", sourceNote: "Meal B" }),
    ];

    const result = consolidateGroceryItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("onion");
    expect(result[0].quantity).toBe(5);
    expect(result[0].sourceNote).toContain("Meal A");
    expect(result[0].sourceNote).toContain("Meal B");
  });

  it("merges compatible units and sums converted quantities", () => {
    const items = [
      makeItem({ name: "olive oil", quantity: 1, unit: "cup" }),
      makeItem({ name: "Olive Oil", quantity: 3, unit: "tbsp" }),
    ];

    const result = consolidateGroceryItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBeCloseTo(1.1875, 4);
    expect(result[0].unit).toBe("cup");
  });

  it("keeps incompatible units separate", () => {
    const items = [
      makeItem({ name: "garlic", quantity: 2, unit: "clove" }),
      makeItem({ name: "garlic", quantity: 1, unit: "can" }),
    ];

    const result = consolidateGroceryItems(items);
    expect(result).toHaveLength(2);
  });

  it("preserves costco bulk flag when any item has it", () => {
    const items = [
      makeItem({ name: "rice", quantity: 2, unit: "cup", costcoBulkCandidate: false }),
      makeItem({ name: "rice", quantity: 1, unit: "cup", costcoBulkCandidate: true }),
    ];

    const result = consolidateGroceryItems(items);
    expect(result[0].costcoBulkCandidate).toBe(true);
  });
});
