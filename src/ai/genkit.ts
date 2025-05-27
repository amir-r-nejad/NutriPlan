
import {genkit} from 'genkit';
import openAI, { gpt41Nano } from 'genkitx-openai'; // Ensure this line is processed

// Genkit AI initialization
export const ai = genkit({
  plugins: [openAI({apiKey: process.env.OPEN_AI_APIKEY})],
  model: gpt41Nano,
});
