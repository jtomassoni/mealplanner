import OpenAI from "openai";
import { getEnv, isAiEnabled } from "@/lib/env";
import {
  aiRecipeSchema,
  mealSuggestionSchema,
  type AiRecipe,
  type MealSuggestions,
} from "@/lib/ai/schemas";

export interface AiProvider {
  generateRecipe(prompt: string): Promise<{
    data: AiRecipe;
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  }>;
  suggestMeals(prompt: string): Promise<{
    data: MealSuggestions;
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  }>;
}

class OpenAiProvider implements AiProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const env = getEnv();
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_MODEL || "gpt-4o-mini";
  }

  private async jsonCompletion<T>(
    system: string,
    user: string,
    schema: { parse: (v: unknown) => T; safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } },
  ) {
    const run = async () => {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const content = completion.choices[0]?.message?.content ?? "{}";
      const parsedJson = JSON.parse(content) as unknown;
      return { parsedJson, usage: completion.usage, model: completion.model };
    };

    let result = await run();
    let validated = schema.safeParse(result.parsedJson);
    if (!validated.success) {
      result = await run();
      validated = schema.safeParse(result.parsedJson);
      if (!validated.success) {
        throw new Error("AI response failed validation after retry");
      }
    }

    return {
      data: validated.data as T,
      model: result.model,
      usage: result.usage
        ? {
            prompt_tokens: result.usage.prompt_tokens,
            completion_tokens: result.usage.completion_tokens,
            total_tokens: result.usage.total_tokens,
          }
        : undefined,
    };
  }

  generateRecipe(prompt: string) {
    return this.jsonCompletion(
      "You are a careful home cook assistant. Return ONLY valid JSON matching the recipe schema. Prefer practical weeknight cooking.",
      prompt,
      aiRecipeSchema,
    );
  }

  suggestMeals(prompt: string) {
    return this.jsonCompletion(
      "You suggest household meal plans. Return ONLY valid JSON with a suggestions array. Do not replace existing meals unless asked. Respect time constraints and preferences.",
      prompt,
      mealSuggestionSchema,
    );
  }
}

class DisabledAiProvider implements AiProvider {
  async generateRecipe(): Promise<never> {
    throw new Error("AI features are disabled or OPENAI_API_KEY is missing.");
  }
  async suggestMeals(): Promise<never> {
    throw new Error("AI features are disabled or OPENAI_API_KEY is missing.");
  }
}

export function getAiProvider(): AiProvider {
  if (!isAiEnabled()) return new DisabledAiProvider();
  return new OpenAiProvider();
}
