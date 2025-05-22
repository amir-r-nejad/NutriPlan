
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
  bodyFatPercentage: z.number().optional().describe('The current body fat percentage of the user.'),
  muscleMassPercentage: z.number().optional().describe('The current muscle mass percentage of the user.'),
  waterPercentage: z.number().optional().describe('The current water percentage of the user.'),
  waistMeasurement: z.number().optional().describe('The current waist measurement of the user in centimeters.'),
  hipsMeasurement: z.number().optional().describe('The current hips measurement of the user in centimeters.'),
  
  rightLegMeasurementCurrent: z.number().optional().describe('Current right leg measurement in centimeters.'),
  rightLegMeasurementGoal1Month: z.number().optional().describe('1-Month goal for right leg measurement in centimeters.'),
  rightLegMeasurementIdeal: z.number().optional().describe('Ideal right leg measurement in centimeters.'),
  leftLegMeasurementCurrent: z.number().optional().describe('Current left leg measurement in centimeters.'),
  leftLegMeasurementGoal1Month: z.number().optional().describe('1-Month goal for left leg measurement in centimeters.'),
  leftLegMeasurementIdeal: z.number().optional().describe('Ideal left leg measurement in centimeters.'),
  rightArmMeasurementCurrent: z.number().optional().describe('Current right arm measurement in centimeters.'),
  rightArmMeasurementGoal1Month: z.number().optional().describe('1-Month goal for right arm measurement in centimeters.'),
  rightArmMeasurementIdeal: z.number().optional().describe('Ideal right arm measurement in centimeters.'),
  leftArmMeasurementCurrent: z.number().optional().describe('Current left arm measurement in centimeters.'),
  leftArmMeasurementGoal1Month: z.number().optional().describe('1-Month goal for left arm measurement in centimeters.'),
  leftArmMeasurementIdeal: z.number().optional().describe('Ideal left arm measurement in centimeters.'),

  activityLevel: z.string().describe('The activity level of the user (e.g., sedentary, light, moderate, active).'),
  dietGoal: z.string().describe('The diet goal of the user (e.g., lose weight, maintain weight, gain weight).'),
  preferredDiet: z.string().optional().describe('The preferred diet of the user (e.g., vegetarian, vegan, keto).'),
  preferredCuisines: z.array(z.string()).optional().describe('The preferred cuisines of the user.'),
  dispreferredCuisines: z.array(z.string()).optional().describe('The dispreferred cuisines of the user.'),
  preferredIngredients: z.array(z.string()).optional().describe('The preferred ingredients of the user.'),
  dispreferredIngredients: z.array(z.string()).optional().describe('The dispreferred ingredients of the user.'),
  allergies: z.array(z.string()).optional().describe('The allergies of the user.'),
  mealsPerDay: z.number().describe('The number of meals per day the user prefers.'),
  preferredMicronutrients: z.array(z.string()).optional().describe('The preferred micronutrients of the user.'),
  medicalConditions: z.array(z.string()).optional().describe('The medical conditions of the user.'),
  medications: z.array(z.string()).optional().describe('The medications the user is taking.'),
  painMobilityIssues: z.string().optional().describe('The pain or mobility issues of the user.'),
  injuries: z.array(z.string()).optional().describe('The injuries of the user.'),
  surgeries: z.array(z.string()).optional().describe('The surgeries the user has had.'),
  exerciseGoals: z.array(z.string()).optional().describe('The exercise goals of the user.'),
  exercisePreferences: z.array(z.string()).optional().describe('The exercise preferences of the user.'),
  exerciseFrequency: z.string().optional().describe('The exercise frequency of the user.'),
  exerciseIntensity: z.string().optional().describe('The exercise intensity of the user.'),
  equipmentAccess: z.array(z.string()).optional().describe('The equipment access of the user.'),
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
  {{#if bodyFatPercentage}}Body Fat Percentage: {{{bodyFatPercentage}}}%{{/if}}
  {{#if muscleMassPercentage}}Muscle Mass Percentage: {{{muscleMassPercentage}}}%{{/if}}
  {{#if waterPercentage}}Water Percentage: {{{waterPercentage}}}%{{/if}}
  
  Measurements (cm):
  {{#if waistMeasurement}}Waist Measurement: {{{waistMeasurement}}} cm{{/if}}
  {{#if hipsMeasurement}}Hips Measurement: {{{hipsMeasurement}}} cm{{/if}}
  {{#if rightLegMeasurementCurrent}}Right Leg (Current): {{{rightLegMeasurementCurrent}}} cm{{/if}}
  {{#if rightLegMeasurementGoal1Month}}Right Leg (1-Month Goal): {{{rightLegMeasurementGoal1Month}}} cm{{/if}}
  {{#if rightLegMeasurementIdeal}}Right Leg (Ideal): {{{rightLegMeasurementIdeal}}} cm{{/if}}
  {{#if leftLegMeasurementCurrent}}Left Leg (Current): {{{leftLegMeasurementCurrent}}} cm{{/if}}
  {{#if leftLegMeasurementGoal1Month}}Left Leg (1-Month Goal): {{{leftLegMeasurementGoal1Month}}} cm{{/if}}
  {{#if leftLegMeasurementIdeal}}Left Leg (Ideal): {{{leftLegMeasurementIdeal}}} cm{{/if}}
  {{#if rightArmMeasurementCurrent}}Right Arm (Current): {{{rightArmMeasurementCurrent}}} cm{{/if}}
  {{#if rightArmMeasurementGoal1Month}}Right Arm (1-Month Goal): {{{rightArmMeasurementGoal1Month}}} cm{{/if}}
  {{#if rightArmMeasurementIdeal}}Right Arm (Ideal): {{{rightArmMeasurementIdeal}}} cm{{/if}}
  {{#if leftArmMeasurementCurrent}}Left Arm (Current): {{{leftArmMeasurementCurrent}}} cm{{/if}}
  {{#if leftArmMeasurementGoal1Month}}Left Arm (1-Month Goal): {{{leftArmMeasurementGoal1Month}}} cm{{/if}}
  {{#if leftArmMeasurementIdeal}}Left Arm (Ideal): {{{leftArmMeasurementIdeal}}} cm{{/if}}

  Dietary Preferences:
  Activity Level: {{{activityLevel}}}
  Diet Goal: {{{dietGoal}}}
  {{#if preferredDiet}}Preferred Diet: {{{preferredDiet}}}{{/if}}
  {{#if preferredCuisines.length}}Preferred Cuisines: {{#each preferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if dispreferredCuisines.length}}Dispreferred Cuisines: {{#each dispreferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if preferredIngredients.length}}Preferred Ingredients: {{#each preferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if dispreferredIngredients.length}}Dispreferred Ingredients: {{#each dispreferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if allergies.length}}Allergies: {{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  Meals Per Day: {{{mealsPerDay}}}
  {{#if preferredMicronutrients.length}}Preferred Micronutrients: {{#each preferredMicronutrients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

  Medical Information:
  {{#if medicalConditions.length}}Medical Conditions: {{#each medicalConditions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if medications.length}}Medications: {{#each medications}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if painMobilityIssues}}Pain/Mobility Issues: {{{painMobilityIssues}}}{{/if}}
  {{#if injuries.length}}Injuries: {{#each injuries}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if surgeries.length}}Surgeries: {{#each surgeries}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

  Exercise Preferences:
  {{#if exerciseGoals.length}}Exercise Goals: {{#each exerciseGoals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if exercisePreferences.length}}Exercise Preferences: {{#each exercisePreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if exerciseFrequency}}Exercise Frequency: {{{exerciseFrequency}}}{{/if}}
  {{#if exerciseIntensity}}Exercise Intensity: {{{exerciseIntensity}}}{{/if}}
  {{#if equipmentAccess.length}}Equipment Access: {{#each equipmentAccess}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

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

