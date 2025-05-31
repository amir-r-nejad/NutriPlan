
import {genkit} from 'genkit';
import { googleAI, geminiPro } from '@genkit-ai/googleai'; // Ensure geminiPro is imported

// Genkit AI initialization
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GOOGLE_API_KEY}) // Use Google AI plugin
  ],
  model: geminiPro, // Set geminiPro as the default model
});
