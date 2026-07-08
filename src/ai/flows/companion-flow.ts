'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string()
});

export type CompanionMessage = z.infer<typeof MessageSchema>;

const companionFlow = ai.defineFlow(
  {
    name: 'companionFlow',
    inputSchema: z.object({
      history: z.array(MessageSchema),
      prompt: z.string(),
    }),
    outputSchema: z.string(),
  },
  async ({ history, prompt }) => {
    const systemPrompt = `You are 'Bubbl', a friendly and highly knowledgeable AI career companion built exclusively for the E-Job Finder platform. 

Your STRICT directive is to ONLY answer questions related to:
1. Careers, Jobs, and the Employment Market.
2. CV, Resume building, and Cover Letters.
3. Job interviewing tips and strategies.
4. Explaining how the E-Job Finder app works (it scans CVs against job descriptions).

If the user asks you about ANYTHING outside of these constraints (such as coding specific algorithms, general knowledge, math, pop culture, writing code, or anything unrelated to career development), you must politely decline and state: "I'm your career companion! Let's keep the focus on finding your next great job or improving your CV."

Be encouraging, concise, and highly professional.`;

    // Map history to official genkit format
    const messages: any[] = [
      { role: 'system', content: [{ text: systemPrompt }] },
      ...history.map(msg => ({ 
        role: msg.role === 'model' ? 'model' : 'user', 
        content: [{ text: msg.content }] 
      })),
      { role: 'user', content: [{ text: prompt }] }
    ];

    const { text } = await ai.generate({
      messages,
      config: {
          temperature: 0.7,
      }
    });

    return text;
  }
);

export async function askBubbl(history: CompanionMessage[], prompt: string): Promise<string> {
    return companionFlow({ history, prompt });
}
