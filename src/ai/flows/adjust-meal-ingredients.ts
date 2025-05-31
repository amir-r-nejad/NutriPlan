'use server';

import { ai } from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai';

// Types

export interface AIServiceIngredient {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AIServiceMeal {
  name: string;
  customName?: string;
  ingredients: AIServiceIngredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface AdjustMealIngredientsInput {
  originalMeal: AIServiceMeal;
  targetMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  userProfile: FullProfileType; // <-- imported type you already have
}

export interface AdjustMealIngredientsOutput {
  adjustedMeal: AIServiceMeal;
  explanation: string;
}

// Genkit Flow

export async function adjustMealIngredients(input: AdjustMealIngredientsInput): Promise<AdjustMealIngredientsOutput> {
  return adjustMealIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustMealIngredientsPrompt',
  model: geminiPro,
  input: { type: 'json' },  // <-- use lightweight JSON schema instead of heavy Zod
  output: { type: 'json' },
  prompt: `You are an expert nutritionist and chef. Adjust the following meal to match the target macronutrients, while respecting the user's allergies and preferences.

User Profile:
{{#if userProfile.age}}Age: {{userProfile.age}}{{/if}}
{{#if userProfile.gender}}Gender: {{userProfile.gender}}{{/if}}
{{#if userProfile.activityLevel}}Activity Level: {{userProfile.activityLevel}}{{/if}}
{{#if userProfile.dietGoal}}Diet Goal: {{userProfile.dietGoal}}{{/if}}
{{#if userProfile.preferredDiet}}Preferred Diet: {{userProfile.preferredDiet}}{{/if}}
{{#if userProfile.allergies.length}}Allergies: {{userProfile.allergies}}{{/if}}
{{#if userProfile.dispreferredIngredients.length}}Dislikes: {{userProfile.dispreferredIngredients}}{{/if}}
{{#if userProfile.preferredIngredients.length}}Preferred Ingredients: {{userProfile.preferredIngredients}}{{/if}}

Original Meal:
{{originalMeal}}

Target Macros:
{{targetMacros}}

Instructions:
- Modify ingredients (quantities, swaps, additions, removals) to match target macros.
- Keep totalCalories, totalProtein, totalCarbs, and totalFat fields accurate and correctly summed.
- Avoid allergens, try to respect preferences.
- Output adjustedMeal (with full ingredient breakdown) and explanation.

Return JSON exactly matching AdjustMealIngredientsOutput.
`
});

const adjustMealIngredientsFlow = ai.defineFlow(
  {
    name: 'adjustMealIngredientsFlow',
    inputSchema: undefined, // <-- skip Zod schema entirely
    outputSchema: undefined,
  },
  async (input: AdjustMealIngredientsInput): Promise<AdjustMealIngredientsOutput> => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return an output for meal adjustment.");
    }
    return output as AdjustMealIngredientsOutput;
  }
);
