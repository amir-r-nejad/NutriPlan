
'use server';

/**
 * @fileOverview AI-powered ingredient swap suggestions for optimized meal plans.
 *
 * This file exports:
 * - `suggestIngredientSwap`: Function to get ingredient swap suggestions.
 * - `SuggestIngredientSwapInput`: Input type for the `suggestIngredientSwap` function.
 * - `SuggestIngredientSwapOutput`: Output type for the `suggestIngredientSwap` function.
 */

import {ai} from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai'; // Import geminiPro

export interface SuggestIngredientSwapInput {
  mealName: string;
  ingredients: Array<{
    name: string;
    quantity: number; // in grams
    caloriesPer100g: number;
    proteinPer100g: number; // in grams
    fatPer100g: number; // in grams
  }>;
  dietaryPreferences: string;
  dislikedIngredients: string[];
  allergies: string[];
  nutrientTargets: {
    calories: number;
    protein: number; // in grams
    carbohydrates: number; // in grams
    fat: number; // in grams
  };
}

export type SuggestIngredientSwapOutput = Array<{
  ingredientName: string;
  reason: string;
}>;

export async function suggestIngredientSwap(input: SuggestIngredientSwapInput): Promise<SuggestIngredientSwapOutput> {
  return suggestIngredientSwapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestIngredientSwapPrompt',
  model: geminiPro, // Explicitly set the model
  input: {}, // Schema inference from input type
  output: {}, // Schema inference from output type
  prompt: `You are a nutritional expert. Given a meal and a user's dietary preferences and restrictions, suggest ingredient swaps that maintain the meal's nutritional balance.

Meal Name: {{{mealName}}}
Ingredients:
{{#each ingredients}}
- {{name}} ({{quantity}}g, {{caloriesPer100g}} cal/100g, {{proteinPer100g}}g protein/100g, {{fatPer100g}}g fat/100g)
{{/each}}

Dietary Preferences: {{{dietaryPreferences}}}
Disliked Ingredients: {{#each dislikedIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Allergies: {{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Nutrient Targets: Calories: {{{nutrientTargets.calories}}}, Protein: {{{nutrientTargets.protein}}}g, Carbs: {{{nutrientTargets.carbohydrates}}}g, Fat: {{{nutrientTargets.fat}}}g

Suggest ingredient swaps that adhere to the user's preferences and restrictions while maintaining the meal's approximate calorie, protein, carb, and fat targets.  Explain the reason for each suggested swap.

Output the suggestions as a JSON array of objects, where each object has 'ingredientName' and 'reason' fields.`,  
});

const suggestIngredientSwapFlow = ai.defineFlow(
  {
    name: 'suggestIngredientSwapFlow',
    inputSchema: {}, // Schema inference from input type
    outputSchema: {}, // Schema inference from output type
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
