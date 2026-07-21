export const GROCERY_SECTIONS = [
  { id: "produce", label: "Produce" },
  { id: "meat_seafood", label: "Meat & Seafood" },
  { id: "dairy", label: "Dairy & Eggs" },
  { id: "bakery", label: "Bakery" },
  { id: "pantry", label: "Pantry" },
  { id: "frozen", label: "Frozen" },
  { id: "beverages", label: "Beverages" },
  { id: "snacks", label: "Snacks" },
  { id: "household", label: "Household" },
  { id: "other", label: "Other" },
] as const;

const PRODUCE_KEYWORDS = [
  "apple",
  "avocado",
  "banana",
  "basil",
  "bell pepper",
  "broccoli",
  "carrot",
  "celery",
  "cilantro",
  "cucumber",
  "garlic",
  "ginger",
  "grape",
  "green onion",
  "kale",
  "lemon",
  "lettuce",
  "lime",
  "mushroom",
  "onion",
  "parsley",
  "potato",
  "romaine",
  "shallot",
  "spinach",
  "tomato",
  "zucchini",
];

const MEAT_SEAFOOD_KEYWORDS = [
  "beef",
  "chicken",
  "pork",
  "turkey",
  "lamb",
  "bacon",
  "sausage",
  "salmon",
  "shrimp",
  "fish",
  "tuna",
  "cod",
  "steak",
  "ground beef",
  "ground turkey",
];

const DAIRY_KEYWORDS = [
  "milk",
  "cheese",
  "butter",
  "cream",
  "yogurt",
  "egg",
  "sour cream",
  "cream cheese",
  "parmesan",
  "mozzarella",
  "cheddar",
];

const BAKERY_KEYWORDS = [
  "bread",
  "bun",
  "roll",
  "tortilla",
  "bagel",
  "pita",
  "croissant",
];

const PANTRY_KEYWORDS = [
  "rice",
  "pasta",
  "flour",
  "sugar",
  "salt",
  "pepper",
  "oil",
  "vinegar",
  "soy sauce",
  "broth",
  "stock",
  "bean",
  "lentil",
  "quinoa",
  "oat",
  "cereal",
  "nut",
  "spice",
  "honey",
  "maple syrup",
];

const FROZEN_KEYWORDS = [
  "frozen",
  "ice cream",
];

const BEVERAGE_KEYWORDS = [
  "water",
  "juice",
  "coffee",
  "tea",
  "soda",
  "wine",
  "beer",
];

const SNACK_KEYWORDS = [
  "chip",
  "cracker",
  "cookie",
  "popcorn",
  "granola bar",
];

const SECTION_RULES: Array<{ section: string; keywords: string[] }> = [
  { section: "frozen", keywords: FROZEN_KEYWORDS },
  { section: "meat_seafood", keywords: MEAT_SEAFOOD_KEYWORDS },
  { section: "dairy", keywords: DAIRY_KEYWORDS },
  { section: "produce", keywords: PRODUCE_KEYWORDS },
  { section: "bakery", keywords: BAKERY_KEYWORDS },
  { section: "pantry", keywords: PANTRY_KEYWORDS },
  { section: "beverages", keywords: BEVERAGE_KEYWORDS },
  { section: "snacks", keywords: SNACK_KEYWORDS },
];

export function inferGrocerySection(ingredientName: string): string {
  const normalized = ingredientName.trim().toLowerCase();

  for (const rule of SECTION_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.section;
    }
  }

  return "other";
}
