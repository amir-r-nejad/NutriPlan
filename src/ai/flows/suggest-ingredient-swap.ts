'use server';

/**
 * AI-powered Ingredient Swap Suggestions — Fully optimized for Genkit
 */

import { ai } from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai';

// Types

export interface SuggestIngredientSwapInput {
  mealName: string;
  ingredients: Array<{
    name: string;
    quantity: number; // grams
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
  }>;
  dietaryPreferences: string;
  dislikedIngredients: string[];
  allergies: string[];
  nutrientTargets: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  };
}

export type SuggestIngredientSwapOutput = Array<{
  ingredientName: string;
  reason: string;
}>;

// Main entry function

export async function suggestIngredientSwap(
  input: SuggestIngredientSwapInput
): Promise<SuggestIngredientSwapOutput> {
  return suggestIngredientSwapFlow(input);
}

// AI Prompt

const prompt = ai.definePrompt({
  name: 'suggestIngredientSwapPrompt',
  model: geminiPro,
  input: { type: 'json' },
  output: { type: 'json' },
  prompt: `You are a nutritional expert. Given a meal and user's preferences, suggest ingredient swaps that preserve nutritional balance.

{{{input}}}

Instructions:
- Respect allergies, dislikes, and dietary preferences.
- Maintain approximate calorie, protein, carb, and fat targets.
- For each suggestion, provide:
  - ingredientName: the swapped ingredient.
  - reason: explain why this swap is suggested.
- Return result as valid JSON matching SuggestIngredientSwapOutput (array of objects).

Only output valid JSON.`
});

// Genkit Flow

const suggestIngredientSwapFlow = ai.defineFlow(
  {
    name: 'suggestIngredientSwapFlow',
    inputSchema: undefined,
    outputSchema: undefined,
  },
  async (input: SuggestIngredientSwapInput): Promise<SuggestIngredientSwapOutput> => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return output.");
    }
    return output as SuggestIngredientSwapOutput;
  }
);
