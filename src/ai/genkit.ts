
import {genkit} from 'genkit';
import { googleAI, geminiPro } from '@genkit-ai/googleai'; // Re-import geminiPro

// Genkit AI initialization
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GOOGLE_API_KEY}) // Use Google AI plugin
  ],
  model: geminiPro, // Set default model using the imported object
});

