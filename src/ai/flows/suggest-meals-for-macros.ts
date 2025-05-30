
'use server';
/**
 * @fileOverview An AI agent that suggests meals based on macronutrient targets and user preferences.
 *
 * This file exports:
 * - `suggestMealsForMacros`: Function to get meal suggestions.
 * - `SuggestMealsForMacrosInput`: Input type for the function.
 * - `SuggestMealsForMacrosOutput`: Output type for the function.
 */

import {ai} from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai'; // Import geminiPro directly

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

interface IngredientDetail {
  name: string;
  amount: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  macrosString: string;
}

interface MealSuggestion {
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
  suggestions: MealSuggestion[]; // min(1), max(3) constraints are descriptive, not enforced by TS interface
}

export async function suggestMealsForMacros(input: SuggestMealsForMacrosInput): Promise<SuggestMealsForMacrosOutput> {
  return suggestMealsForMacrosFlow(input);
}

// Removed ai.definePrompt block

const suggestMealsForMacrosFlow = ai.defineFlow(
  {
    name: 'suggestMealsForMacrosFlow', // Assuming these names are used internally by Genkit and don't strictly require schema objects
    inputSchema: {}, // Replace with empty object or remove if not needed by defineFlow without Zod
    outputSchema: {}, // Replace with empty object or remove if not needed by defineFlow without Zod
  },
  async (input) => {
    // Manually construct the prompt string
    let promptText = `You are a creative nutritionist and recipe developer. Your task is to suggest 1-3 detailed meal ideas for a specific mealtime that meet the user's macronutrient targets and adhere to their preferences.

Meal Type: ${input.mealName}
Target Calories: ${input.targetCalories} kcal
Target Protein: ${input.targetProteinGrams} g
Target Carbohydrates: ${input.targetCarbsGrams} g
Target Fat: ${input.targetFatGrams} g

User Profile (if provided, use for personalization):
`;
    if (input.age) promptText += `Age: ${input.age}\n`;
    if (input.gender) promptText += `Gender: ${input.gender}\n`;
    if (input.activityLevel) promptText += `Activity Level: ${input.activityLevel}\n`;
    if (input.dietGoal) promptText += `Diet Goal: ${input.dietGoal}\n`;
    if (input.preferredDiet) promptText += `Preferred Diet: ${input.preferredDiet}\n`;
    if (input.preferredCuisines && input.preferredCuisines.length > 0) promptText += `Preferred Cuisines: ${input.preferredCuisines.join(', ')}\n`;
    if (input.dispreferredCuisines && input.dispreferredCuisines.length > 0) promptText += `Dispreferred Cuisines: ${input.dispreferredCuisines.join(', ')}\n`;
    if (input.preferredIngredients && input.preferredIngredients.length > 0) promptText += `Preferred Ingredients: ${input.preferredIngredients.join(', ')}\n`;
    if (input.dispreferredIngredients && input.dispreferredIngredients.length > 0) promptText += `Dispreferred Ingredients: ${input.dispreferredIngredients.join(', ')}\n`;
    if (input.allergies && input.allergies.length > 0) promptText += `Allergies: ${input.allergies.join(', ')} (Ensure suggestions strictly avoid these allergens.)\n`;

    promptText += `
For each meal suggestion, provide:
1.  A catchy 'mealTitle'.
2.  A brief 'description' (1-2 sentences) that is appetizing and explains how it generally fits the nutritional goals.
3.  A detailed 'ingredients' list. For EACH ingredient, you MUST provide:
    *   'name': Name of the ingredient (e.g., "Chicken Breast", "Almond Milk").
    *   'amount': The quantity (e.g., "100", "1/2", "1 scoop"). This should be a common household or weight measure.
    *   'unit': The unit for the amount (e.g., "g", "cup (approx 120g)", "scoop (30g)", "tbsp", "tsp", "slice", "piece"). Be specific. If using volume like 'cup', provide an approximate gram equivalent in parentheses.
    *   'calories': TOTAL calories for THIS SPECIFIC AMOUNT of the ingredient.
    *   'protein': TOTAL protein (g) for THIS SPECIFIC AMOUNT of the ingredient.
    *   'carbs': TOTAL carbohydrates (g) for THIS SPECIFIC AMOUNT of the ingredient.
    *   'fat': TOTAL fat (g) for THIS SPECIFIC AMOUNT of the ingredient.
    *   'macrosString': A concise string representing Protein/Carbohydrate/Fat grams for THIS INGREDIENT (e.g., "22g P / 5g C / 2g F" or "P:22g / C:5g / F:2g").
4.  'totalCalories', 'totalProtein', 'totalCarbs', 'totalFat': These MUST be the accurate sum of the calories and macros from YOUR 'ingredients' list. These totals should be as close as possible to the target macros provided in the input. Double-check your math.
5.  'instructions' (optional): Brief cooking or preparation steps.

Generate practical and appealing meal ideas.
Return the output strictly in the specified JSON format, ensuring all numeric values are actual numbers and all string fields are populated.
The 'ingredients' array must not be empty, and each ingredient object within it must be complete.
The 'totalCalories', 'totalProtein', 'totalCarbs', and 'totalFat' for the meal MUST accurately reflect the sum of the respective values from the 'ingredients' you provide.
`;

    // Making the AI call directly with ai.generate()
    const { output } = await ai.generate({
        model: geminiPro, // Explicitly use the imported model object
        prompt: promptText,
        output: { format: 'json' }, // Request structured output, Genkit will infer structure from Prompt
        // You could also add config here if needed, e.g., safetySettings
    });

    if (!output) {
      throw new Error("AI did not return an output.");
    }
    // Additional validation can be added here if needed
    return output;
  }
);
