
import {genkit} from 'genkit';
import openAI, { gpt41Nano } from 'genkitx-openai';


// Genkit AI initialization
export const ai = genkit({
  plugins: [
    openAI({apiKey: process.env.OPEN_AI_APIKEY}) // Use Google AI plugin
  ],
  model: gpt41Nano, // Set geminiPro as the default model
});
