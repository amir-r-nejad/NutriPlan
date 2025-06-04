import { z } from 'genkit';

// Helper for preprocessing optional number fields: empty string, null, or non-numeric becomes undefined
const preprocessOptionalNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined) {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

// Helper to convert undefined to null for Firestore




// Interface for data structure stored in Firestore
export interface GlobalCalculatedTargets {
  bmr?: number | null;
  tdee?: number | null;
  finalTargetCalories?: number | null;
  estimatedWeeklyWeightChangeKg?: number | null;
  proteinTargetPct?: number | null;
  proteinGrams?: number | null;
  proteinCalories?: number | null;
  carbTargetPct?: number | null;
  carbGrams?: number | null;
  carbCalories?: number | null;
  fatTargetPct?: number | null;
  fatGrams?: number | null;
  fatCalories?: number | null;
  current_weight_for_custom_calc?: number | null;
}


// Schema for an ingredient in a meal
export const IngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Quantity must be non-negative").nullable().default(null)),
  unit: z.string().min(1, "Unit is required (e.g., g, ml, piece)"),
  calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
  protein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
  carbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
  fat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// Schema for a single meal
export const MealSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Meal name is required"), // e.g. Breakfast, Lunch. This is the meal type.
  customName: z.string().optional().default(""), // User given name for the meal e.g. Chicken Salad
  ingredients: z.array(IngredientSchema).default([]),
  totalCalories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
  totalProtein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
  totalCarbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
  totalFat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).nullable().default(null)),
});
export type Meal = z.infer<typeof MealSchema>;

// Schema for a day's meal plan
export const DailyMealPlanSchema = z.object({
  dayOfWeek: z.string(), // e.g. "Monday"
  meals: z.array(MealSchema), // Array of Meal objects for the day
});
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;



// Zod schema for IngredientDetail
export const IngredientDetailSchema = z.object({
  name: z.string({
    required_error: "Ingredient name is required.",
    invalid_type_error: "Ingredient name must be a string.",
  }),
  amount: z.string({
    required_error: "Ingredient amount is required.",
    invalid_type_error: "Ingredient amount must be a string.",
  }), // Assuming amount can be like "1/2", "1 medium" etc.
  unit: z.string({
    required_error: "Ingredient unit is required.",
    invalid_type_error: "Ingredient unit must be a string.",
  }), // e.g., "cup", "grams", "tbsp"
  calories: z.number({
    required_error: "Calories are required.",
    invalid_type_error: "Calories must be a number.",
  }).min(1,{ message: "Calories must be a positive number." }),
  protein: z.number({
    required_error: "Protein is required.",
    invalid_type_error: "Protein must be a number.",
  }).min(0,{ message: "Protein cannot be negative." }),
  carbs: z.number({
    required_error: "Carbs are required.",
    invalid_type_error: "Carbs must be a number.",
  }).min(0,{ message: "Carbs cannot be negative." }),
  fat: z.number({
    required_error: "Fat is required.",
    invalid_type_error: "Fat must be a number.",
  }).min(0,{ message: "Fat cannot be negative." }),
  macrosString: z.string({
    required_error: "Macros string is required.",
    invalid_type_error: "Macros string must be a string.",
  }), // e.g., "P:20g C:30g F:10g"
});

// Zod schema for SuggestMealsForMacrosInput
export const SuggestMealsForMacrosInputSchema = z.object({
  mealName: z.string({
    required_error: "Meal name is required.",
    invalid_type_error: "Meal name must be a string.",
  }).min(1, { message: "Meal name cannot be empty." }),
  targetCalories: z.number({
    required_error: "Target calories are required.",
    invalid_type_error: "Target calories must be a number.",
  }).min(0,{ message: "Target calories must be a positive number." }),
  targetProteinGrams: z.number({
    required_error: "Target protein is required.",
    invalid_type_error: "Target protein must be a number.",
  }).min(0,{ message: "Target protein cannot be negative." }),
  targetCarbsGrams: z.number({
    required_error: "Target carbs are required.",
    invalid_type_error: "Target carbs must be a number.",
  }).min(0,{ message: "Target carbs cannot be negative." }),
  targetFatGrams: z.number({
    required_error: "Target fat is required.",
    invalid_type_error: "Target fat must be a number.",
  }).min(0,{ message: "Target fat cannot be negative." }),
  age: z.number({
    invalid_type_error: "Age must be a number.",
  }).min(1,{ message: "Age must be a positive number." }).optional(),
  gender: z.string({
    invalid_type_error: "Gender must be a string.",
  }).optional(),
  activityLevel: z.string({
    invalid_type_error: "Activity level must be a string.",
  }).optional(), // Could be an enum: z.enum(["sedentary", "light", "moderate", "active"]).optional()
  dietGoal: z.string({
    invalid_type_error: "Diet goal must be a string.",
  }).optional(), // Could be an enum: z.enum(["lose_weight", "maintain_weight", "gain_muscle"]).optional()
  preferredDiet: z.string({
    invalid_type_error: "Preferred diet must be a string.",
  }).optional(), // e.g., "vegetarian", "vegan", "keto"
  preferredCuisines: z.array(z.string({
    invalid_type_error: "Preferred cuisine must be a string.",
  })).optional(),
  dispreferredCuisines: z.array(z.string({
    invalid_type_error: "Dispreferred cuisine must be a string.",
  })).optional(),
  preferredIngredients: z.array(z.string({
    invalid_type_error: "Preferred ingredient must be a string.",
  })).optional(),
  dispreferredIngredients: z.array(z.string({
    invalid_type_error: "Dispreferred ingredient must be a string.",
  })).optional(),
  allergies: z.array(z.string({
    invalid_type_error: "Allergy must be a string.",
  })).optional(),
});

// Zod schema for MealSuggestion
export const MealSuggestionSchema = z.object({
  mealTitle: z.string({
    required_error: "Meal title is required.",
    invalid_type_error: "Meal title must be a string.",
  }).min(1, { message: "Meal title cannot be empty." }),
  description: z.string({
    required_error: "Description is required.",
    invalid_type_error: "Description must be a string.",
  }),
  ingredients: z.array(IngredientDetailSchema),
  totalCalories: z.number({
    required_error: "Total calories are required.",
    invalid_type_error: "Total calories must be a number.",
  }).min(1,{ message: "Total calories must be a positive number." }),
  totalProtein: z.number({
    required_error: "Total protein is required.",
    invalid_type_error: "Total protein must be a number.",
  }).min(0,{ message: "Total protein cannot be negative." }),
  totalCarbs: z.number({
    required_error: "Total carbs are required.",
    invalid_type_error: "Total carbs must be a number.",
  }).min(0,{ message: "Total carbs cannot be negative." }),
  totalFat: z.number({
    required_error: "Total fat is required.",
    invalid_type_error: "Total fat must be a number.",
  }).min(0,{ message: "Total fat cannot be negative." }),
  instructions: z.string({
    invalid_type_error: "Instructions must be a string.",
  }).optional(),
});
export const MealSuggestionOutputSchema = z.object({
  suggestions: z.array(MealSuggestionSchema)
})
// You can also infer TypeScript types from these Zod schemas if needed:
export type SuggestMealsForMacrosInputType = z.infer<typeof SuggestMealsForMacrosInputSchema>;
export type IngredientDetailType = z.infer<typeof IngredientDetailSchema>;
export type MealSuggestionType = z.infer<typeof MealSuggestionSchema>;
export type MealSuggestionTypeOutputType = z.infer<typeof MealSuggestionOutputSchema>;


// Schema for the entire weekly meal plan (current or optimized)
export const WeeklyMealPlanSchema = z.object({
  id: z.string().optional(), // Optional ID for the plan
  userId: z.string().optional(), // Optional user ID association
  startDate: z.date().optional(), // Optional start date for the plan
  days: z.array(DailyMealPlanSchema), // Array of DailyMealPlan objects for the week
  weeklySummary: z.object({ // Optional summary of weekly totals
    totalCalories: z.number(),
    totalProtein: z.number(),
    totalCarbs: z.number(),
    totalFat: z.number(),
  }).optional(),
});
export type WeeklyMealPlan = z.infer<typeof WeeklyMealPlanSchema>;


export const MealMacroDistributionSchema = z.object({
  mealName: z.string(),
  calories_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
  protein_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
  carbs_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
  fat_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
});
export type MealMacroDistribution = z.infer<typeof MealMacroDistributionSchema>;


export interface MacroResults {
  Protein_g: number;
  Carbs_g: number;
  Fat_g: number;
  Protein_cals: number;
  Carb_cals: number;
  Fat_cals: number;
  Total_cals: number;
  Protein_pct: number;
  Carb_pct: number;
  Fat_pct: number;
}

const CalculatedTargetsSchema = z.object({
  bmr: z.number().optional(),
  tdee: z.number().optional(),
  targetCalories: z.number().optional(),
  targetProtein: z.number().optional(),
  targetCarbs: z.number().optional(),
  targetFat: z.number().optional(),
  current_weight_for_calc: z.number().optional(),
});

// If you need the inferred TypeScript type:
type CalculatedTargets = z.infer<typeof CalculatedTargetsSchema>;
const CustomCalculatedTargetsSchema = z.object({
  totalCalories: z.number().optional(),
  proteinGrams: z.number().optional(),
  proteinCalories: z.number().optional(),
  proteinPct: z.number().optional(),
  carbGrams: z.number().optional(),
  carbCalories: z.number().optional(),
  carbPct: z.number().optional(),
  fatGrams: z.number().optional(),
  fatCalories: z.number().optional(),
  fatPct: z.number().optional(),
});

// TypeScript type from schema
type CustomCalculatedTargets = z.infer<typeof CustomCalculatedTargetsSchema>;
// Onboarding Schema


export type { CustomCalculatedTargets } 
