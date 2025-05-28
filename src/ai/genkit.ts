
import {genkit} from 'genkit';
import { googleAI, geminiPro } from '@genkit-ai/googleai'; // Switched to Google AI

// Genkit AI initialization
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GOOGLE_API_KEY}) // Use Google AI plugin
  ],
  model: geminiPro, // Set a default Gemini model (e.g., gemini-1.0-pro)
});
