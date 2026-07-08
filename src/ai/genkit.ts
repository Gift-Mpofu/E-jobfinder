import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_AI_KEY ?? process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.5-flash',
});

