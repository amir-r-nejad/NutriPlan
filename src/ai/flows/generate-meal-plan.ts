
'use server';
/**
 * @fileOverview An AI agent that generates a personalized weekly meal plan with optimized nutrition.
 *
 * - generatePersonalizedMealPlan - A function that generates a personalized weekly meal plan.
 * - GeneratePersonalizedMealPlanInput - The input type for the generatePersonalizedMealPlan function.
 * - GeneratePersonalizedMealPlanOutput - The return type for the generatePersonalizedMealPlan function.
 */

import {ai} from '@/ai/genkit';
import { geminiPro } from '@genkit-ai/googleai'; // Import geminiPro

interface GeneratePersonalizedMealPlanInput {
  age: number; // The age of the user.
  gender: string; // The gender of the user.
  height_cm: number; // The height of the user in centimeters.
  current_weight: number; // The current weight of the user in kilograms.
  goal_weight_1m: number; // The goal weight of the user in 1 month in kilograms.
  activityLevel: string; // The activity level of the user (e.g., sedentary, light, moderate, active).
  dietGoalOnboarding: string; // The diet goal of the user (e.g., fat_loss, muscle_gain, recomp).
  
  // Optional fields from onboarding/profile
  ideal_goal_weight?: number; // The ideal goal weight of the user in kilograms.
  
  bf_current?: number; // Current body fat percentage.
  bf_target?: number; // Target body fat percentage in 1 month.
  bf_ideal?: number; // Ideal body fat percentage.
  mm_current?: number; // Current muscle mass percentage.
  mm_target?: number; // Target muscle mass percentage in 1 month.
  mm_ideal?: number; // Ideal muscle mass percentage.
  bw_current?: number; // Current body water percentage.
  bw_target?: number; // Target body water percentage in 1 month.
  bw_ideal?: number; // Ideal body water percentage.

  waist_current?: number; // Current waist measurement in centimeters.
  waist_goal_1m?: number; // 1-Month goal for waist measurement in centimeters.
  waist_ideal?: number; // Ideal waist measurement in centimeters.
  hips_current?: number; // Current hips measurement in centimeters.
  hips_goal_1m?: number; // 1-Month goal for hips measurement in centimeters.
  hips_ideal?: number; // Ideal hips measurement in centimeters.
  
  right_leg_current?: number; // Current right leg measurement in centimeters.
  right_leg_goal_1m?: number; // 1-Month goal for right leg measurement in centimeters.
  right_leg_ideal?: number; // Ideal right leg measurement in centimeters.
  left_leg_current?: number; // Current left leg measurement in centimeters.
  left_leg_goal_1m?: number; // 1-Month goal for left leg measurement in centimeters.
  left_leg_ideal?: number; // Ideal left leg measurement in centimeters.
  right_arm_current?: number; // Current right arm measurement in centimeters.
  right_arm_goal_1m?: number; // 1-Month goal for right arm measurement in centimeters.
  right_arm_ideal?: number; // Ideal right arm measurement in centimeters.
  left_arm_current?: number; // Current left arm measurement in centimeters.
  left_arm_goal_1m?: number; // 1-Month goal for left arm measurement in centimeters.
  left_arm_ideal?: number; // Ideal left arm measurement in centimeters.

  preferredDiet?: string; // The preferred diet of the user (e.g., vegetarian, vegan, keto).
  // mealsPerDay removed
  allergies?: string[]; // The allergies of the user.
  preferredCuisines?: string[]; // The preferred cuisines of the user.
  dispreferredCuisines?: string[]; // The dispreferred cuisines of the user.
  preferredIngredients?: string[]; // The preferred ingredients of the user.
  dispreferredIngredients?: string[]; // The dispreferred ingredients of the user.
  preferredMicronutrients?: string[]; // The preferred micronutrients of the user.
  
  medicalConditions?: string[]; // The medical conditions of the user.
  medications?: string[]; // The medications the user is taking.
  
  typicalMealsDescription?: string; // A description of the user’s typical meals and eating habits.
}

interface Meal {
  meal_name: string;
  ingredients: {
    ingredient_name: string;
    quantity_g: number;
    macros_per_100g: {
      calories: number;
      protein_g: number;
      fat_g: number;
    };
  }[];
  total_calories: number;
  total_protein_g: number;
  total_fat_g: number;
}

interface DayPlan {
  day: string; // e.g., "Monday"
  meals: Meal[];
}

interface GeneratePersonalizedMealPlanOutput {
  weeklyMealPlan: DayPlan[]; // A seven-day meal plan.
  weeklySummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  }; // A summary of the total calories, protein, carbs, and fat for the week.
}

export async function generatePersonalizedMealPlan(
  input: GeneratePersonalizedMealPlanInput
): Promise<GeneratePersonalizedMealPlanOutput> {
  return generatePersonalizedMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedMealPlanPrompt',
  model: geminiPro, // Explicitly set the model
  // input: {schema: GeneratePersonalizedMealPlanInputSchema}, // Schema no longer used directly here
  // output: {schema: GeneratePersonalizedMealPlanOutputSchema}, // Schema no longer used directly here
  prompt: `You are a nutritionist who will generate a personalized weekly meal plan based on the user's profile data and preferences.

  User Profile Data:
  Age: {{{age}}}
  Gender: {{{gender}}}
  Height: {{{height_cm}}} cm
  Current Weight: {{{current_weight}}} kg
  Goal Weight (1 Month): {{{goal_weight_1m}}} kg
  {{#if ideal_goal_weight}}Ideal Goal Weight: {{{ideal_goal_weight}}} kg{{/if}}
  
  Activity Level: {{{activityLevel}}}
  Diet Goal: {{{dietGoalOnboarding}}}
  
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

  Based on this information, generate a detailed weekly meal plan with 7 days. Assume 3 main meals and 2 snacks per day unless specified otherwise by a future 'mealsPerDay' field (which is not currently in the input schema). Each meal should be a valid and tasty combination of ingredients.
  Make sure to account for all the user's preferences and dietary restrictions. The meal plan should be optimized for nutrition and should help the user achieve their diet goal.

  Ensure that the weekly summary accurately reflects the total nutritional content of the generated meal plan.
  The meal plan must be returned in the specified JSON format.
  `,
});

const generatePersonalizedMealPlanFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedMealPlanFlow',
    // inputSchema: GeneratePersonalizedMealPlanInputSchema, // Schema no longer used directly here
    // outputSchema: GeneratePersonalizedMealPlanOutputSchema, // Schema no longer used directly here
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
