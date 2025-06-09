'use server';

/**
 * AI-powered Meal Suggestions based on Macronutrients — Fully optimized for Genkit
 */

import { ai } from '../../ai/genkit';
import { MealSuggestionOutputSchema, MealSuggestionSchema, MealSuggestionTypeOutputType, SuggestMealsForMacrosInputSchema, SuggestMealsForMacrosInputType } from '../../lib/schema-server';
import { gemini25FlashPreview0417 as geminiPro } from '@genkit-ai/googleai';

// Main entry function
export async function suggestMealsForMacros(
  input: SuggestMealsForMacrosInputType
): Promise<MealSuggestionTypeOutputType> {
  return suggestMealsForMacrosFlow(input);
}

// Genkit Flow
const suggestMealsForMacrosFlow = async (input: SuggestMealsForMacrosInputType): Promise<MealSuggestionTypeOutputType> => {
  const prompt = await ai.generate({
  model: geminiPro,
  output: { schema: MealSuggestionOutputSchema },
  prompt: `You are a creative nutritionist and recipe developer. Your task is to suggest 1-3 detailed meal ideas for a specific mealtime that meet the user's macronutrient targets and adhere to their preferences.
  ${input}
Instructions:
- Make suggestions realistic, diverse, nutritionally valid.
- Respect allergies, preferences, dislikes.
- Double check macro sums — ensure totalCalories, totalProtein, totalCarbs, totalFat match the ingredient list.
- Return output strictly as valid JSON matching output Schema.
- Use actual numbers for numeric fields.
- Do not return empty ingredient lists.`
});
  const output = await prompt.output;
  console.log("Ai response For meal suggested was ", output)
  if (!output) {
    throw new Error("AI did not return output.");
  }
  return output;
}
