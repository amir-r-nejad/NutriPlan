
import {genkit} from 'genkit';
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';


// Genkit AI initialization
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.NEXT_PUBLIC_GEMINI_KEY }) // Use Google AI plugin
  ],
  model: gemini15Flash, // Set geminiPro as the default model
});
