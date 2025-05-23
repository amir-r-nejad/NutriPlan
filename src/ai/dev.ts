
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-meal-plan.ts';
import '@/ai/flows/suggest-ingredient-swap.ts';
import '@/ai/flows/suggest-meals-for-macros.ts';
import '@/ai/flows/adjust-meal-ingredients.ts';
import '@/ai/flows/support-chatbot-flow.ts'; // Added new flow
