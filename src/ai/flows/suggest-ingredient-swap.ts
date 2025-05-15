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
import {z} from 'genkit';

const SuggestIngredientSwapInputSchema = z.object({
  mealName: z.string().describe('The name of the meal (e.g., Breakfast, Lunch, Dinner).'),
  ingredients: z.array(
    z.object({
      name: z.string().describe('The name of the ingredient.'),
      quantity: z.number().describe('The quantity of the ingredient in grams.'),
      caloriesPer100g: z.number().describe('The number of calories per 100g of the ingredient.'),
      proteinPer100g: z.number().describe('The amount of protein per 100g of the ingredient.'),
      fatPer100g: z.number().describe('The amount of fat per 100g of the ingredient.'),
    })
  ).describe('The list of ingredients in the meal.'),
  dietaryPreferences: z.string().describe('The dietary preferences of the user.'),
  dislikedIngredients: z.array(z.string()).describe('A list of ingredients the user dislikes.'),
  allergies: z.array(z.string()).describe('A list of ingredients the user is allergic to.'),
  nutrientTargets: z.object({
    calories: z.number().describe('The target number of calories for the meal.'),
    protein: z.number().describe('The target amount of protein for the meal in grams.'),
    carbohydrates: z.number().describe('The target amount of carbohydrates for the meal in grams.'),
    fat: z.number().describe('The target amount of fat for the meal in grams.'),
  }).describe('The target nutrient breakdown for the meal.'),
});
export type SuggestIngredientSwapInput = z.infer<typeof SuggestIngredientSwapInputSchema>;

const SuggestIngredientSwapOutputSchema = z.array(
  z.object({
    ingredientName: z.string().describe('The name of the suggested ingredient.'),
    reason: z.string().describe('The reason for suggesting this ingredient swap.'),
  })
).describe('A list of suggested ingredient swaps with reasons.');
export type SuggestIngredientSwapOutput = z.infer<typeof SuggestIngredientSwapOutputSchema>;

export async function suggestIngredientSwap(input: SuggestIngredientSwapInput): Promise<SuggestIngredientSwapOutput> {
  return suggestIngredientSwapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestIngredientSwapPrompt',
  input: {schema: SuggestIngredientSwapInputSchema},
  output: {schema: SuggestIngredientSwapOutputSchema},
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
    inputSchema: SuggestIngredientSwapInputSchema,
    outputSchema: SuggestIngredientSwapOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
