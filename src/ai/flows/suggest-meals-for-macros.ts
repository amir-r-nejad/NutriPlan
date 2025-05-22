
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

const MealSuggestionSchema = z.object({
  mealTitle: z.string().describe("Catchy title for the meal suggestion."),
  description: z.string().describe("A brief description of the meal and why it fits the macros. Should be enticing and practical."),
  keyIngredients: z.array(z.string()).describe("A list of 3-5 key ingredients for the meal."),
  estimatedMacros: z.object({
    calories: z.number().describe("Estimated calories for the suggested meal."),
    protein: z.number().describe("Estimated protein in grams for the suggested meal."),
    carbs: z.number().describe("Estimated carbohydrates in grams for the suggested meal."),
    fat: z.number().describe("Estimated fat in grams for the suggested meal."),
  }).describe("AI's best estimate of the macros for the suggested meal. This should be close to the target macros provided in the input.")
});

const SuggestMealsForMacrosOutputSchema = z.object({
  suggestions: z.array(MealSuggestionSchema).min(1).max(5).describe("A list of 2-3 meal suggestions."),
});
export type SuggestMealsForMacrosOutput = z.infer<typeof SuggestMealsForMacrosOutputSchema>;

// Actual flow implementation (currently mocked)
export async function suggestMealsForMacros(input: SuggestMealsForMacrosInput): Promise<SuggestMealsForMacrosOutput> {
  console.log("AI Flow: suggestMealsForMacros called with input:", input);
  // In a real scenario, you would call the AI model here.
  // For now, returning mock data:
  // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

  // This is where you would call the prompt function:
  // const { output } = await prompt(input);
  // return output!;
  
  // Mocked response:
  return suggestMealsForMacrosFlow(input); // Keeping the flow structure
}

const prompt = ai.definePrompt({
  name: 'suggestMealsForMacrosPrompt',
  input: { schema: SuggestMealsForMacrosInputSchema },
  output: { schema: SuggestMealsForMacrosOutputSchema },
  prompt: `You are a creative nutritionist and chef. Your task is to suggest 2-3 meal ideas for a specific mealtime that meet the user's macronutrient targets and adhere to their preferences.

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
2.  A 'description' (1-2 sentences) that is appetizing and explains how it generally fits the nutritional goals.
3.  A list of 3-5 'keyIngredients'.
4.  Your best 'estimatedMacros' (calories, protein, carbs, fat) for the meal suggestion. These estimated macros should be as close as possible to the target macros provided.

Generate practical and appealing meal ideas.
Return the output in the specified JSON format.
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
    // For actual AI call, uncomment below:
    // const { output } = await prompt(input);
    // if (!output) {
    //   throw new Error("AI did not return an output.");
    // }
    // return output;

    // Mocked implementation for now:
    console.log("Executing MOCKED suggestMealsForMacrosFlow with input:", input);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    
    let mockSuggestionsList: SuggestMealsForMacrosOutput['suggestions'] = [
        {
          mealTitle: `Super Berry Protein Smoothie for ${input.mealName}`,
          description: "A refreshing and filling smoothie packed with protein and antioxidants, perfect to hit your targets.",
          keyIngredients: ["Protein Powder (Vanilla)", "Mixed Berries", "Spinach", "Almond Milk", "Chia Seeds"],
          estimatedMacros: { 
            calories: Math.round(input.targetCalories * 0.98), 
            protein: Math.round(input.targetProteinGrams * 1.02), 
            carbs: Math.round(input.targetCarbsGrams * 0.95), 
            fat: Math.round(input.targetFatGrams * 0.97)
          }
        },
        {
          mealTitle: `Quick ${input.preferredDiet === 'vegan' ? 'Tofu' : 'Chicken'} Power Bowl`,
          description: `A customizable bowl with your choice of protein, quinoa, and roasted vegetables, seasoned to perfection for ${input.mealName}.`,
          keyIngredients: [input.preferredDiet === 'vegan' ? "Firm Tofu" : "Chicken Breast", "Quinoa", "Broccoli", "Bell Peppers", "Avocado"],
          estimatedMacros: { 
            calories: Math.round(input.targetCalories * 1.01), 
            protein: Math.round(input.targetProteinGrams * 0.99), 
            carbs: Math.round(input.targetCarbsGrams * 1.03), 
            fat: Math.round(input.targetFatGrams * 1.0)
          }
        }
      ];
      
      if (input.mealName.toLowerCase().includes("snack")) {
        mockSuggestionsList.push({
          mealTitle: "Apple Slices with Nut Butter & Seeds",
          description: "A simple, satisfying snack balancing carbs, protein, and healthy fats.",
          keyIngredients: ["Apple", "Almond Butter", "Sunflower Seeds", "Cinnamon"],
           estimatedMacros: { 
            calories: Math.round(input.targetCalories * 0.95), 
            protein: Math.round(input.targetProteinGrams * 0.90), 
            carbs: Math.round(input.targetCarbsGrams * 1.05), 
            fat: Math.round(input.targetFatGrams * 1.02)
          }
        });
      }


    return { suggestions: mockSuggestionsList.slice(0, Math.random() > 0.5 ? 2 : 3) }; // Return 2 or 3 mock suggestions
  }
);

