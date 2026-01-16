'use server';
/**
 * @fileOverview A CV analysis AI agent from Angine.
 *
 * - analyzeCv - A function that handles the CV analysis process.
 * - CvAnalysisInput - The input type for the analyzeCv function.
 * - CvAnalysisOutput - The return type for the analyzeCv function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CvAnalysisInputSchema = z.object({
  cvContent: z.string().describe("The full text content of the user's CV."),
  jobDescription: z.string().describe('The full text of the job description the user is targeting.'),
  scanType: z.enum(['quick', 'deep']).describe('The type of analysis to perform.'),
});
export type CvAnalysisInput = z.infer<typeof CvAnalysisInputSchema>;

const CvAnalysisOutputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('A score from 0-100 representing how well the CV matches the job description.'),
  strengths: z.array(z.string()).describe('A list of key strengths and skills from the CV that are relevant to the job.'),
  missingKeywords: z.array(z.string()).describe('A list of critical keywords and skills mentioned in the job description that are missing from the CV.'),
  improvementSuggestions: z.string().describe('Actionable suggestions for improving the CV to better match the job description.'),
  reasoning: z.string().describe('The detailed reasoning behind the analysis, especially for a deep scan.'),
  jobTitle: z.string().describe('The identified job title from the job description, e.g., "Software Engineer".'),
  hireRateData: z.array(z.object({
    level: z.string().describe('The seniority level, e.g., "Junior", "Mid-Level", "Senior".'),
    rate: z.number().min(0).max(100).describe('An estimated percentage hiring rate for this level.'),
  })).describe('Estimated hiring rate data for different seniority levels of this job title. Provide data for at least 3 levels.')
});
export type CvAnalysisOutput = z.infer<typeof CvAnalysisOutputSchema>;

export async function analyzeCv(input: CvAnalysisInput): Promise<CvAnalysisOutput> {
  return cvAnalysisFlow(input);
}

const cvAnalysisPrompt = ai.definePrompt({
  name: 'cvAnalysisPrompt',
  input: {schema: CvAnalysisInputSchema},
  output: {schema: CvAnalysisOutputSchema},
  prompt: `You are the 'Angine', an expert AI career strategist and hiring manager for top companies. Your analysis is sharp, insightful, and incredibly helpful.

Analyze the provided CV against the job description.

**Scan Type: {{{scanType}}}**

**CV Content:**
'''
{{{cvContent}}}
'''

**Job Description:**
'''
{{{jobDescription}}}
'''

**Instructions:**
1.  **Match Score:** Calculate a percentage score representing the CV's compatibility with the job description.
2.  **Strengths:** Identify the most relevant skills and experiences from the CV that align with the job.
3.  **Missing Keywords:** Pinpoint crucial keywords from the job description that are absent in the CV. This is vital for passing ATS (Applicant Tracking Systems).
4.  **Improvement Suggestions:** Provide concrete, actionable advice on how to improve the CV.
5.  **Hiring Rate Analysis:** Identify the job title from the description. Then, provide estimated hiring rate data for different seniority levels (e.g., Junior, Mid-Level, Senior) for that job title. This data should be returned in the 'hireRateData' field.

**Scan-Specific Instructions:**

*   If **scanType** is **'quick'**:
    *   Provide a concise analysis. The 'reasoning' output should be a brief, one or two-sentence summary of your findings.

*   If **scanType** is **'deep'**:
    *   **This is a Deep Scan.** Perform a forensic analysis.
    *   Go beyond keywords. Infer the target company's values and culture from the job description's tone and language (e.g., 'fast-paced environment', 'collaborative team').
    *   **Improvement Suggestions** should be highly detailed. Suggest specific phrasing, projects to highlight, and how to frame experience to match the company's inferred values.
    *   **Reasoning:** The 'Expert Reasoning' output must be thorough. Explain *why* you're making these suggestions, referencing specific parts of the CV and job description. Explain the strategic value of the missing keywords and how the suggested improvements will significantly boost the candidate's chances of landing an interview.
`,
});

const cvAnalysisFlow = ai.defineFlow(
  {
    name: 'cvAnalysisFlow',
    inputSchema: CvAnalysisInputSchema,
    outputSchema: CvAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await cvAnalysisPrompt(input);
    if (!output) {
      throw new Error('Analysis failed: The AI model did not return a valid output.');
    }
    return output;
  }
);
