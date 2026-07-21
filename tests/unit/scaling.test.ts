import { describe, expect, it } from "vitest";

import { scaleIngredient } from "@/lib/grocery/scaling";

describe("scaleIngredient", () => {
  it("scales quantity proportionally", () => {
    expect(scaleIngredient(2, 4, 8)).toBe(4);
    expect(scaleIngredient(1.5, 2, 6)).toBe(4.5);
  });

  it("returns same quantity when servings unchanged", () => {
    expect(scaleIngredient(3, 4, 4)).toBe(3);
  });

  it("returns null for null quantity", () => {
    expect(scaleIngredient(null, 4, 8)).toBeNull();
  });

  it("returns null for invalid serving counts", () => {
    expect(scaleIngredient(2, 0, 4)).toBeNull();
    expect(scaleIngredient(2, 4, -1)).toBeNull();
  });

  it("rounds to three decimal places", () => {
    expect(scaleIngredient(1, 3, 2)).toBe(0.667);
  });
});
