'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CoverLetterInputSchema = z.object({
  cvContent: z.string().describe("The full text content of the user's CV."),
  jobTitle: z.string().describe('The job title being applied for.'),
  company: z.string().describe('The company name.'),
  jobDescription: z.string().describe('The full job description text.'),
  tone: z.enum(['professional', 'enthusiastic', 'concise']).default('professional'),
});
export type CoverLetterInput = z.infer<typeof CoverLetterInputSchema>;

const CoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('A tailored cover letter ready to send.'),
  highlights: z.array(z.string()).describe('Key points emphasised in the letter.'),
});
export type CoverLetterOutput = z.infer<typeof CoverLetterOutputSchema>;

export async function generateCoverLetter(input: CoverLetterInput): Promise<CoverLetterOutput> {
  return coverLetterFlow(input);
}

const coverLetterFlow = ai.defineFlow(
  {
    name: 'coverLetterFlow',
    inputSchema: CoverLetterInputSchema,
    outputSchema: CoverLetterOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert career writer for E-Job Finder, specialising in the South African job market.

Write a ${input.tone} cover letter for the following application.

**Job Title:** ${input.jobTitle}
**Company:** ${input.company}

**Job Description:**
'''
${input.jobDescription}
'''

**Candidate CV:**
'''
${input.cvContent}
'''

Requirements:
- Address the hiring manager generically if no name is known
- Reference specific skills from the CV that match the job
- Keep it to 3–4 paragraphs, under 400 words
- Use South African English conventions
- Do not invent qualifications not present in the CV`;

    const { output } = await ai.generate({
      prompt,
      output: { schema: CoverLetterOutputSchema },
    });

    if (!output) {
      throw new Error('Failed to generate cover letter');
    }

    return output;
  }
);
