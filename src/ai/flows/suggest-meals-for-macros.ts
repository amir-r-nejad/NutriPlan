
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
import {z} from 'genkit';
// Removed direct import of geminiPro as we rely on the global default

const SuggestMealsForMacrosInputSchema = z.object({
  mealName: z.string().describe("The name of the meal type, e.g., Breakfast, Lunch."),
  targetCalories: z.number().describe("Target calories for the meal."),
  targetProteinGrams: z.number().describe("Target protein in grams for the meal."),
  targetCarbsGrams: z.number().describe("Target carbohydrates in grams for the meal."),
  targetFatGrams: z.number().describe("Target fat in grams for the meal."),
  
  age: z.number().optional().describe('The age of the user.'),
  gender: z.string().optional().describe('The gender of the user.'),
  activityLevel: z.string().optional().describe('The activity level of the user (e.g., sedentary, light, moderate, active).'),
  dietGoal: z.string().optional().describe('The diet goal of the user (e.g., lose weight, maintain weight, gain weight).'),
  preferredDiet: z.string().optional().describe('The preferred diet of the user (e.g., vegetarian, vegan, keto).'),
  preferredCuisines: z.array(z.string()).optional().describe('The preferred cuisines of the user.'),
  dispreferredCuisines: z.array(z.string()).optional().describe('The dispreferred cuisines of the user.'),
  preferredIngredients: z.array(z.string()).optional().describe('The preferred ingredients of the user.'),
  dispreferredIngredients: z.array(z.string()).optional().describe('The dispreferred ingredients of the user.'),
  allergies: z.array(z.string()).optional().describe('The allergies of the user.'),
});
export type SuggestMealsForMacrosInput = z.infer<typeof SuggestMealsForMacrosInputSchema>;

const IngredientDetailSchema = z.object({
  name: z.string().describe("Name of the ingredient."),
  amount: z.string().describe("The quantity of the ingredient, e.g., '1 scoop', '1/2 cup', '100'. Should be a common household or weight measure."),
  unit: z.string().describe("The unit for the amount, e.g., '(30g)', 'g', 'ml', 'cup', 'piece', 'tbsp', 'tsp'. If using volume like 'cup', try to provide an approximate gram equivalent in parentheses, e.g., 'cup (approx 150g)'. For items like 'scoop', provide typical gram weight in parentheses, e.g., 'scoop (30g)'. "),
  calories: z.number().describe("Calories for THIS SPECIFIC AMOUNT of the ingredient."),
  protein: z.number().describe("Protein (g) for THIS SPECIFIC AMOUNT of the ingredient."),
  carbs: z.number().describe("Carbohydrates (g) for THIS SPECIFIC AMOUNT of the ingredient."),
  fat: z.number().describe("Fat (g) for THIS SPECIFIC AMOUNT of the ingredient."),
  macrosString: z.string().describe("A concise string representing P/C/F grams for THIS INGREDIENT, e.g., '24g / 3g / 1g'.")
});

const MealSuggestionSchema = z.object({
  mealTitle: z.string().describe("Catchy title for the meal suggestion."),
  description: z.string().describe("A brief 1-2 sentence description of the meal and why it fits the macros. Should be enticing and practical."),
  ingredients: z.array(IngredientDetailSchema).describe("A detailed list of ingredients for the meal. Each ingredient MUST have all its fields populated: name, amount, unit, calories, protein, carbs, fat (all for the specified amount), and macrosString."),
  totalCalories: z.number().describe("Total calories for the entire meal, accurately summed from its ingredients. This MUST be the sum of 'calories' from the 'ingredients' list."),
  totalProtein: z.number().describe("Total protein (g) for the entire meal, accurately summed from its ingredients. This MUST be the sum of 'protein' from the 'ingredients' list."),
  totalCarbs: z.number().describe("Total carbohydrates (g) for the entire meal, accurately summed from its ingredients. This MUST be the sum of 'carbs' from the 'ingredients' list."),
  totalFat: z.number().describe("Total fat (g) for the entire meal, accurately summed from its ingredients. This MUST be the sum of 'fat' from the 'ingredients' list."),
  instructions: z.string().optional().describe("Optional brief cooking/preparation instructions.")
});

const SuggestMealsForMacrosOutputSchema = z.object({
  suggestions: z.array(MealSuggestionSchema).min(1).max(3).describe("A list of 1-3 detailed meal suggestions. Each suggestion MUST adhere to the MealSuggestionSchema, including a complete ingredients list where each ingredient has ALL its nutritional details (calories, protein, carbs, fat for the specified amount, and macrosString) and the meal's total macros are correctly summed."),
});
export type SuggestMealsForMacrosOutput = z.infer<typeof SuggestMealsForMacrosOutputSchema>;

export async function suggestMealsForMacros(input: SuggestMealsForMacrosInput): Promise<SuggestMealsForMacrosOutput> {
  return suggestMealsForMacrosFlow(input);
}

// Defining the prompt for suggesting meals
const prompt = ai.definePrompt({
  name: 'suggestMealsForMacrosPrompt',
  // model: geminiPro, // Relying on global default model from genkit.ts
  input: { schema: SuggestMealsForMacrosInputSchema },
  output: { schema: SuggestMealsForMacrosOutputSchema },
  prompt: `You are a creative nutritionist and recipe developer. Your task is to suggest 1-3 detailed meal ideas for a specific mealtime that meet the user's macronutrient targets and adhere to their preferences.

Meal Type: {{{mealName}}}
Target Calories: {{{targetCalories}}} kcal
Target Protein: {{{targetProteinGrams}}} g
Target Carbohydrates: {{{targetCarbsGrams}}} g
Target Fat: {{{targetFatGrams}}} g

User Profile (if provided, use for personalization):
{{#if age}}Age: {{{age}}}{{/if}}
{{#if gender}}Gender: {{{gender}}}{{/if}}
{{#if activityLevel}}Activity Level: {{{activityLevel}}}{{/if}}
{{#if dietGoal}}Diet Goal: {{{dietGoal}}}{{/if}}
{{#if preferredDiet}}Preferred Diet: {{{preferredDiet}}}{{/if}}
{{#if preferredCuisines.length}}Preferred Cuisines: {{#each preferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if dispreferredCuisines.length}}Dispreferred Cuisines: {{#each dispreferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if preferredIngredients.length}}Preferred Ingredients: {{#each preferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if dispreferredIngredients.length}}Dispreferred Ingredients: {{#each dispreferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if allergies.length}}Allergies: {{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} (Ensure suggestions strictly avoid these allergens.){{/if}}

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
`,
});

const suggestMealsForMacrosFlow = ai.defineFlow(
  {
    name: 'suggestMealsForMacrosFlow',
    inputSchema: SuggestMealsForMacrosInputSchema,
    outputSchema: SuggestMealsForMacrosOutputSchema,
  },
  async (input) => {
    // Making the AI call
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return an output.");
    }
    // Additional validation can be added here if needed, e.g., check if totals match sum of ingredients
    return output;
  }
);
