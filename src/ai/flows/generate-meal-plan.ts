'use server';
/**
 * @fileOverview An AI agent that generates a personalized weekly meal plan with optimized nutrition.
 *
 * - generatePersonalizedMealPlan - A function that generates a personalized weekly meal plan.
 * - GeneratePersonalizedMealPlanInput - The input type for the generatePersonalizedMealPlan function.
 * - GeneratePersonalizedMealPlanOutput - The return type for the generatePersonalizedMealPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedMealPlanInputSchema = z.object({
  age: z.number().describe('The age of the user.'),
  gender: z.string().describe('The gender of the user.'),
  height: z.number().describe('The height of the user in centimeters.'),
  currentWeight: z.number().describe('The current weight of the user in kilograms.'),
  goalWeight: z.number().describe('The goal weight of the user in kilograms.'),
  bodyFatPercentage: z.number().describe('The current body fat percentage of the user.'),
  muscleMassPercentage: z.number().describe('The current muscle mass percentage of the user.'),
  waterPercentage: z.number().describe('The current water percentage of the user.'),
  waistMeasurement: z.number().describe('The current waist measurement of the user in centimeters.'),
  hipsMeasurement: z.number().describe('The current hips measurement of the user in centimeters.'),
  limbsMeasurement: z.number().describe('The current limbs measurement of the user in centimeters.'),
  activityLevel: z.string().describe('The activity level of the user (e.g., sedentary, light, moderate, active).'),
  dietGoal: z.string().describe('The diet goal of the user (e.g., lose weight, maintain weight, gain weight).'),
  preferredDiet: z.string().describe('The preferred diet of the user (e.g., vegetarian, vegan, keto).'),
  preferredCuisines: z.array(z.string()).describe('The preferred cuisines of the user.'),
  dispreferredCuisines: z.array(z.string()).describe('The dispreferred cuisines of the user.'),
  preferredIngredients: z.array(z.string()).describe('The preferred ingredients of the user.'),
  dispreferredIngredients: z.array(z.string()).describe('The dispreferred ingredients of the user.'),
  allergies: z.array(z.string()).describe('The allergies of the user.'),
  mealsPerDay: z.number().describe('The number of meals per day the user prefers.'),
  preferredMicronutrients: z.array(z.string()).describe('The preferred micronutrients of the user.'),
  medicalConditions: z.array(z.string()).describe('The medical conditions of the user.'),
  medications: z.array(z.string()).describe('The medications the user is taking.'),
  painMobilityIssues: z.string().describe('The pain or mobility issues of the user.'),
  injuries: z.array(z.string()).describe('The injuries of the user.'),
  surgeries: z.array(z.string()).describe('The surgeries the user has had.'),
  exerciseGoals: z.array(z.string()).describe('The exercise goals of the user.'),
  exercisePreferences: z.array(z.string()).describe('The exercise preferences of the user.'),
  exerciseFrequency: z.string().describe('The exercise frequency of the user.'),
  exerciseIntensity: z.string().describe('The exercise intensity of the user.'),
  equipmentAccess: z.array(z.string()).describe('The equipment access of the user.'),
});
export type GeneratePersonalizedMealPlanInput = z.infer<
  typeof GeneratePersonalizedMealPlanInputSchema
>;

const MealSchema = z.object({
  meal_name: z.string(),
  ingredients: z.array(
    z.object({
      ingredient_name: z.string(),
      quantity_g: z.number(),
      macros_per_100g: z.object({
        calories: z.number(),
        protein_g: z.number(),
        fat_g: z.number(),
      }),
    })
  ),
  total_calories: z.number(),
  total_protein_g: z.number(),
  total_fat_g: z.number(),
});

const DayPlanSchema = z.object({
  day: z.string(), // e.g., "Monday"
  meals: z.array(MealSchema),
});

const GeneratePersonalizedMealPlanOutputSchema = z.object({
  weeklyMealPlan: z.array(DayPlanSchema).describe('A seven-day meal plan.'),
  weeklySummary: z
    .object({
      totalCalories: z.number(),
      totalProtein: z.number(),
      totalCarbs: z.number(),
      totalFat: z.number(),
    })
    .describe('A summary of the total calories, protein, carbs, and fat for the week.'),
});

export type GeneratePersonalizedMealPlanOutput = z.infer<
  typeof GeneratePersonalizedMealPlanOutputSchema
>;

export async function generatePersonalizedMealPlan(
  input: GeneratePersonalizedMealPlanInput
): Promise<GeneratePersonalizedMealPlanOutput> {
  return generatePersonalizedMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedMealPlanPrompt',
  input: {schema: GeneratePersonalizedMealPlanInputSchema},
  output: {schema: GeneratePersonalizedMealPlanOutputSchema},
  prompt: `You are a nutritionist who will generate a personalized weekly meal plan based on the user's profile data and preferences.

  User Profile Data:
  Age: {{{age}}}
  Gender: {{{gender}}}
  Height: {{{height}}} cm
  Current Weight: {{{currentWeight}}} kg
  Goal Weight: {{{goalWeight}}} kg
  Body Fat Percentage: {{{bodyFatPercentage}}}%
  Muscle Mass Percentage: {{{muscleMassPercentage}}}%
  Water Percentage: {{{waterPercentage}}}%
  Waist Measurement: {{{waistMeasurement}}} cm
  Hips Measurement: {{{hipsMeasurement}}} cm
  Limbs Measurement: {{{limbsMeasurement}}} cm

  Dietary Preferences:
  Activity Level: {{{activityLevel}}}
  Diet Goal: {{{dietGoal}}}
  Preferred Diet: {{{preferredDiet}}}
  Preferred Cuisines: {{#each preferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Dispreferred Cuisines: {{#each dispreferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Preferred Ingredients: {{#each preferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Dispreferred Ingredients: {{#each dispreferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Allergies: {{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Meals Per Day: {{{mealsPerDay}}}
  Preferred Micronutrients: {{#each preferredMicronutrients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Medical Information:
  Medical Conditions: {{#each medicalConditions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Medications: {{#each medications}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Pain/Mobility Issues: {{{painMobilityIssues}}}
  Injuries: {{#each injuries}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Surgeries: {{#each surgeries}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Exercise Preferences:
  Exercise Goals: {{#each exerciseGoals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Exercise Preferences: {{#each exercisePreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Exercise Frequency: {{{exerciseFrequency}}}
  Exercise Intensity: {{{exerciseIntensity}}}
  Equipment Access: {{#each equipmentAccess}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Based on this information, generate a detailed weekly meal plan with 7 days and each day including the prescribed amount of meals. Each meal should be a valid and tasty combination of ingredients.
  Make sure to account for all the user's preferences and dietary restrictions. The meal plan should be optimized for nutrition and should help the user achieve their diet goal.

  Ensure that the weekly summary accurately reflects the total nutritional content of the generated meal plan.
  The meal plan must be returned in the following JSON format:
  {{$instructions=JSON}}
  `,//Instruct the LLM to respond in JSON format.
  
});

const generatePersonalizedMealPlanFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedMealPlanFlow',
    inputSchema: GeneratePersonalizedMealPlanInputSchema,
    outputSchema: GeneratePersonalizedMealPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
