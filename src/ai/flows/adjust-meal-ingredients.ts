
'use server';
/**
 * @fileOverview An AI agent that adjusts a meal's ingredients to meet specific macronutrient targets.
 *
 * - adjustMealIngredients - A function that takes an existing meal, target macros, and user profile,
 *   then returns an adjusted meal and an explanation.
 * - AdjustMealIngredientsInput - The input type for the adjustMealIngredients function.
 * - AdjustMealIngredientsOutput - The return type for the adjustMealIngredients function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Meal as AppMealSchema, Ingredient as AppIngredientSchema, ProfileFormValues } from '@/lib/schemas'; // Using types from app

// Define Zod schema for ingredients as expected by AI (total macros for given quantity)
const AIServiceIngredientSchema = z.object({
  name: z.string().describe("Name of the ingredient."),
  quantity: z.number().describe("Quantity of the ingredient."),
  unit: z.string().describe("Unit for the quantity (e.g., g, ml, piece)."),
  calories: z.number().describe("Total calories for this quantity of the ingredient."),
  protein: z.number().describe("Total protein (g) for this quantity of the ingredient."),
  carbs: z.number().describe("Total carbohydrates (g) for this quantity of the ingredient."),
  fat: z.number().describe("Total fat (g) for this quantity of the ingredient."),
});

// Define Zod schema for a meal as expected by AI (total macros for given quantity)
const AIServiceMealSchema = z.object({
  name: z.string().describe("Original meal name (e.g., Breakfast, Lunch)."),
  customName: z.string().optional().describe("Custom name of the meal if any (e.g., Chicken Salad). AI can update this if the meal changes significantly."),
  ingredients: z.array(AIServiceIngredientSchema).describe("List of ingredients in the meal."),
  totalCalories: z.number().describe("Total calories for the meal."),
  totalProtein: z.number().describe("Total protein (g) for the meal."),
  totalCarbs: z.number().describe("Total carbohydrates (g) for the meal."),
  totalFat: z.number().describe("Total fat (g) for the meal."),
});


const AdjustMealIngredientsInputSchema = z.object({
  originalMeal: AIServiceMealSchema.describe("The original meal object with its current ingredients and macros."),
  targetMacros: z.object({
    calories: z.number().describe("Target calories for this meal."),
    protein: z.number().describe("Target protein (g) for this meal."),
    carbs: z.number().describe("Target carbohydrates (g) for this meal."),
    fat: z.number().describe("Target fat (g) for this meal."),
  }).describe("The desired macronutrient targets for this meal after adjustment."),
  userProfile: z.object({ // Subset of ProfileFormValues relevant to AI
    age: z.number().optional(),
    gender: z.string().optional(),
    activityLevel: z.string().optional(),
    dietGoal: z.string().optional(),
    preferredDiet: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    dispreferredIngredients: z.array(z.string()).optional(),
    preferredIngredients: z.array(z.string()).optional(),
  }).describe("Relevant user profile information for personalization, including preferences and restrictions."),
});
export type AdjustMealIngredientsInput = z.infer<typeof AdjustMealIngredientsInputSchema>;


const AdjustMealIngredientsOutputSchema = z.object({
  adjustedMeal: AIServiceMealSchema.describe("The meal object after AI adjustments, with new ingredients and recalculated total macros."),
  explanation: z.string().describe("A brief explanation of the changes made by the AI to meet the targets."),
});
export type AdjustMealIngredientsOutput = z.infer<typeof AdjustMealIngredientsOutputSchema>;


export async function adjustMealIngredients(input: AdjustMealIngredientsInput): Promise<AdjustMealIngredientsOutput> {
  return adjustMealIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustMealIngredientsPrompt',
  input: {schema: AdjustMealIngredientsInputSchema},
  output: {schema: AdjustMealIngredientsOutputSchema},
  prompt: `You are an expert nutritionist and chef. Your task is to adjust the ingredients of an existing meal to meet specific macronutrient targets, while considering the user's profile (allergies, preferences).

User Profile:
{{#if userProfile.age}}Age: {{{userProfile.age}}}{{/if}}
{{#if userProfile.gender}}Gender: {{{userProfile.gender}}}{{/if}}
{{#if userProfile.activityLevel}}Activity Level: {{{userProfile.activityLevel}}}{{/if}}
{{#if userProfile.dietGoal}}Diet Goal: {{{userProfile.dietGoal}}}{{/if}}
{{#if userProfile.preferredDiet}}Preferred Diet: {{{userProfile.preferredDiet}}}{{/if}}
{{#if userProfile.allergies.length}}Allergies: {{#each userProfile.allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} (Strictly avoid these){{/if}}
{{#if userProfile.dispreferredIngredients.length}}Disliked Ingredients: {{#each userProfile.dispreferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} (Avoid if possible){{/if}}
{{#if userProfile.preferredIngredients.length}}Preferred Ingredients: {{#each userProfile.preferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} (Try to include if suitable){{/if}}

Original Meal to Adjust:
Meal Name: {{{originalMeal.name}}}
{{#if originalMeal.customName}}Custom Name: {{{originalMeal.customName}}}{{/if}}
Current Ingredients:
{{#each originalMeal.ingredients}}
- {{name}}: {{quantity}} {{unit}} (Cals: {{calories}}, Prot: {{protein}}g, Carbs: {{carbs}}g, Fat: {{fat}}g)
{{/each}}
Current Total Macros: Calories: {{{originalMeal.totalCalories}}}, Protein: {{{originalMeal.totalProtein}}}g, Carbs: {{{originalMeal.totalCarbs}}}g, Fat: {{{originalMeal.totalFat}}}g

Target Macros for this Meal:
Calories: {{{targetMacros.calories}}}
Protein: {{{targetMacros.protein}}}g
Carbohydrates: {{{targetMacros.carbs}}}g
Fat: {{{targetMacros.fat}}}g

Instructions:
1. Analyze the original meal's ingredients and its current total macros.
2. Compare current macros with the target macros.
3. Adjust the meal to meet the target macros as closely as possible. This may involve:
    - Changing quantities of existing ingredients.
    - Swapping ingredients for healthier or more suitable alternatives.
    - Adding new ingredients.
    - Removing ingredients.
4. Adhere strictly to user allergies. Try to accommodate disliked/preferred ingredients.
5. The 'adjustedMeal' output's 'ingredients' array MUST contain the complete new list of ingredients. For each ingredient, you MUST provide its name, quantity, unit, and its TOTAL calories, protein (g), carbs (g), and fat (g) for that specific quantity and unit.
6. Recalculate and provide the new 'totalCalories', 'totalProtein', 'totalCarbs', and 'totalFat' for the 'adjustedMeal' based on the new ingredient list.
7. Provide a concise 'explanation' detailing the main changes you made and why (e.g., "Reduced chicken quantity to lower protein, added avocado for healthy fats to meet calorie target.").

Return the 'adjustedMeal' and 'explanation' in the specified JSON format.
Ensure the 'adjustedMeal.ingredients' list accurately reflects the new composition and that the total macros for 'adjustedMeal' are correctly summed from these new ingredients.
If the original meal was empty or targets are impossible to meet with sensible food choices, try your best to create a new simple meal that fits the targets and preferences, and explain this.
{{$instructions=JSON}}
`,
});

const adjustMealIngredientsFlow = ai.defineFlow(
  {
    name: 'adjustMealIngredientsFlow',
    inputSchema: AdjustMealIngredientsInputSchema,
    outputSchema: AdjustMealIngredientsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return an output for meal adjustment.");
    }
    // Potentially add validation here to ensure output.adjustedMeal.ingredients sum up to output.adjustedMeal.totalMacros
    return output;
  }
);
