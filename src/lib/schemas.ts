
import * as z from "zod";
import { preferredDiets, genders, exerciseFrequencies, exerciseIntensities, mealNames as defaultSplitterMealNames, smartPlannerDietGoals, activityLevels as allActivityLevels } from "./constants";

// Helper for preprocessing optional number fields: empty string or null becomes undefined
const preprocessOptionalNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? val : num; // Keep non-numeric string for Zod to catch as invalid number
};


export const ProfileFormSchema = z.object({
  // Medical Info (Remaining)
  painMobilityIssues: z.string().optional(),
  injuries: z.array(z.string()).optional(),
  surgeries: z.array(z.string()).optional(),

  // Exercise Preferences (Remaining)
  exerciseGoals: z.array(z.string()).optional(),
  exercisePreferences: z.array(z.string()).optional(),
  exerciseFrequency: z.enum(exerciseFrequencies.map(ef => ef.value) as [string, ...string[]]).optional(),
  exerciseIntensity: z.enum(exerciseIntensities.map(ei => ei.value) as [string, ...string[]]).optional(),
  equipmentAccess: z.array(z.string()).optional(),
});

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

// Schema for an ingredient in a meal
export const IngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.coerce.number().min(0, "Quantity must be non-negative"),
  unit: z.string().min(1, "Unit is required (e.g., g, ml, piece)"),
  calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  protein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  carbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  fat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// Schema for a single meal
export const MealSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Meal name is required"),
  customName: z.string().optional(),
  ingredients: z.array(IngredientSchema),
  totalCalories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  totalProtein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  totalCarbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  totalFat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
});
export type Meal = z.infer<typeof MealSchema>;

// Schema for a day's meal plan
export const DailyMealPlanSchema = z.object({
  dayOfWeek: z.string(),
  meals: z.array(MealSchema),
});
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;

// Schema for the entire weekly meal plan (current or optimized)
export const WeeklyMealPlanSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  days: z.array(DailyMealPlanSchema),
  weeklySummary: z.object({
    totalCalories: z.number(),
    totalProtein: z.number(),
    totalCarbs: z.number(),
    totalFat: z.number(),
  }).optional(),
});
export type WeeklyMealPlan = z.infer<typeof WeeklyMealPlanSchema>;


// Schema for Daily Calorie & Micro Nutrient Targets
export const DailyTargetsSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  date: z.date().optional(),
  caloriesBurned: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  targetCalories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  targetProtein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  targetCarbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  targetFat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  mealsPerDay: z.coerce.number().min(2).max(7),
});
export type DailyTargets = z.infer<typeof DailyTargetsSchema>;


// Schema for Meal-Level Nutrient Breakdown
export const MealTargetSchema = z.object({
  mealName: z.string(),
  targetCalories: z.coerce.number().min(0),
  targetProtein: z.coerce.number().min(0),
  targetCarbs: z.coerce.number().min(0),
  targetFat: z.coerce.number().min(0),
});
export type MealTarget = z.infer<typeof MealTargetSchema>;

export const MealLevelTargetsSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  date: z.date().optional(),
  mealTargets: z.array(MealTargetSchema),
});
export type MealLevelTargets = z.infer<typeof MealLevelTargetsSchema>;

// For AI optimized meal plan output from generate-meal-plan.ts flow
export const AiGeneratedMealSchema = z.object({
  meal_name: z.string(),
  ingredients: z.array(
    z.object({
      ingredient_name: z.string(),
      quantity_g: z.number(),
      macros_per_100g: z.object({
        calories: z.number(),
        protein_g: z.number(),
        fat_g: z.number(),
      }),
    })
  ),
  total_calories: z.number(),
  total_protein_g: z.number(),
  total_fat_g: z.number(),
});

export const AiGeneratedDayPlanSchema = z.object({
  day: z.string(), 
  meals: z.array(AiGeneratedMealSchema),
});

export const AiGeneratedMealPlanOutputSchema = z.object({
  weeklyMealPlan: z.array(AiGeneratedDayPlanSchema),
  weeklySummary: z.object({
    totalCalories: z.number(),
    totalProtein: z.number(),
    totalCarbs: z.number(),
    totalFat: z.number(),
  }),
});
export type AiGeneratedMealPlanOutput = z.infer<typeof AiGeneratedMealPlanOutputSchema>;


export const IngredientSwapSuggestionSchema = z.object({
  ingredientName: z.string(),
  reason: z.string(),
});

export type IngredientSwapSuggestion = z.infer<typeof IngredientSwapSuggestionSchema>;

// Schema for Macro Splitter Tool
const MealMacroDistributionSchema = z.object({
  mealName: z.string(),
  calories_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
  protein_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
  carbs_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
  fat_pct: z.coerce.number().min(0, "% must be >= 0").max(100, "% must be <= 100").default(0),
});
export type MealMacroDistribution = z.infer<typeof MealMacroDistributionSchema>;

export const MacroSplitterFormSchema = z.object({
  mealDistributions: z.array(MealMacroDistributionSchema)
    .length(defaultSplitterMealNames.length, `Must have ${defaultSplitterMealNames.length} meal entries.`),
}).superRefine((data, ctx) => {
  const checkSum = (macroKey: keyof Omit<MealMacroDistribution, 'mealName'>, macroName: string) => {
    const sum = data.mealDistributions.reduce((acc, meal) => acc + meal[macroKey], 0);
    if (Math.round(sum) !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total ${macroName} percentages must sum to 100%. Current sum: ${sum.toFixed(1)}%`,
        path: ['mealDistributions', 0, macroKey], // Simplified path for general error
      });
    }
  };

  checkSum('calories_pct', 'Calorie');
  checkSum('protein_pct', 'Protein');
  checkSum('carbs_pct', 'Carbohydrate');
  checkSum('fat_pct', 'Fat');
});
export type MacroSplitterFormValues = z.infer<typeof MacroSplitterFormSchema>;

export interface CalculatedMealMacros {
  mealName: string;
  Calories: number;
  'Protein (g)': number;
  'Carbs (g)': number;
  'Fat (g)': number;
}

// Schema for Smart Calorie Planner
export const SmartCaloriePlannerFormSchema = z.object({
  // Basic Info (Required)
  age: z.coerce.number().positive("Age must be a positive number."),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Gender is required." }),
  height_cm: z.coerce.number().positive("Height must be a positive number."),
  current_weight: z.coerce.number().positive("Current weight must be a positive number."),
  goal_weight_1m: z.coerce.number().positive("1-Month Goal Weight must be a positive number."),
  ideal_goal_weight: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive("Ideal Goal Weight must be positive if provided.").optional()),
  activity_factor_key: z.enum(allActivityLevels.map(al => al.value) as [string, ...string[]], { required_error: "Activity level is required." }),
  dietGoal: z.enum(smartPlannerDietGoals.map(g => g.value) as [string, ...string[]], { required_error: "Diet goal is required." }),

  // Body Composition (Optional)
  bf_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100, "Body fat % must be between 0 and 100.").optional()),
  bf_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100, "Target body fat % must be between 0 and 100.").optional()),
  bf_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100, "Ideal body fat % must be between 0 and 100.").optional()),
  
  mm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100).optional()), 
  mm_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100).optional()),  
  mm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100).optional()),

  bw_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100).optional()), 
  bw_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100).optional()),
  bw_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100).optional()),

  // Measurements (Optional)
  waist_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  waist_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  waist_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  
  hips_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  hips_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  hips_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  
  right_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  right_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  right_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  
  left_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  left_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  left_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  
  right_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  right_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  right_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  
  left_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  left_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
  left_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").optional()),
});

export type SmartCaloriePlannerFormValues = z.infer<typeof SmartCaloriePlannerFormSchema>;

// Schema for preferences on Meal Suggestions page
export const MealSuggestionPreferencesSchema = z.object({
  preferredDiet: z.enum(preferredDiets.map(pd => pd.value) as [string, ...string[]]).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferredMicronutrients: z.array(z.string()).optional(), // Note: micronutrients field name alignment
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

export type MealSuggestionPreferencesValues = z.infer<typeof MealSuggestionPreferencesSchema>;


// Schema for Manual Macro Calculator (now part of SmartCaloriePlannerPage)
export const MacroCalculatorFormSchema = z.object({
  weight_kg: z.coerce.number().positive({ message: "Weight must be greater than 0." }),
  protein_per_kg: z.coerce.number().positive({ message: "Protein per kg must be greater than 0." }),
  target_calories: z.coerce.number().positive({ message: "Target calories must be greater than 0." }),
  percent_carb: z.coerce.number().min(0, "Carb percentage must be at least 0.").max(100, "Carb percentage cannot exceed 100."),
});
export type MacroCalculatorFormValues = z.infer<typeof MacroCalculatorFormSchema>;

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

    