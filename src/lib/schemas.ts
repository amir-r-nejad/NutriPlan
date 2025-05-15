
import * as z from "zod";
import { activityLevels, dietGoals, preferredDiets, mealsPerDayOptions, genders, exerciseFrequencies, exerciseIntensities } from "./constants";

// Helper for comma-separated string to array of strings
const commaSeparatedStringToArray = z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s !== '') : []);

export const ProfileFormSchema = z.object({
  // Basic Info
  age: z.coerce.number().min(1, "Age is required").max(120),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Gender is required." }),
  height: z.coerce.number().min(50, "Height must be at least 50cm").max(300),
  currentWeight: z.coerce.number().min(20, "Current weight must be at least 20kg").max(500),
  goalWeight: z.coerce.number().min(20, "Goal weight must be at least 20kg").max(500),

  // Body Composition
  currentBodyFatPercentage: z.coerce.number().min(0).max(100).optional(),
  targetBodyFatPercentage: z.coerce.number().min(0).max(100).optional(),
  currentMuscleMassPercentage: z.coerce.number().min(0).max(100).optional(),
  targetMuscleMassPercentage: z.coerce.number().min(0).max(100).optional(),
  currentWaterPercentage: z.coerce.number().min(0).max(100).optional(),
  targetWaterPercentage: z.coerce.number().min(0).max(100).optional(),

  // Measurements
  waistMeasurementCurrent: z.coerce.number().min(0).optional(),
  waistMeasurementGoal1Month: z.coerce.number().min(0).optional(),
  waistMeasurementIdeal: z.coerce.number().min(0).optional(),
  hipsMeasurementCurrent: z.coerce.number().min(0).optional(),
  hipsMeasurementGoal1Month: z.coerce.number().min(0).optional(),
  hipsMeasurementIdeal: z.coerce.number().min(0).optional(),
  limbsMeasurementCurrent: z.coerce.number().min(0).optional(), // Assuming a single value for simplicity
  limbsMeasurementGoal1Month: z.coerce.number().min(0).optional(),
  limbsMeasurementIdeal: z.coerce.number().min(0).optional(),

  // Activity & Diet Preferences
  activityLevel: z.enum(activityLevels.map(al => al.value) as [string, ...string[]], { required_error: "Activity level is required." }),
  dietGoal: z.enum(dietGoals.map(dg => dg.value) as [string, ...string[]], { required_error: "Diet goal is required." }),
  preferredDiet: z.enum(preferredDiets.map(pd => pd.value) as [string, ...string[]]).optional(),
  preferredCuisines: commaSeparatedStringToArray,
  dispreferredCuisines: commaSeparatedStringToArray,
  preferredIngredients: commaSeparatedStringToArray,
  dispreferredIngredients: commaSeparatedStringToArray,
  allergies: commaSeparatedStringToArray,
  mealsPerDay: z.coerce.number().min(2).max(7),
  preferredMicronutrients: commaSeparatedStringToArray,

  // Medical Info
  medicalConditions: commaSeparatedStringToArray,
  medications: commaSeparatedStringToArray,
  painMobilityIssues: z.string().optional(),
  injuries: commaSeparatedStringToArray,
  surgeries: commaSeparatedStringToArray,

  // Exercise Preferences
  exerciseGoals: commaSeparatedStringToArray,
  exercisePreferences: commaSeparatedStringToArray,
  exerciseFrequency: z.enum(exerciseFrequencies.map(ef => ef.value) as [string, ...string[]]).optional(),
  exerciseIntensity: z.enum(exerciseIntensities.map(ei => ei.value) as [string, ...string[]]).optional(),
  equipmentAccess: commaSeparatedStringToArray,
});

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

// Schema for an ingredient in a meal
export const IngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.coerce.number().min(0, "Quantity must be non-negative"),
  unit: z.string().min(1, "Unit is required (e.g., g, ml, piece)"), // Keeping unit flexible
  calories: z.coerce.number().min(0).optional(), // per 100g or per unit, define consistently
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// Schema for a single meal
export const MealSchema = z.object({
  id: z.string().optional(), // For database ID
  name: z.string().min(1, "Meal name is required"), // e.g., Breakfast, Lunch
  customName: z.string().optional(), // e.g., "Chicken Salad with Avocado"
  ingredients: z.array(IngredientSchema),
  totalCalories: z.coerce.number().min(0).optional(),
  totalProtein: z.coerce.number().min(0).optional(),
  totalCarbs: z.coerce.number().min(0).optional(),
  totalFat: z.coerce.number().min(0).optional(),
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
  caloriesBurned: z.coerce.number().min(0).optional(),
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
