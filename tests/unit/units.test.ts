import { describe, expect, it } from "vitest";

import {
  areUnitsCompatible,
  convertQuantity,
  normalizeUnit,
} from "@/lib/grocery/units";

describe("normalizeUnit", () => {
  it("normalizes common aliases", () => {
    expect(normalizeUnit("Cups")).toBe("cup");
    expect(normalizeUnit("tablespoons")).toBe("tbsp");
    expect(normalizeUnit("lbs")).toBe("lb");
    expect(normalizeUnit("c")).toBe("cup");
    expect(normalizeUnit("pinches")).toBe("pinch");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeUnit("  ")).toBe("");
  });
});

describe("areUnitsCompatible", () => {
  it("returns true for same normalized units", () => {
    expect(areUnitsCompatible("tbsp", "tablespoon")).toBe(true);
  });

  it("returns true for compatible volume units", () => {
    expect(areUnitsCompatible("cup", "tbsp")).toBe(true);
    expect(areUnitsCompatible("tsp", "tbsp")).toBe(true);
  });

  it("returns true for compatible weight units", () => {
    expect(areUnitsCompatible("lb", "oz")).toBe(true);
    expect(areUnitsCompatible("g", "kg")).toBe(true);
  });

  it("returns false for incompatible families", () => {
    expect(areUnitsCompatible("cup", "lb")).toBe(false);
    expect(areUnitsCompatible("clove", "cup")).toBe(false);
  });

  it("returns false for different count units", () => {
    expect(areUnitsCompatible("clove", "can")).toBe(false);
  });
});

describe("convertQuantity", () => {
  it("converts between tbsp and tsp", () => {
    expect(convertQuantity(1, "tbsp", "tsp")).toBe(3);
    expect(convertQuantity(3, "tsp", "tbsp")).toBe(1);
  });

  it("converts between cup and tbsp", () => {
    expect(convertQuantity(1, "cup", "tbsp")).toBe(16);
    expect(convertQuantity(16, "tbsp", "cup")).toBe(1);
  });

  it("converts between lb and oz", () => {
    expect(convertQuantity(1, "lb", "oz")).toBe(16);
    expect(convertQuantity(16, "oz", "lb")).toBe(1);
  });

  it("returns same quantity for identical units", () => {
    expect(convertQuantity(2.5, "cup", "cups")).toBe(2.5);
  });

  it("returns null for incompatible units", () => {
    expect(convertQuantity(1, "cup", "clove")).toBeNull();
    expect(convertQuantity(1, "clove", "can")).toBeNull();
  });
});
