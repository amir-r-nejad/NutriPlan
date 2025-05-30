
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
import { geminiPro } from '@genkit-ai/googleai'; // Import geminiPro
import type { Meal as AppMealSchema, Ingredient as AppIngredientSchema, FullProfileType } from '@/lib/schemas'; // Using types from app

// Define interface for ingredients as expected by AI (total macros for given quantity)
interface AIServiceIngredient {
  name: string;
  quantity: number;
  unit: string; // e.g., g, ml, piece
  calories: z.number().describe("Total calories for this specific quantity of the ingredient."),
  protein: z.number().describe("Total protein (g) for this specific quantity of the ingredient."),
  carbs: z.number().describe("Total carbohydrates (g) for this specific quantity of the ingredient."),
  fat: z.number().describe("Total fat (g) for this specific quantity of the ingredient."),
});

// Define Zod schema for a meal as expected by AI (macros are totals for given quantities)
interface AIServiceMeal {
  name: string; // Original meal name (e.g., Breakfast, Lunch). This should generally not be changed by the AI unless the meal becomes fundamentally different.
  customName?: string; // Custom name of the meal if any (e.g., Chicken Salad). AI can update this if the meal changes significantly.
  ingredients: AIServiceIngredient[]; // List of ingredients in the meal. Each ingredient MUST have its nutritional information (calories, protein, carbs, fat) correctly calculated for its specified quantity and unit.
  totalCalories: number; // Total calories for the meal. This MUST be the sum of 'calories' from the 'ingredients' list.
  totalProtein: number; // Total protein (g) for the meal. This MUST be the sum of 'protein' from the 'ingredients' list.
  totalCarbs: number; // Total carbohydrates (g) for the meal. This MUST be the sum of 'carbs' from the 'ingredients' list.
  totalFat: number; // Total fat (g) for the meal. This MUST be the sum of 'fat' from the 'ingredients' list.
}


interface AdjustMealIngredientsInput {
  originalMeal: AIServiceMeal; // The original meal object with its current ingredients and macros.
  targetMacros: {
    calories: number; // Target calories for this meal.
    protein: number; // Target protein (g) for this meal.
    carbs: number; // Target carbohydrates (g) for this meal.
    fat: number; // Target fat (g) for this meal.
  }; // The desired macronutrient targets for this meal after adjustment.
  userProfile: { // Relevant user profile information for personalization, including preferences and restrictions.
    age: z.number().optional(),
    gender?: string;
    activityLevel?: string;
    dietGoal?: string;
    preferredDiet?: string;
    allergies?: string[];
    dispreferredIngredients?: string[];
    preferredIngredients?: string[];
  };
}


interface AdjustMealIngredientsOutput {
  adjustedMeal: AIServiceMeal; // The meal object after AI adjustments, with new ingredients and recalculated total macros. All ingredient nutritional values MUST be for their specific quantities. The meal's total macros MUST be the sum of its ingredients' macros.
  explanation: string; // A brief explanation of the changes made by the AI to meet the targets.
}


export async function adjustMealIngredients(input: AdjustMealIngredientsInput): Promise<AdjustMealIngredientsOutput> {
  return adjustMealIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustMealIngredientsPrompt',
  model: geminiPro, // Explicitly set the model
  input: {schema: AdjustMealIngredientsInputSchema},
  output: {schema: AdjustMealIngredientsOutputSchema},
  prompt: `You are an expert nutritionist and chef. Your task is to adjust the ingredients of an existing meal to meet specific macronutrient targets, while considering the user's profile (allergies, preferences).

User Profile:
{{#if userProfile.age}}Age: {{{userProfile.age}}}{{/if}}
{{#if userProfile.gender}}Gender: {{{userProfile.gender}}}{{/if}}
{{#if userProfile.activityLevel}}Activity Level: {{{userProfile.activityLevel}}}{{/if}}
{{#if userProfile.dietGoal}}Diet Goal: {{{userProfile.dietGoal}}}{{/if}}
{{#if userProfile.preferredDiet}}Preferred Diet: {{{userProfile.preferredDiet}}}{{/if}}
{{#if userProfile.allergies.length}}Allergies: {{#each userProfile.allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} (Strictly avoid these ingredients){{/if}}
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
    - Swapping ingredients for healthier or more suitable alternatives (respecting allergies and preferences).
    - Adding new ingredients.
    - Removing ingredients.
4. For the 'adjustedMeal.ingredients' output, for EACH ingredient, you MUST provide:
    - 'name': The name of the ingredient.
    - 'quantity': The new quantity of this ingredient.
    - 'unit': The unit for the quantity (e.g., g, ml, piece).
    - 'calories': TOTAL calories for THIS SPECIFIC QUANTITY of this ingredient.
    - 'protein': TOTAL protein (g) for THIS SPECIFIC QUANTITY of this ingredient.
    - 'carbs': TOTAL carbohydrates (g) for THIS SPECIFIC QUANTITY of this ingredient.
    - 'fat': TOTAL fat (g) for THIS SPECIFIC QUANTITY of this ingredient.
5.  The 'adjustedMeal' output's 'totalCalories', 'totalProtein', 'totalCarbs', and 'totalFat' MUST be the accurate sum of the respective nutritional values from the 'ingredients' list you provide. Double-check your calculations.
6.  Provide a concise 'explanation' detailing the main changes you made and why (e.g., "Reduced chicken quantity to lower protein, added avocado for healthy fats to meet calorie target.").
7.  If the original meal was empty or targets are very hard to meet with the original items, try to create a new simple meal that fits the targets and preferences, and explain this. The adjusted meal name ('name' field of AIServiceMealSchema) should ideally remain the same as the original meal's name unless the meal is fundamentally changed. The 'customName' can be updated or added.

Return the 'adjustedMeal' and 'explanation' in the specified JSON format.
Ensure all fields in the 'adjustedMeal' (especially the ingredients list and total macros) are complete and accurate.
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
    // TODO: Potentially add validation here to ensure output.adjustedMeal.ingredients sum up to output.adjustedMeal.totalMacros
    // For example:
    // let calSum = 0; output.adjustedMeal.ingredients.forEach(ing => calSum += ing.calories);
    // if (Math.abs(calSum - output.adjustedMeal.totalCalories) > 5) { /* throw error or log warning */ }
    return output;
  }
);

