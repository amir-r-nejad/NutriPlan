
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

const SuggestMealsForMacrosInputSchema = z.object({
  mealName: z.string().describe("The name of the meal type, e.g., Breakfast, Lunch."),
  targetCalories: z.number().describe("Target calories for the meal."),
  targetProteinGrams: z.number().describe("Target protein in grams for the meal."),
  targetCarbsGrams: z.number().describe("Target carbohydrates in grams for the meal."),
  targetFatGrams: z.number().describe("Target fat in grams for the meal."),
  
  // Optional user profile data for personalization
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
  amount: z.string().describe("The quantity of the ingredient, e.g., '1 scoop', '1/2 cup', '100'."),
  unit: z.string().describe("The unit for the amount, e.g., '(30g)', 'g', 'ml', 'cup', 'piece'. Should clarify weight/volume if ambiguous (e.g., 'cup (approx 150g)')."),
  calories: z.number().describe("Calories for this specific amount of the ingredient."),
  protein: z.number().describe("Protein (g) for this specific amount of the ingredient."),
  carbs: z.number().describe("Carbohydrates (g) for this specific amount of the ingredient."),
  fat: z.number().describe("Fat (g) for this specific amount of the ingredient."),
  macrosString: z.string().describe("A concise string representing P/C/F grams for this ingredient, e.g., '20g / 3g / 1g'.")
});

const MealSuggestionSchema = z.object({
  mealTitle: z.string().describe("Catchy title for the meal suggestion."),
  description: z.string().describe("A brief 1-2 sentence description of the meal and why it fits the macros. Should be enticing and practical."),
  ingredients: z.array(IngredientDetailSchema).describe("A detailed list of ingredients for the meal."),
  totalCalories: z.number().describe("Total calories for the entire meal, accurately summed from its ingredients."),
  totalProtein: z.number().describe("Total protein (g) for the entire meal, accurately summed from its ingredients."),
  totalCarbs: z.number().describe("Total carbohydrates (g) for the entire meal, accurately summed from its ingredients."),
  totalFat: z.number().describe("Total fat (g) for the entire meal, accurately summed from its ingredients."),
  instructions: z.string().optional().describe("Optional brief cooking/preparation instructions.")
});

const SuggestMealsForMacrosOutputSchema = z.object({
  suggestions: z.array(MealSuggestionSchema).min(1).max(3).describe("A list of 1-3 detailed meal suggestions."),
});
export type SuggestMealsForMacrosOutput = z.infer<typeof SuggestMealsForMacrosOutputSchema>;

export async function suggestMealsForMacros(input: SuggestMealsForMacrosInput): Promise<SuggestMealsForMacrosOutput> {
  return suggestMealsForMacrosFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMealsForMacrosPrompt',
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
3.  A detailed 'ingredients' list. For each ingredient:
    *   'name': Name of the ingredient (e.g., "Chicken Breast", "Almond Milk").
    *   'amount': The quantity (e.g., "100", "1/2", "1 scoop").
    *   'unit': The unit for the amount (e.g., "g", "cup (approx 120g)", "(30g)", "tbsp"). Be specific.
    *   'calories': Calories for THIS SPECIFIC AMOUNT of the ingredient.
    *   'protein': Protein (g) for THIS SPECIFIC AMOUNT.
    *   'carbs': Carbohydrates (g) for THIS SPECIFIC AMOUNT.
    *   'fat': Fat (g) for THIS SPECIFIC AMOUNT.
    *   'macrosString': A concise string like '22g P / 5g C / 2g F'.
4.  'totalCalories', 'totalProtein', 'totalCarbs', 'totalFat': These MUST be the accurate sum of the calories and macros from the 'ingredients' list. These totals should be as close as possible to the target macros provided in the input.
5.  'instructions' (optional): Brief cooking or preparation steps.

Generate practical and appealing meal ideas.
Return the output in the specified JSON format. Ensure all numeric values are actual numbers.
{{$instructions=JSON}}
`,
});

const suggestMealsForMacrosFlow = ai.defineFlow(
  {
    name: 'suggestMealsForMacrosFlow',
    inputSchema: SuggestMealsForMacrosInputSchema,
    outputSchema: SuggestMealsForMacrosOutputSchema,
  },
  async (input) => {
    // For actual AI call:
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return an output.");
    }
    return output;

    // // Mocked implementation for detailed output:
    // console.log("Executing MOCKED suggestMealsForMacrosFlow with input:", input);
    // await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // const mockSuggestionsList: SuggestMealsForMacrosOutput['suggestions'] = [
    //     {
    //       mealTitle: `Super Berry Protein Smoothie for ${input.mealName}`,
    //       description: "A refreshing and filling smoothie packed with protein and antioxidants, perfect to hit your targets.",
    //       ingredients: [
    //         { name: "Whey Protein (Vanilla)", amount: "1", unit: "scoop (30g)", calories: 120, protein: 24, carbs: 3, fat: 1, macrosString: "24g / 3g / 1g" },
    //         { name: "Mixed Berries (Frozen)", amount: "1", unit: "cup (140g)", calories: 70, protein: 1, carbs: 17, fat: 0.5, macrosString: "1g / 17g / 0.5g" },
    //         { name: "Spinach", amount: "1", unit: "handful (30g)", calories: 7, protein: 1, carbs: 1, fat: 0.1, macrosString: "1g / 1g / 0.1g" },
    //         { name: "Unsweetened Almond Milk", amount: "1", unit: "cup (240ml)", calories: 30, protein: 1, carbs: 1, fat: 2.5, macrosString: "1g / 1g / 2.5g" },
    //         { name: "Chia Seeds", amount: "1", unit: "tbsp (10g)", calories: 49, protein: 2, carbs: 5, fat: 3, macrosString: "2g / 5g / 3g" },
    //       ],
    //       totalCalories: 276,
    //       totalProtein: 29,
    //       totalCarbs: 27,
    //       totalFat: 7.1,
    //       instructions: "Blend all ingredients with ice until smooth. Add more almond milk for desired consistency."
    //     },
    //     {
    //       mealTitle: `Quick ${input.preferredDiet === 'vegan' ? 'Tofu Scramble' : 'Egg White Omelette'} Power Plate`,
    //       description: `A protein-packed and satisfying plate, perfect for ${input.mealName}.`,
    //       ingredients: input.preferredDiet === 'vegan' ? [
    //         { name: "Firm Tofu", amount: "150", unit: "g", calories: 110, protein: 12, carbs: 3, fat: 6, macrosString: "12g / 3g / 6g" },
    //         { name: "Nutritional Yeast", amount: "1", unit: "tbsp (5g)", calories: 20, protein: 2.5, carbs: 2, fat: 0.2, macrosString: "2.5g / 2g / 0.2g" },
    //         { name: "Spinach", amount: "50", unit: "g", calories: 12, protein: 1.5, carbs: 1.8, fat: 0.2, macrosString: "1.5g / 1.8g / 0.2g" },
    //         { name: "Whole Wheat Toast", amount: "1", unit: "slice (30g)", calories: 80, protein: 4, carbs: 15, fat: 1, macrosString: "4g / 15g / 1g" },
    //         { name: "Avocado", amount: "1/4", unit: "medium (30g)", calories: 48, protein: 0.6, carbs: 2.6, fat: 4.4, macrosString: "0.6g / 2.6g / 4.4g" },
    //       ] : [
    //         { name: "Egg Whites", amount: "4", unit: "large (132g)", calories: 68, protein: 14.4, carbs: 0.8, fat: 0.2, macrosString: "14.4g / 0.8g / 0.2g" },
    //         { name: "Bell Pepper (Chopped)", amount: "1/2", unit: "cup (75g)", calories: 20, protein: 0.7, carbs: 4.5, fat: 0.2, macrosString: "0.7g / 4.5g / 0.2g" },
    //         { name: "Spinach", amount: "50", unit: "g", calories: 12, protein: 1.5, carbs: 1.8, fat: 0.2, macrosString: "1.5g / 1.8g / 0.2g" },
    //         { name: "Whole Wheat Toast", amount: "1", unit: "slice (30g)", calories: 80, protein: 4, carbs: 15, fat: 1, macrosString: "4g / 15g / 1g" },
    //          { name: "Olive Oil (for cooking)", amount: "1/2", unit: "tsp (2.5ml)", calories: 20, protein: 0, carbs: 0, fat: 2.2, macrosString: "0g / 0g / 2.2g" },
    //       ],
    //       totalCalories: input.preferredDiet === 'vegan' ? 270 : 200, // Sum these manually for mock
    //       totalProtein: input.preferredDiet === 'vegan' ? 20.6 : 20.6,
    //       totalCarbs: input.preferredDiet === 'vegan' ? 24.4 : 22.1,
    //       totalFat: input.preferredDiet === 'vegan' ? 11.8 : 3.8,
    //       instructions: input.preferredDiet === 'vegan' ? "Crumble tofu and sauté with spinach and nutritional yeast. Serve with toast and avocado." : "Whisk egg whites, cook with bell peppers and spinach in a non-stick pan with olive oil. Serve with toast."
    //     }
    //   ];
      
    //   if (input.mealName.toLowerCase().includes("snack")) {
    //     mockSuggestionsList.push({
    //       mealTitle: "Greek Yogurt Parfait",
    //       description: "A layered snack with protein-rich yogurt, berries, and a sprinkle of nuts.",
    //       ingredients: [
    //         { name: "Plain Greek Yogurt (0% Fat)", amount: "1", unit: "cup (200g)", calories: 120, protein: 22, carbs: 8, fat: 0, macrosString: "22g / 8g / 0g" },
    //         { name: "Mixed Berries", amount: "1/2", unit: "cup (70g)", calories: 35, protein: 0.5, carbs: 8.5, fat: 0.2, macrosString: "0.5g / 8.5g / 0.2g" },
    //         { name: "Almonds (Chopped)", amount: "10", unit: "g", calories: 58, protein: 2.1, carbs: 2.2, fat: 4.9, macrosString: "2.1g / 2.2g / 4.9g" },
    //       ],
    //       totalCalories: 213,
    //       totalProtein: 24.6,
    //       totalCarbs: 18.7,
    //       totalFat: 5.1,
    //       instructions: "Layer yogurt, berries, and nuts in a glass. Enjoy immediately."
    //     });
    //   }

    // return { suggestions: mockSuggestionsList.slice(0, Math.random() > 0.5 ? 2 : 3) }; 
  }
);

