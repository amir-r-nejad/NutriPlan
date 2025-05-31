'use server';

/**
 * AI-powered Meal Suggestions based on Macronutrients — Fully optimized for Genkit
 */

import { ai } from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai';

// Types

export interface SuggestMealsForMacrosInput {
  mealName: string;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  dietGoal?: string;
  preferredDiet?: string;
  preferredCuisines?: string[];
  dispreferredCuisines?: string[];
  preferredIngredients?: string[];
  dispreferredIngredients?: string[];
  allergies?: string[];
}

export interface IngredientDetail {
  name: string;
  amount: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  macrosString: string;
}

export interface MealSuggestion {
  mealTitle: string;
  description: string;
  ingredients: IngredientDetail[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  instructions?: string;
}

export interface SuggestMealsForMacrosOutput {
  suggestions: MealSuggestion[];
}

// Main entry function

export async function suggestMealsForMacros(
  input: SuggestMealsForMacrosInput
): Promise<SuggestMealsForMacrosOutput> {
  return suggestMealsForMacrosFlow(input);
}

// AI Prompt

const prompt = ai.definePrompt({
  name: 'suggestMealsForMacrosPrompt',
  model: geminiPro,
  input: { type: 'json' },
  output: { type: 'json' },
  prompt: `You are a creative nutritionist and recipe developer. Your task is to suggest 1-3 detailed meal ideas for a specific mealtime that meet the user's macronutrient targets and adhere to their preferences.

{{{input}}}

Instructions:
- For each meal suggestion, provide:
  - mealTitle (string)
  - description (string)
  - ingredients (array of IngredientDetail objects: name, amount, unit, calories, protein, carbs, fat, macrosString)
  - totalCalories, totalProtein, totalCarbs, totalFat (sum of ingredients)
  - instructions (optional)

- Make suggestions realistic, diverse, nutritionally valid.
- Respect allergies, preferences, dislikes.
- Double check macro sums — ensure totalCalories, totalProtein, totalCarbs, totalFat match the ingredient list.
- Return output strictly as valid JSON matching SuggestMealsForMacrosOutput structure.
- Use actual numbers for numeric fields.
- Do not return empty ingredient lists.`
});

// Genkit Flow

const suggestMealsForMacrosFlow = ai.defineFlow(
  {
    name: 'suggestMealsForMacrosFlow',
    inputSchema: undefined,
    outputSchema: undefined,
  },
  async (input: SuggestMealsForMacrosInput): Promise<SuggestMealsForMacrosOutput> => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return output.");
    }
    return output as SuggestMealsForMacrosOutput;
  }
);
