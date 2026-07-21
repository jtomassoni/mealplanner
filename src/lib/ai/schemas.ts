import { z } from "zod";

export const aiRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  cuisine: z.string().nullable().optional(),
  mealTypes: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  defaultServings: z.number().positive().default(4),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  totalTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  equipment: z.array(z.string()).default([]),
  storageInstructions: z.string().nullable().optional(),
  reheatingInstructions: z.string().nullable().optional(),
  freezingSuitable: z.boolean().nullable().optional(),
  leftoverNotes: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  ingredients: z
    .array(
      z.object({
        ingredientName: z.string().min(1),
        quantity: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        preparationNote: z.string().nullable().optional(),
        optional: z.boolean().optional(),
        groceryCategory: z.string().nullable().optional(),
      }),
    )
    .min(1),
  steps: z
    .array(z.object({ instruction: z.string().min(1) }))
    .min(1),
});

export type AiRecipe = z.infer<typeof aiRecipeSchema>;

export const mealSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      dayDate: z.string(),
      title: z.string(),
      mealType: z.enum([
        "breakfast",
        "lunch",
        "dinner",
        "snack_prep",
        "other",
      ]),
      assignedTo: z.enum(["both", "specific"]).default("both"),
      servings: z.number().positive().default(2),
      notes: z.string().nullable().optional(),
      rationale: z.string().optional(),
    }),
  ),
});

export type MealSuggestions = z.infer<typeof mealSuggestionSchema>;
