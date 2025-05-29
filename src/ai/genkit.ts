
import {genkit} from 'genkit';
import { googleAI } from '@genkit-ai/googleai'; // Removed geminiPro import

// Genkit AI initialization
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GOOGLE_API_KEY}) // Use Google AI plugin
  ],
  model: 'gemini-1.0-pro', // Set default model using string identifier
});

