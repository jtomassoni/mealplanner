import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const householdName = process.env.DEFAULT_HOUSEHOLD_NAME || "JT and Mary";
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("name", householdName)
    .single();
  if (!household) throw new Error("Run setup:household first");

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", household.id)
    .eq("is_active", true);
  const createdBy = members?.[0]?.user_id ?? null;

  const samples = [
    {
      title: "Weeknight Chicken Alfredo",
      source_type: "household",
      ingredients: [
        { name: "fettuccine", qty: 12, unit: "oz" },
        { name: "chicken breast", qty: 1, unit: "lb" },
        { name: "heavy cream", qty: 1, unit: "cup" },
        { name: "parmesan", qty: 1, unit: "cup" },
        { name: "garlic", qty: 3, unit: "clove" },
      ],
      steps: ["Cook pasta.", "Sear chicken.", "Make cream sauce.", "Combine and serve."],
    },
    {
      title: "Grandma's Crab Cakes",
      source_type: "family",
      source_name: "Grandma",
      ingredients: [
        { name: "lump crab meat", qty: 1, unit: "lb" },
        { name: "breadcrumbs", qty: 0.5, unit: "cup" },
        { name: "egg", qty: 1, unit: "piece" },
        { name: "mayonnaise", qty: 3, unit: "tbsp" },
        { name: "dijon mustard", qty: 1, unit: "tsp" },
      ],
      steps: ["Mix gently.", "Form cakes.", "Pan fry until golden."],
    },
    {
      title: "Sheet Pan Salmon",
      source_type: "household",
      ingredients: [
        { name: "salmon", qty: 1.5, unit: "lb" },
        { name: "broccoli", qty: 1, unit: "bunch" },
        { name: "olive oil", qty: 2, unit: "tbsp" },
        { name: "lemon", qty: 1, unit: "piece" },
      ],
      steps: ["Preheat oven.", "Season salmon and broccoli.", "Roast 15 minutes."],
    },
  ];

  for (const sample of samples) {
    const { data: existing } = await supabase
      .from("recipes")
      .select("id")
      .eq("household_id", household.id)
      .eq("title", sample.title)
      .maybeSingle();
    if (existing) {
      console.log(`Skip existing recipe: ${sample.title}`);
      continue;
    }

    const { data: recipe, error } = await supabase
      .from("recipes")
      .insert({
        household_id: household.id,
        title: sample.title,
        source_type: sample.source_type,
        source_name: (sample as { source_name?: string }).source_name ?? null,
        created_by: createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { data: version, error: vErr } = await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: recipe.id,
        household_id: household.id,
        version_number: 1,
        is_current: true,
        default_servings: 4,
        difficulty: "easy",
        created_by: createdBy,
        change_summary: "Seed version",
      })
      .select("*")
      .single();
    if (vErr) throw vErr;

    await supabase.from("recipe_ingredients").insert(
      sample.ingredients.map((ing, index) => ({
        recipe_version_id: version.id,
        household_id: household.id,
        ingredient_name: ing.name,
        quantity: ing.qty,
        unit: ing.unit,
        sort_order: index,
      })),
    );
    await supabase.from("recipe_steps").insert(
      sample.steps.map((instruction, index) => ({
        recipe_version_id: version.id,
        household_id: household.id,
        step_number: index + 1,
        instruction,
      })),
    );
    console.log(`Seeded recipe: ${sample.title}`);
  }

  await supabase.from("pantry_items").upsert(
    [
      {
        household_id: household.id,
        ingredient_name: "olive oil",
        in_stock: true,
        is_staple: true,
        updated_by: createdBy,
      },
      {
        household_id: household.id,
        ingredient_name: "salt",
        in_stock: true,
        is_staple: true,
        updated_by: createdBy,
      },
    ],
    { onConflict: "id", ignoreDuplicates: true },
  );

  console.log("Dev seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
