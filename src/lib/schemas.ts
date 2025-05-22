
import * as z from "zod";
import { activityLevels, dietGoals, preferredDiets, mealsPerDayOptions, genders, exerciseFrequencies, exerciseIntensities, mealNames as defaultSplitterMealNames } from "./constants";

// Helper for preprocessing optional number fields: empty string becomes undefined
const preprocessOptionalNumber = (val: unknown) => (val === "" || val === null ? undefined : val);

export const ProfileFormSchema = z.object({
  // Basic Info
  age: z.coerce.number().min(1, "Age is required").max(120),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Gender is required." }),
  height: z.coerce.number().min(50, "Height must be at least 50cm").max(300),
  currentWeight: z.coerce.number().min(20, "Current weight must be at least 20kg").max(500),
  goalWeight: z.coerce.number().min(20, "Goal weight must be at least 20kg").max(500),

  // Body Composition
  currentBodyFatPercentage: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  targetBodyFatPercentage: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  currentMuscleMassPercentage: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  targetMuscleMassPercentage: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  currentWaterPercentage: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  targetWaterPercentage: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),

  // Measurements
  waistMeasurementCurrent: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waistMeasurementGoal1Month: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waistMeasurementIdeal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hipsMeasurementCurrent: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hipsMeasurementGoal1Month: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hipsMeasurementIdeal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  
  rightLegMeasurementCurrent: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  rightLegMeasurementGoal1Month: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  rightLegMeasurementIdeal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  leftLegMeasurementCurrent: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  leftLegMeasurementGoal1Month: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  leftLegMeasurementIdeal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  rightArmMeasurementCurrent: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  rightArmMeasurementGoal1Month: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  rightArmMeasurementIdeal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  leftArmMeasurementCurrent: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  leftArmMeasurementGoal1Month: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  leftArmMeasurementIdeal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),

  // Activity & Diet Preferences
  activityLevel: z.enum(activityLevels.map(al => al.value) as [string, ...string[]], { required_error: "Activity level is required." }),
  dietGoal: z.enum(dietGoals.map(dg => dg.value) as [string, ...string[]], { required_error: "Diet goal is required." }),
  preferredDiet: z.enum(preferredDiets.map(pd => pd.value) as [string, ...string[]]).optional(),
  mealsPerDay: z.coerce.number().min(2).max(7),
  
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferredMicronutrients: z.array(z.string()).optional(),

  // Medical Info
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  painMobilityIssues: z.string().optional(),
  injuries: z.array(z.string()).optional(),
  surgeries: z.array(z.string()).optional(),

  // Exercise Preferences
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
  unit: z.string().min(1, "Unit is required (e.g., g, ml, piece)"), // Keeping unit flexible
  calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()), // per 100g or per unit, define consistently
  protein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  carbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  fat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// Schema for a single meal
export const MealSchema = z.object({
  id: z.string().optional(), // For database ID
  name: z.string().min(1, "Meal name is required"), // e.g., Breakfast, Lunch
  customName: z.string().optional(), // e.g., "Chicken Salad with Avocado"
  ingredients: z.array(IngredientSchema),
  totalCalories: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  totalProtein: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  totalCarbs: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  totalFat: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
});
export type Meal = z.infer<typeof MealSchema>;

// Schema for a day's meal plan
export const DailyMealPlanSchema = z.object({
  dayOfWeek: z.string(), // e.g., "Monday"
  meals: z.array(MealSchema), // Should have 6 meals by default
});
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;

// Schema for the entire weekly meal plan (current or optimized)
export const WeeklyMealPlanSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  days: z.array(DailyMealPlanSchema),
  // For AI generated plan, include summary
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
  date: z.date().optional(), // Or string representation
  caloriesBurned: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  targetCalories: z.coerce.number().min(0, "Target calories must be non-negative"),
  targetProtein: z.coerce.number().min(0, "Target protein must be non-negative"),
  targetCarbs: z.coerce.number().min(0, "Target carbs must be non-negative"),
  targetFat: z.coerce.number().min(0, "Target fat must be non-negative"),
  mealsPerDay: z.coerce.number().min(2).max(7),
});
export type DailyTargets = z.infer<typeof DailyTargetsSchema>;


// Schema for Meal-Level Nutrient Breakdown
export const MealTargetSchema = z.object({
  mealName: z.string(), // Breakfast, Snack, etc.
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
  mealTargets: z.array(MealTargetSchema), // Should sum up to daily targets
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
  day: z.string(), // e.g., "Monday"
  meals: z.array(AiGeneratedMealSchema),
});

export const AiGeneratedMealPlanOutputSchema = z.object({
  weeklyMealPlan: z.array(AiGeneratedDayPlanSchema),
  weeklySummary: z.object({
    totalCalories: z.number(),
    totalProtein: z.number(),
    totalCarbs: z.number(), // Note: AI output has this, our schema might need adjustment or mapping
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
        // Path to the first input of the column for error display or a general path
        path: ['mealDistributions', 0, macroKey], 
      });
    }
  };

  checkSum('calories_pct', 'Calorie');
  checkSum('protein_pct', 'Protein');
  checkSum('carbs_pct', 'Carbohydrate');
  checkSum('fat_pct', 'Fat');
});
export type MacroSplitterFormValues = z.infer<typeof MacroSplitterFormSchema>;

export type CalculatedMealMacros = {
  mealName: string;
  Calories: number;
  'Protein (g)': number;
  'Carbs (g)': number;
  'Fat (g)': number;
};
