
import type { ProfileFormValues } from './schemas'; // Assuming gender is part of ProfileFormValues or a similar type
import { activityLevels } from './constants';

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation.
 * @param gender - User's gender ("male" or "female").
 * @param weightKg - Weight in kilograms.
 * @param heightCm - Height in centimeters.
 * @param ageYears - Age in years.
 * @returns BMR in kcal/day.
 */
export function calculateBMR(
  gender: string,
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else if (gender === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }
  // Fallback for "other" or unspecified - average of male and female, or handle as per app's decision
  // This is a simplification; more nuanced handling might be needed for "other"
  const bmrMale = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  const bmrFemale = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  return (bmrMale + bmrFemale) / 2;
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * @param bmr - Basal Metabolic Rate.
 * @param activityLevelValue - The value string for activity level (e.g., "sedentary", "light").
 * @returns TDEE in kcal/day.
 */
export function calculateTDEE(bmr: number, activityLevelValue: string): number {
  const level = activityLevels.find(l => l.value === activityLevelValue);
  const activityFactor = level?.activityFactor || 1.2; // Default to sedentary if not found
  return bmr * activityFactor;
}

/**
 * Calculates a basic recommended protein intake.
 * @param weightKg - Weight in kilograms.
 * @param dietGoal - User's diet goal (e.g., "lose_weight", "gain_weight").
 * @returns Recommended protein in grams/day.
 */
export function calculateRecommendedProtein(weightKg: number, dietGoal: string): number {
  let proteinPerKg = 1.6; // General recommendation
  if (dietGoal === 'gain_weight') {
    proteinPerKg = 2.0; // Higher for muscle gain
  } else if (dietGoal === 'lose_weight') {
    proteinPerKg = 1.8; // Higher to preserve muscle during calorie deficit
  }
  return weightKg * proteinPerKg;
}

/**
 * Adjusts TDEE based on diet goal.
 * @param tdee - Total Daily Energy Expenditure.
 * @param dietGoal - User's diet goal.
 * @returns Adjusted TDEE (target calories).
 */
function adjustTDEEForDietGoal(tdee: number, dietGoal: string): number {
  if (dietGoal === 'lose_weight') {
    return tdee - 500; // Typical 500 kcal deficit for weight loss
  } else if (dietGoal === 'gain_weight') {
    return tdee + 300; // Typical 300-500 kcal surplus for muscle gain
  }
  return tdee; // Maintain weight
}


/**
 * Calculates estimated daily targets based on profile.
 */
export function calculateEstimatedDailyTargets(profile: Partial<ProfileFormValues>): {
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number; 
  targetFat?: number; 
} {
  if (
    !profile.gender ||
    profile.currentWeight === undefined ||
    profile.height === undefined ||
    profile.age === undefined ||
    !profile.activityLevel ||
    !profile.dietGoal
  ) {
    return {}; // Not enough data
  }

  const bmr = calculateBMR(profile.gender, profile.currentWeight, profile.height, profile.age);
  let tdee = calculateTDEE(bmr, profile.activityLevel);
  const protein = calculateRecommendedProtein(profile.currentWeight, profile.dietGoal);

  // Adjust TDEE for diet goal to get target calories
  const targetCalories = adjustTDEEForDietGoal(tdee, profile.dietGoal);
  
  // Example: Fat at 25% of target calories, then carbs for the rest
  // (9 calories per gram of fat, 4 calories per gram of protein/carbs)
  const fatGrams = Math.round((targetCalories * 0.25) / 9);
  const proteinCalories = protein * 4;
  const fatCalories = fatGrams * 9;
  const carbGrams = Math.round((targetCalories - proteinCalories - fatCalories) / 4);


  return {
    targetCalories: Math.round(targetCalories),
    targetProtein: Math.round(protein),
    targetFat: fatGrams > 0 ? fatGrams : undefined,
    targetCarbs: carbGrams > 0 ? carbGrams : undefined,
  };
}

