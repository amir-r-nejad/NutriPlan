
import * as z from "zod";
import { preferredDiets, genders, activityLevels as allActivityLevels, smartPlannerDietGoals, subscriptionStatuses, mealNames as defaultMealNames, defaultMacroPercentages } from "./constants";
import { User } from "firebase/auth";

// Helper for preprocessing optional number fields: empty string, null, or non-numeric becomes undefined
const preprocessOptionalNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined) {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

// Helper to convert undefined to null for Firestore
export function preprocessDataForFirestore(data: Record<string, any> | null | undefined): Record<string, any> | null {
  if (data === null || data === undefined) return null;

  const processedData: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) { // Check if it's a plain object
        processedData[key] = preprocessDataForFirestore(value); // Recurse for nested objects
      } else if (Array.isArray(value)) {
        processedData[key] = value.map(item => (typeof item === 'object' ? preprocessDataForFirestore(item) : item === undefined ? null : item));
      }
      else {
        processedData[key] = value === undefined ? null : value;
      }
    }
  }
  return processedData;
}


export const ProfileFormSchema = z.object({
  name: z.string().min(1, "Name is required.").optional(),
  subscriptionStatus: z.string().optional(),
  goalWeight: z.number(),
  // Medical Info & Physical Limitations
  painMobilityIssues: z.string().optional(),
  injuries: z.array(z.string()).optional(),
  surgeries: z.array(z.string()).optional(),
  // Exercise Preferences
  exerciseGoals: z.array(z.string()).optional(),
  exercisePreferences: z.array(z.string()).optional(),
  exerciseFrequency: z.string().optional(),
  exerciseIntensity: z.string().optional(),
  equipmentAccess: z.array(z.string()).optional(),
  // Added fields
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]]).optional(),
  currentWeight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500).optional(),
  height: z.coerce.number().min(50, "Height must be at least 50cm").max(300).optional(),
  age: z.coerce.number().min(1, "Age is required").max(120).optional(),
  activityLevel: z.enum(allActivityLevels.map(al => al.value) as [string, ...string[]]).optional(),
  dietGoal: z.enum(smartPlannerDietGoals.map(g => g.value) as [string, ...string[]]).optional(),


});
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;


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


// Base fields that might come from onboarding or profile and be used by tools
export interface BaseProfileData extends User {
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  current_weight?: number | null;
  goal_weight_1m?: number | null;
  ideal_goal_weight?: number | null;
  activityLevel?: string | null; // From onboarding
  dietGoalOnboarding?: string | null; // From onboarding

  // Preferences from Onboarding/MealSuggestions
  preferredDiet?: string | null;
  allergies?: string[] | null;
  preferredCuisines?: string[] | null;
  dispreferredCuisines?: string[] | null;
  preferredIngredients?: string[] | null;
  dispreferredIngredients?: string[] | null;
  preferredMicronutrients?: string[] | null;
  medicalConditions?: string[] | null;
  medications?: string[] | null;

  // Body Composition from Onboarding/SmartPlanner
  bf_current?: number | null; bf_target?: number | null; bf_ideal?: number | null;
  mm_current?: number | null; mm_target?: number | null; mm_ideal?: number | null;
  bw_current?: number | null; bw_target?: number | null; bw_ideal?: number | null;

  // Measurements from Onboarding/SmartPlanner
  waist_current?: number | null; waist_goal_1m?: number | null; waist_ideal?: number | null;
  hips_current?: number | null; hips_goal_1m?: number | null; hips_ideal?: number | null;
  right_leg_current?: number | null; right_leg_goal_1m?: number | null; right_leg_ideal?: number | null;
  left_leg_current?: number | null; left_leg_goal_1m?: number | null; left_leg_ideal?: number | null;
  right_arm_current?: number | null; right_arm_goal_1m?: number | null; right_arm_ideal?: number | null;
  left_arm_current?: number | null; left_arm_goal_1m?: number | null; left_arm_ideal?: number | null;

  // Onboarding specific
  typicalMealsDescription?: string | null;
  onboardingComplete?: boolean;
  subscriptionStatus?: string | null; // Stored with main profile data

  // Exercise prefs from Profile page
  painMobilityIssues?: string | null;
  injuries?: string[] | null;
  surgeries?: string[] | null;
  exerciseGoals?: string[] | null;
  exercisePreferences?: string[] | null;
  exerciseFrequency?: string | null;
  exerciseIntensity?: string | null;
  equipmentAccess?: string[] | null;

  // Fields for storing tool results
  smartPlannerData?: {
    formValues?: Partial<SmartCaloriePlannerFormValues> | null; // Storing form inputs
    results?: GlobalCalculatedTargets | null; // Storing calculated results
  } | null;
  mealDistributions?: MealMacroDistribution[] | null; // Saved from Macro Splitter or Onboarding
}

export type FullProfileType = BaseProfileData;


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

export const MacroSplitterFormSchema = z.object({
  mealDistributions: z.array(MealMacroDistributionSchema)
    .length(6, `Must have 6 meal entries.`),
}).superRefine((data, ctx) => {
  const checkSum = (macroKey: keyof Omit<MealMacroDistribution, 'mealName'>, macroName: string) => {
    const sum = data.mealDistributions.reduce((acc, meal) => acc + (Number(meal[macroKey]) || 0), 0);
    if (Math.abs(sum - 100) > 0.01) { // Allow for tiny floating point discrepancies
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total ${macroName} percentages must sum to 100%. Current sum: ${sum.toFixed(0)}%`,
        path: ['mealDistributions'],
      });
    }
  };
  checkSum('calories_pct', 'Calorie');
  checkSum('protein_pct', 'Protein');
  checkSum('carbs_pct', 'Carbohydrate');
  checkSum('fat_pct', 'Fat');
});
export type MacroSplitterFormValues = z.infer<typeof MacroSplitterFormSchema>;

export const SmartCaloriePlannerFormSchema = z.object({
  age: z.coerce.number().int("Age must be a whole number (e.g., 30, not 30.5).").positive("Age must be a positive number."),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Gender is required." }),
  height_cm: z.coerce.number().positive("Height must be a positive number."),
  current_weight: z.coerce.number().positive("Current weight must be a positive number."),
  goal_weight_1m: z.coerce.number().positive("1-Month Goal Weight must be a positive number."),
  ideal_goal_weight: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive("Ideal Goal Weight must be positive if provided.").optional()),
  activity_factor_key: z.enum(allActivityLevels.map(al => al.value) as [string, ...string[]], { required_error: "Activity level is required." }),
  dietGoal: z.enum(smartPlannerDietGoals.map(g => g.value) as [string, ...string[]], { required_error: "Diet goal is required." }),

  bf_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100, "Body fat % must be between 0 and 100.").optional()),
  bf_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Must be >= 0").max(100, "Target body fat % must be between 0 and 100.").optional()),
  bf_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),

  waist_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waist_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waist_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),

  right_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),

  custom_total_calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().int("Custom calories must be a whole number if provided.").positive("Custom calories must be positive if provided.").optional()),
  custom_protein_per_kg: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Protein per kg must be non-negative if provided.").optional()), // Protein per kg can be decimal
  remaining_calories_carb_pct: z.preprocess(preprocessOptionalNumber, z.coerce.number().int("Carb percentage must be a whole number.").min(0, "Carb percentage must be between 0 and 100.").max(100, "Carb percentage must be between 0 and 100.").optional().default(50)),
});
export type SmartCaloriePlannerFormValues = z.infer<typeof SmartCaloriePlannerFormSchema>;

export const MealSuggestionPreferencesSchema = z.object({
  preferredDiet: z.enum(preferredDiets.map(pd => pd.value) as [string, ...string[]]).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferredMicronutrients: z.array(z.string()).optional(), // Kept for potential future use
  medicalConditions: z.array(z.string()).optional(), // Kept for potential future use
  medications: z.array(z.string()).optional(), // Kept for potential future use
});
export type MealSuggestionPreferencesValues = z.infer<typeof MealSuggestionPreferencesSchema>;


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
export const OnboardingFormSchema = z.object({
  // Step 2: Basic Profile
  age: z.coerce.number().int("Age must be a whole number.").min(1, "Age is required").max(120),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Gender is required." }),
  height_cm: z.coerce.number().min(50, "Height must be at least 50cm").max(300),
  current_weight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500),
  goal_weight_1m: z.coerce.number().min(20, "Target weight must be at least 20kg").max(500),
  ideal_goal_weight: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  activityLevel: z.enum(allActivityLevels.map(al => al.value) as [string, ...string[]], { required_error: "Activity level is required." }),
  dietGoalOnboarding: z.enum(smartPlannerDietGoals.map(g => g.value) as [string, ...string[]], { required_error: "Diet goal is required." }),

  // Step 3: Body Composition (Optional)
  bf_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bf_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bf_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),

  // Step 4: Measurements (Optional)
  waist_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waist_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waist_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),

  // Step 5: Dietary Preferences & Restrictions
  preferredDiet: z.string().optional(),
  allergies: z.string().or(z.array(z.string())).optional(),
  preferredCuisines: z.string().or(z.array(z.string())).optional(),
  dispreferredCuisines: z.string().or(z.array(z.string())).optional(),
  preferredIngredients: z.string().or(z.array(z.string())).optional(),
  dispreferredIngredients: z.string().or(z.array(z.string())).optional(),
  mealsPerDay: z.coerce.number().min(2).max(7).default(3), 
  preferredMicronutrients: z.string().or(z.array(z.string())).optional(),


  // Step 6: Medical Information (Optional)
  medicalConditions: z.string().or(z.array(z.string())).optional(),
  medications: z.string().or(z.array(z.string())).optional(),
  //step 7: calculated by  function 
  systemCalculatedTargets: CalculatedTargetsSchema,
  userCustomizedTargets: CustomCalculatedTargetsSchema,
  // Step 8: Customize Your Targets (Optional)
  custom_total_calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive("Custom calories must be positive if provided.").optional()),
  custom_protein_per_kg: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Protein per kg must be non-negative if provided.").optional()),
  remaining_calories_carb_pct: z.preprocess(preprocessOptionalNumber, z.coerce.number().int("Carb % must be a whole number.").min(0).max(100).optional().default(50)),

  // Step 9: Meal Macro Distribution (Optional) - Onboarding (formerly step 10)
  mealDistributions: z.array(MealMacroDistributionSchema).optional(),

  // Step 10: Typical Meals Input - Onboarding (formerly step 11)
  typicalMealsDescription: z.string().optional(),
});

export type OnboardingFormValues = z.infer<typeof OnboardingFormSchema>;

export type { CustomCalculatedTargets } 
