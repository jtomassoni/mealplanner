import { describe, expect, it } from "vitest";
import { aiRecipeSchema, mealSuggestionSchema } from "@/lib/ai/schemas";

describe("ai schemas", () => {
  it("validates a recipe payload", () => {
    const parsed = aiRecipeSchema.parse({
      title: "Pasta",
      defaultServings: 2,
      ingredients: [{ ingredientName: "pasta", quantity: 8, unit: "oz" }],
      steps: [{ instruction: "Boil water" }],
    });
    expect(parsed.title).toBe("Pasta");
  });

  it("rejects empty ingredients", () => {
    expect(() =>
      aiRecipeSchema.parse({
        title: "X",
        ingredients: [],
        steps: [{ instruction: "Do it" }],
      }),
    ).toThrow();
  });

  it("validates meal suggestions", () => {
    const parsed = mealSuggestionSchema.parse({
      suggestions: [
        {
          dayDate: "2026-03-23",
          title: "Tacos",
          mealType: "dinner",
          servings: 2,
        },
      ],
    });
    expect(parsed.suggestions).toHaveLength(1);
  });
});
