
'use server';
/**
 * @fileOverview A support chatbot for the NutriPlan application.
 *
 * - supportChatbotFlow - A function that handles user queries about the website.
 * - SupportChatbotInput - The input type for the supportChatbotFlow function.
 * - SupportChatbotOutput - The return type for the supportChatbotFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SupportChatbotInputSchema = z.object({
  userQuery: z.string().describe("The user's question about how to use the NutriPlan website or its features."),
});
export type SupportChatbotInput = z.infer<typeof SupportChatbotInputSchema>;

const SupportChatbotOutputSchema = z.object({
  botResponse: z.string().describe("The chatbot's answer to the user's query."),
});
export type SupportChatbotOutput = z.infer<typeof SupportChatbotOutputSchema>;

export async function handleSupportQuery(input: SupportChatbotInput): Promise<SupportChatbotOutput> {
  return supportChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'supportChatbotPrompt',
  input: {schema: SupportChatbotInputSchema},
  output: {schema: SupportChatbotOutputSchema},
  prompt: `You are a friendly and helpful support chatbot for "NutriPlan", a web application designed for personalized nutrition and meal planning.
Your role is to answer user questions about how to use the website and its features.
Focus ONLY on website functionality, navigation, and how to use specific tools.
Do NOT provide any nutritional advice, medical advice, or opinions on diet plans. If asked for such advice, politely decline and redirect the user to consult a professional or explain that your purpose is to help with website usage.

Available NutriPlan features you can talk about:
- Dashboard: Overview of the app.
- Profile: Where users manage general medical information and exercise preferences. Detailed physical metrics and dietary preferences are managed in specific tools.
- Smart Calorie Planner: Calculates daily calorie and macro targets based on user stats, goals, body composition, and measurements.
- Daily Macro Breakdown: A tool to calculate daily macronutrient breakdown based on weight, protein per kg, target calories, and carb/fat percentage split.
- Macro Splitter: Allows users to distribute their total daily macros across 6 meals by percentage.
- Meal Suggestions: Provides AI-powered meal ideas based on macronutrient targets for a specific meal, adjusted with user preferences.
- Current Meal Plan: Page to view, manage, and manually edit the weekly meal schedule. Users can also AI-optimize individual meals here.
- AI Meal Plan: Generates a full, AI-optimized weekly meal plan based on comprehensive user profile data.

When answering, be concise and clear. Guide the user on how to perform actions or find information on the website.

User's question: {{{userQuery}}}
`,
});

const supportChatbotFlow = ai.defineFlow(
  {
    name: 'supportChatbotFlow',
    inputSchema: SupportChatbotInputSchema,
    outputSchema: SupportChatbotOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return { botResponse: "I'm sorry, I couldn't process your request at the moment. Please try again." };
    }
    return output;
  }
);
