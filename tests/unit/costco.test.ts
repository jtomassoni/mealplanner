import { describe, expect, it } from "vitest";

import {
  evaluateCostcoCandidate,
  PROTEIN_KEYWORDS,
  STAPLE_NAMES,
} from "@/lib/grocery/costco";

describe("exports", () => {
  it("exports staple names and protein keywords", () => {
    expect(STAPLE_NAMES).toContain("rice");
    expect(STAPLE_NAMES).toContain("olive oil");
    expect(PROTEIN_KEYWORDS).toContain("chicken");
    expect(PROTEIN_KEYWORDS).toContain("salmon");
  });
});

describe("evaluateCostcoCandidate", () => {
  it("flags manual preference", () => {
    const result = evaluateCostcoCandidate({
      ingredientName: "special spice",
      normalizedName: "special spice",
      mealCount: 1,
      totalQuantity: 1,
      unit: "tsp",
      manualPreference: true,
    });

    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain("Marked as Costco bulk preference");
  });

  it("flags use across three or more meals", () => {
    const result = evaluateCostcoCandidate({
      ingredientName: "bell pepper",
      normalizedName: "bell pepper",
      mealCount: 3,
      totalQuantity: 2,
      unit: "whole",
    });

    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain("Used across 3 meals");
  });

  it("flags large total quantities", () => {
    const result = evaluateCostcoCandidate({
      ingredientName: "flour",
      normalizedName: "flour",
      mealCount: 1,
      totalQuantity: 8,
      unit: "cup",
    });

    expect(result.isCandidate).toBe(true);
    expect(result.reasons.some((r) => r.includes("Large total quantity"))).toBe(
      true,
    );
  });

  it("flags freezer-friendly proteins", () => {
    const result = evaluateCostcoCandidate({
      ingredientName: "chicken breast",
      normalizedName: "chicken breast",
      mealCount: 1,
      totalQuantity: 1,
      unit: "lb",
    });

    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain("Freezer-friendly protein");
  });

  it("flags common staples", () => {
    const result = evaluateCostcoCandidate({
      ingredientName: "extra virgin olive oil",
      normalizedName: "extra virgin olive oil",
      mealCount: 1,
      totalQuantity: 0.5,
      unit: "cup",
    });

    expect(result.isCandidate).toBe(true);
    expect(result.reasons).toContain("Common pantry staple");
  });

  it("returns not a candidate when no rules match", () => {
    const result = evaluateCostcoCandidate({
      ingredientName: "fresh basil",
      normalizedName: "fresh basil",
      mealCount: 1,
      totalQuantity: 0.25,
      unit: "cup",
    });

    expect(result.isCandidate).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });
});
