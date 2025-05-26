import {genkit} from 'genkit';
import openAI, { gpt41Nano } from 'genkitx-openai';


export const ai = genkit({
  plugins: [openAI({apiKey: process.env.OPEN_AI_APIKEY})],
  model: gpt41Nano,
});
