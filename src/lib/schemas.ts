
import * as z from "zod";
import { preferredDiets, genders, activityLevels as allActivityLevels, mealsPerDayOptions, smartPlannerDietGoals, subscriptionStatuses, mealNames as defaultMealNames, defaultMacroPercentages } from "./constants";

// Helper for preprocessing optional number fields: empty string, null, or non-numeric becomes undefined
const preprocessOptionalNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined) {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

export const ProfileFormSchema = z.object({
  name: z.string().min(1, "Name is required.").optional(),
  subscriptionStatus: z.string().optional(), 
  painMobilityIssues: z.string().optional(),
  injuries: z.array(z.string()).optional(), 
  surgeries: z.array(z.string()).optional(), 
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

// Base fields that might come from onboarding or profile and be used by tools
export interface BaseProfileData {
  name?: string;
  age?: number;
  gender?: string;
  height_cm?: number;
  current_weight?: number;
  goal_weight_1m?: number;
  ideal_goal_weight?: number;
  activityLevel?: string; // maps to activity_factor_key in SmartCaloriePlannerFormSchema
  dietGoal?: string; // maps to dietGoal in SmartCaloriePlannerFormSchema
  mealsPerDay?: number;

  // Preferences from Onboarding/MealSuggestions
  preferredDiet?: string;
  allergies?: string[];
  preferredCuisines?: string[];
  dispreferredCuisines?: string[];
  preferredIngredients?: string[];
  dispreferredIngredients?: string[];
  preferredMicronutrients?: string[];
  medicalConditions?: string[];
  medications?: string[];
  
  // Body Composition from Onboarding/SmartPlanner
  bf_current?: number; bf_target?: number; bf_ideal?: number;
  mm_current?: number; mm_target?: number; mm_ideal?: number;
  bw_current?: number; bw_target?: number; bw_ideal?: number;

  // Measurements from Onboarding/SmartPlanner
  waist_current?: number; waist_goal_1m?: number; waist_ideal?: number;
  hips_current?: number; hips_goal_1m?: number; hips_ideal?: number;
  right_leg_current?: number; right_leg_goal_1m?: number; right_leg_ideal?: number;
  left_leg_current?: number; left_leg_goal_1m?: number; left_leg_ideal?: number;
  right_arm_current?: number; right_arm_goal_1m?: number; right_arm_ideal?: number;
  left_arm_current?: number; left_arm_goal_1m?: number; left_arm_ideal?: number;

  // Onboarding specific
  typicalMealsDescription?: string;
  onboardingComplete?: boolean;

  // Exercise prefs from Profile page
  painMobilityIssues?: string;
  injuries?: string[];
  surgeries?: string[];
  exerciseGoals?: string[];
  exercisePreferences?: string[];
  exerciseFrequency?: string;
  exerciseIntensity?: string;
  equipmentAccess?: string[];
  
  // Fields for storing tool results
  smartPlannerData?: {
    formValues: Partial<SmartCaloriePlannerFormValues>; // Inputs used for calc
    results: CalculatedTargets;         // Output of calc
  };
  manualMacroResults?: MacroResults;  // Output of manual calc
  currentWeeklyPlan?: WeeklyMealPlan; // Current meal plan
}
// This FullProfileType can be used when reading/writing the entire user document from Firestore
export type ProfileFormValues_DEPRECATED = z.infer<typeof ProfileFormSchema>; // Keep old name if needed, but FullProfileType is better
export type FullProfileType = BaseProfileData; // Use this for the complete Firestore user document structure


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
    if (Math.round(sum) !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total ${macroName} percentages must sum to 100%. Current sum: ${sum.toFixed(1)}%`,
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

export interface CalculatedMealMacros {
  mealName: string;
  Calories: number;
  'Protein (g)': number;
  'Carbs (g)': number;
  'Fat (g)': number;
}

export interface CalculatedTargets {
  bmr: number;
  tdee: number;
  targetCaloriesScenario1: number;
  targetCaloriesScenario2?: number;
  targetCaloriesScenario3?: number;
  finalTargetCalories: number;
  estimatedWeeklyWeightChangeKg: number;
  proteinTargetPct: number;
  proteinGrams: number;
  proteinCalories: number;
  carbTargetPct: number;
  carbGrams: number;
  carbCalories: number;
  fatTargetPct: number;
  fatGrams: number;
  fatCalories: number;
  current_weight_for_custom_calc?: number; 
}

export interface CustomCalculatedTargets {
  totalCalories?: number;
  proteinGrams?: number;
  proteinCalories?: number;
  proteinPct?: number;
  carbGrams?: number;
  carbCalories?: number;
  carbPct?: number;
  fatGrams?: number;
  fatCalories?: number;
  fatPct?: number;
}

export const SmartCaloriePlannerFormSchema = z.object({
  age: z.coerce.number().positive("Age must be a positive number."),
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

  custom_total_calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive("Custom calories must be positive if provided.").optional()),
  custom_protein_per_kg: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Protein per kg must be non-negative if provided.").optional()),
  remaining_calories_carb_pct: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Carb percentage must be between 0 and 100.").max(100, "Carb percentage must be between 0 and 100.").optional().default(50)),
});
export type SmartCaloriePlannerFormValues = z.infer<typeof SmartCaloriePlannerFormSchema>;

export const MealSuggestionPreferencesSchema = z.object({
  preferredDiet: z.enum(preferredDiets.map(pd => pd.value) as [string, ...string[]]).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferredMicronutrients: z.array(z.string()).optional(), 
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});
export type MealSuggestionPreferencesValues = z.infer<typeof MealSuggestionPreferencesSchema>;

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
  age: z.coerce.number().min(1, "Age is required").max(120),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Gender is required." }),
  height_cm: z.coerce.number().min(50, "Height must be at least 50cm").max(300),
  current_weight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500),
  goal_weight_1m: z.coerce.number().min(20, "Target weight must be at least 20kg").max(500),
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
  remaining_calories_carb_pct: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional().default(50)),

  // Step 9: Manual Daily Targets (Optional)
  manual_target_calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive("Calories must be positive").optional()),
  manual_protein_g: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Protein must be non-negative").optional()),
  manual_carbs_g: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Carbs must be non-negative").optional()),
  manual_fat_g: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, "Fat must be non-negative").optional()),

  // Step 10: Meal Macro Distribution (Optional)
  mealDistributions: z.array(MealMacroDistributionSchema).optional(),

  // Step 11: Current Meal Plan Input
  typicalMealsDescription: z.string().optional(),
});

export type OnboardingFormValues = z.infer<typeof OnboardingFormSchema>;
