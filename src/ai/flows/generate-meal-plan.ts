'use server';

/**
 * AI Agent: Personalized Weekly Meal Plan Generator
 * Optimized for Genkit with minimal token usage.
 */


import { ai } from '@/ai/genkit';
import { goo } from 'genkitx/googleAI';

// Types

export interface GeneratePersonalizedMealPlanInput {
  age: number;
  gender: string;
  height_cm: number;
  current_weight: number;
  goal_weight_1m: number;
  activityLevel: string;
  dietGoalOnboarding: string;
  ideal_goal_weight?: number;
  bf_current?: number;
  bf_target?: number;
  bf_ideal?: number;
  mm_current?: number;
  mm_target?: number;
  mm_ideal?: number;
  bw_current?: number;
  bw_target?: number;
  bw_ideal?: number;
  waist_current?: number;
  waist_goal_1m?: number;
  waist_ideal?: number;
  hips_current?: number;
  hips_goal_1m?: number;
  hips_ideal?: number;
  right_leg_current?: number;
  right_leg_goal_1m?: number;
  right_leg_ideal?: number;
  left_leg_current?: number;
  left_leg_goal_1m?: number;
  left_leg_ideal?: number;
  right_arm_current?: number;
  right_arm_goal_1m?: number;
  right_arm_ideal?: number;
  left_arm_current?: number;
  left_arm_goal_1m?: number;
  left_arm_ideal?: number;
  preferredDiet?: string;
  allergies?: string[];
  preferredCuisines?: string[];
  dispreferredCuisines?: string[];
  preferredIngredients?: string[];
  dispreferredIngredients?: string[];
  preferredMicronutrients?: string[];
  medicalConditions?: string[];
  medications?: string[];
  typicalMealsDescription?: string;
}

export interface Meal {
  meal_name: string;
  ingredients: {
    ingredient_name: string;
    quantity_g: number;
    macros_per_100g: {
      calories: number;
      protein_g: number;
      fat_g: number;
    };
  }[];
  total_calories: number;
  total_protein_g: number;
  total_fat_g: number;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface GeneratePersonalizedMealPlanOutput {
  weeklyMealPlan: DayPlan[];
  weeklySummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
}

// Main entry function

export async function generatePersonalizedMealPlan(
  input: GeneratePersonalizedMealPlanInput
): Promise<GeneratePersonalizedMealPlanOutput> {
  return generatePersonalizedMealPlanFlow(input);
}

// AI Prompt

const prompt = ai.definePrompt({
  name: 'generatePersonalizedMealPlanPrompt',
  model: gpt41Nano,
  input: { type: 'json' },
  output: { type: 'json' },
  prompt: `You are a nutritionist who will generate a personalized weekly meal plan based on the user's full profile data and preferences.

{{{input}}}

Instructions:
- Generate a weekly meal plan (7 days), with 3 meals and 2 snacks per day.
- Fully respect user dietary restrictions, allergies, preferences, and goals.
- Make meals varied, realistic, and nutritionally balanced.
- Return output as valid JSON exactly matching GeneratePersonalizedMealPlanOutput interface.
- Ensure weeklySummary reflects actual totals.

Respond only with valid JSON.`
});

// Genkit Flow

const generatePersonalizedMealPlanFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedMealPlanFlow',
    inputSchema: undefined,
    outputSchema: undefined,
  },
  async (input: GeneratePersonalizedMealPlanInput): Promise<GeneratePersonalizedMealPlanOutput> => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return output.");
    }
    return output as GeneratePersonalizedMealPlanOutput;
  }
);
