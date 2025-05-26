
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
  height_cm: z.number().describe('The height of the user in centimeters.'),
  current_weight: z.number().describe('The current weight of the user in kilograms.'),
  goal_weight_1m: z.number().describe('The goal weight of the user in 1 month in kilograms.'),
  activityLevel: z.string().describe('The activity level of the user (e.g., sedentary, light, moderate, active).'),
  dietGoal: z.string().describe('The diet goal of the user (e.g., fat_loss, muscle_gain, recomp).'), // Matched to smartPlannerDietGoals

  // Optional fields from onboarding/profile
  ideal_goal_weight: z.number().optional().describe('The ideal goal weight of the user in kilograms.'),
  
  bf_current: z.number().optional().describe('Current body fat percentage.'),
  bf_target: z.number().optional().describe('Target body fat percentage in 1 month.'),
  bf_ideal: z.number().optional().describe('Ideal body fat percentage.'),
  mm_current: z.number().optional().describe('Current muscle mass percentage.'),
  mm_target: z.number().optional().describe('Target muscle mass percentage in 1 month.'),
  mm_ideal: z.number().optional().describe('Ideal muscle mass percentage.'),
  bw_current: z.number().optional().describe('Current body water percentage.'),
  bw_target: z.number().optional().describe('Target body water percentage in 1 month.'),
  bw_ideal: z.number().optional().describe('Ideal body water percentage.'),

  waist_current: z.number().optional().describe('Current waist measurement in centimeters.'),
  waist_goal_1m: z.number().optional().describe('1-Month goal for waist measurement in centimeters.'),
  waist_ideal: z.number().optional().describe('Ideal waist measurement in centimeters.'),
  hips_current: z.number().optional().describe('Current hips measurement in centimeters.'),
  hips_goal_1m: z.number().optional().describe('1-Month goal for hips measurement in centimeters.'),
  hips_ideal: z.number().optional().describe('Ideal hips measurement in centimeters.'),
  
  right_leg_current: z.number().optional().describe('Current right leg measurement in centimeters.'),
  right_leg_goal_1m: z.number().optional().describe('1-Month goal for right leg measurement in centimeters.'),
  right_leg_ideal: z.number().optional().describe('Ideal right leg measurement in centimeters.'),
  left_leg_current: z.number().optional().describe('Current left leg measurement in centimeters.'),
  left_leg_goal_1m: z.number().optional().describe('1-Month goal for left leg measurement in centimeters.'),
  left_leg_ideal: z.number().optional().describe('Ideal left leg measurement in centimeters.'),
  right_arm_current: z.number().optional().describe('Current right arm measurement in centimeters.'),
  right_arm_goal_1m: z.number().optional().describe('1-Month goal for right arm measurement in centimeters.'),
  right_arm_ideal: z.number().optional().describe('Ideal right arm measurement in centimeters.'),
  left_arm_current: z.number().optional().describe('Current left arm measurement in centimeters.'),
  left_arm_goal_1m: z.number().optional().describe('1-Month goal for left arm measurement in centimeters.'),
  left_arm_ideal: z.number().optional().describe('Ideal left arm measurement in centimeters.'),

  preferredDiet: z.string().optional().describe('The preferred diet of the user (e.g., vegetarian, vegan, keto).'),
  mealsPerDay: z.number().optional().describe('The number of meals per day the user prefers.'),
  allergies: z.array(z.string()).optional().describe('The allergies of the user.'),
  preferredCuisines: z.array(z.string()).optional().describe('The preferred cuisines of the user.'),
  dispreferredCuisines: z.array(z.string()).optional().describe('The dispreferred cuisines of the user.'),
  preferredIngredients: z.array(z.string()).optional().describe('The preferred ingredients of the user.'),
  dispreferredIngredients: z.array(z.string()).optional().describe('The dispreferred ingredients of the user.'),
  preferredMicronutrients: z.array(z.string()).optional().describe('The preferred micronutrients of the user.'),
  
  medicalConditions: z.array(z.string()).optional().describe('The medical conditions of the user.'),
  medications: z.array(z.string()).optional().describe('The medications the user is taking.'),
  
  typicalMealsDescription: z.string().optional().describe('A description of the user’s typical meals and eating habits.'),

  // Exercise preferences (can be added from profile schema if needed for AI context)
  // painMobilityIssues: z.string().optional(),
  // injuries: z.array(z.string()).optional(),
  // surgeries: z.array(z.string()).optional(),
  // exerciseGoals: z.array(z.string()).optional(),
  // exercisePreferences: z.array(z.string()).optional(),
  // exerciseFrequency: z.string().optional(),
  // exerciseIntensity: z.string().optional(),
  // equipmentAccess: z.array(z.string()).optional(),
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
  Height: {{{height_cm}}} cm
  Current Weight: {{{current_weight}}} kg
  Goal Weight (1 Month): {{{goal_weight_1m}}} kg
  {{#if ideal_goal_weight}}Ideal Goal Weight: {{{ideal_goal_weight}}} kg{{/if}}
  
  Activity Level: {{{activityLevel}}}
  Diet Goal: {{{dietGoal}}}
  {{#if mealsPerDay}}Meals Per Day: {{{mealsPerDay}}}{{/if}}

  {{#if bf_current}}Current Body Fat: {{{bf_current}}}%{{/if}}
  {{#if bf_target}}Target Body Fat (1 Month): {{{bf_target}}}%{{/if}}
  {{#if bf_ideal}}Ideal Body Fat: {{{bf_ideal}}}%{{/if}}
  {{#if mm_current}}Current Muscle Mass: {{{mm_current}}}%{{/if}}
  {{#if mm_target}}Target Muscle Mass (1 Month): {{{mm_target}}}%{{/if}}
  {{#if mm_ideal}}Ideal Muscle Mass: {{{mm_ideal}}}%{{/if}}
  {{#if bw_current}}Current Body Water: {{{bw_current}}}%{{/if}}
  {{#if bw_target}}Target Body Water (1 Month): {{{bw_target}}}%{{/if}}
  {{#if bw_ideal}}Ideal Body Water: {{{bw_ideal}}}%{{/if}}
  
  Measurements (cm):
  {{#if waist_current}}Waist (Current): {{{waist_current}}}{{/if}}
  {{#if waist_goal_1m}}Waist (1-Month Goal): {{{waist_goal_1m}}}{{/if}}
  {{#if waist_ideal}}Waist (Ideal): {{{waist_ideal}}}{{/if}}
  {{#if hips_current}}Hips (Current): {{{hips_current}}}{{/if}}
  {{#if hips_goal_1m}}Hips (1-Month Goal): {{{hips_goal_1m}}}{{/if}}
  {{#if hips_ideal}}Hips (Ideal): {{{hips_ideal}}}{{/if}}
  {{#if right_leg_current}}Right Leg (Current): {{{right_leg_current}}}{{/if}}
  {{#if right_leg_goal_1m}}Right Leg (1-Month Goal): {{{right_leg_goal_1m}}}{{/if}}
  {{#if right_leg_ideal}}Right Leg (Ideal): {{{right_leg_ideal}}}{{/if}}
  {{#if left_leg_current}}Left Leg (Current): {{{left_leg_current}}}{{/if}}
  {{#if left_leg_goal_1m}}Left Leg (1-Month Goal): {{{left_leg_goal_1m}}}{{/if}}
  {{#if left_leg_ideal}}Left Leg (Ideal): {{{left_leg_ideal}}}{{/if}}
  {{#if right_arm_current}}Right Arm (Current): {{{right_arm_current}}}{{/if}}
  {{#if right_arm_goal_1m}}Right Arm (1-Month Goal): {{{right_arm_goal_1m}}}{{/if}}
  {{#if right_arm_ideal}}Right Arm (Ideal): {{{right_arm_ideal}}}{{/if}}
  {{#if left_arm_current}}Left Arm (Current): {{{left_arm_current}}}{{/if}}
  {{#if left_arm_goal_1m}}Left Arm (1-Month Goal): {{{left_arm_goal_1m}}}{{/if}}
  {{#if left_arm_ideal}}Left Arm (Ideal): {{{left_arm_ideal}}}{{/if}}

  Dietary Preferences & Restrictions:
  {{#if preferredDiet}}Preferred Diet: {{{preferredDiet}}}{{/if}}
  {{#if allergies.length}}Allergies: {{#each allergies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} (Strictly avoid these){{/if}}
  {{#if preferredCuisines.length}}Preferred Cuisines: {{#each preferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if dispreferredCuisines.length}}Dispreferred Cuisines: {{#each dispreferredCuisines}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if preferredIngredients.length}}Preferred Ingredients: {{#each preferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if dispreferredIngredients.length}}Dispreferred Ingredients: {{#each dispreferredIngredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if preferredMicronutrients.length}}Targeted Micronutrients: {{#each preferredMicronutrients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

  Medical Information (for AI awareness):
  {{#if medicalConditions.length}}Medical Conditions: {{#each medicalConditions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#if medications.length}}Medications: {{#each medications}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  
  {{#if typicalMealsDescription}}User's Typical Meals/Habits: {{{typicalMealsDescription}}}{{/if}}

  Based on this information, generate a detailed weekly meal plan with 7 days. Each day should include the number of meals specified by 'mealsPerDay' if available, otherwise assume 3 main meals and 2 snacks. Each meal should be a valid and tasty combination of ingredients.
  Make sure to account for all the user's preferences and dietary restrictions. The meal plan should be optimized for nutrition and should help the user achieve their diet goal.

  Ensure that the weekly summary accurately reflects the total nutritional content of the generated meal plan.
  The meal plan must be returned in the specified JSON format.
  `,
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
