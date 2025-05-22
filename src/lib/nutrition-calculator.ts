
import type { ProfileFormValues } from './schemas'; 
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
  // Fallback for "other" or unspecified - average of male and female
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
 * Calculates a basic recommended protein intake based on body weight and activity level.
 * @param weightKg - Weight in kilograms.
 * @param activityLevelValue - User's activity level.
 * @returns Recommended protein in grams/day.
 */
export function calculateRecommendedProtein(weightKg: number, activityLevelValue: string): number {
  const level = activityLevels.find(l => l.value === activityLevelValue);
  const proteinFactor = level?.proteinFactorPerKg || 0.8; // Default to sedentary if not found
  return weightKg * proteinFactor;
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
  const protein = calculateRecommendedProtein(profile.currentWeight, profile.activityLevel);

  const targetCalories = adjustTDEEForDietGoal(tdee, profile.dietGoal);
  
  const proteinCalories = protein * 4;
  // Aim for fat to be ~25% of total calories
  const fatGrams = Math.round((targetCalories * 0.25) / 9); 
  const fatCalories = fatGrams * 9;
  // Remaining calories for carbs
  const carbGrams = Math.round((targetCalories - proteinCalories - fatCalories) / 4);


  return {
    targetCalories: Math.round(targetCalories),
    targetProtein: Math.round(protein),
    targetFat: Math.max(0, fatGrams), // Ensure non-negative
    targetCarbs: Math.max(0, carbGrams), // Ensure non-negative
  };
}
