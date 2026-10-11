'use server';

import { ai } from '@/ai/genkit';
import { requireUser } from '@/ai/require-user';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string()
});

export type CompanionMessage = z.infer<typeof MessageSchema>;

const FALLBACK_QUESTIONS: string[] = [
  "First, what's your full name and current job title or the role you're targeting?",
  "Great! Next, tell me about your most recent work experience. What was your role, company, and main responsibilities?",
  "Awesome! What are your key technical and soft skills? (e.g. React, Node.js, Project Management)",
  "Got it! Do you have any other previous work experience or older roles you'd like to include?",
  "Great! What is your education, degree, or highest qualification, and from which institution?",
  "Understood! Have you worked on any key projects, side work, or certifications worth highlighting?",
  "Awesome! In 2-3 sentences, how would you describe your professional summary and career goals?",
  "Finally, please share your contact details: phone number, email address, and LinkedIn profile URL.",
  "Perfect! Generating your CV now..."
];

const SMALL_TALK = /^(hi|hey|hello|hallo|howzit|yo|ok|okay|yes|no|sure|thanks?|thank you|test|\?+)[\s!.?]*$/i;

const CvTurnSchema = z.object({
  answered: z.boolean().describe('True if the message actually answers the current question.'),
  reply: z.string().describe('What to say to the user next.'),
});

const cvBuilderFlow = ai.defineFlow(
  {
    name: 'cvBuilderFlow',
    inputSchema: z.object({
      history: z.array(MessageSchema),
      prompt: z.string(),
      step: z.number(),
    }),
    outputSchema: CvTurnSchema,
  },
  async ({ history, prompt, step }) => {
    const current = FALLBACK_QUESTIONS[step - 1] ?? FALLBACK_QUESTIONS[0];
    const next = FALLBACK_QUESTIONS[step] ?? FALLBACK_QUESTIONS[8];
    const systemPrompt = `You are a professional CV writer helping a South African job seeker build their CV through 8 questions.
The user is on question ${step} of 8: "${current}"
- If their message answers that question (even partly), set answered=true and reply with one short encouraging sentence followed by the next question: "${next}"
- If it does not answer it (a greeting, "ok", a question back, something unrelated), set answered=false and reply briefly, then ask question ${step} again in your own words.
Keep replies concise. Never invent details about the user.`;

    const messages: any[] = [
      { role: 'system', content: [{ text: systemPrompt }] },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        content: [{ text: msg.content }]
      })),
      { role: 'user', content: [{ text: prompt }] }
    ];

    try {
      const { output } = await ai.generate({
        messages,
        output: { schema: CvTurnSchema },
        config: { temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
      });
      if (output) return output;
    } catch (err: any) {
      console.warn('cvBuilderFlow falling back to scripted question:', err?.message);
    }
    // AI unavailable: use the scripted questions so the interview keeps going.
    const answered = !SMALL_TALK.test(prompt.trim()) && prompt.trim().length > 2;
    return answered
      ? { answered, reply: `Got it! ${next}` }
      : { answered, reply: `No problem. ${current}` };
  }
);

const professionalCvFormatterFlow = ai.defineFlow(
  {
    name: 'professionalCvFormatterFlow',
    inputSchema: z.object({
      conversationHistory: z.array(MessageSchema),
    }),
    outputSchema: z.string(),
  },
  async ({ conversationHistory }) => {
    const systemPrompt = `Rewrite these interview answers into a professional South African CV. Format exactly:

[NAME + TITLE]
[Contact info]

PROFESSIONAL SUMMARY
[2-3 sentences, professional tone]

WORK EXPERIENCE
[Most recent first, bullet points with •]

TECHNICAL SKILLS
[Organised by category]

EDUCATION
[Qualification, institution, year]

Rules: remove all asterisks and markdown, use • for bullets only, fix grammar, professional South African English.`;

    const messages: any[] = [
      { role: 'system', content: [{ text: systemPrompt }] },
      ...conversationHistory.map(msg => ({ 
        role: msg.role === 'model' ? 'model' : 'user', 
        content: [{ text: msg.content }] 
      }))
    ];

    let text = '';
    try {
      const response = await ai.generate({
        messages,
        config: {
          temperature: 0.5,
        }
      });
      text = response.text;
    } catch (err: any) {
      console.warn('professionalCvFormatterFlow API retry attempt...', err?.message);
      try {
        await new Promise(r => setTimeout(r, 1000));
        const retryRes = await ai.generate({
          messages,
          config: { temperature: 0.5 }
        });
        text = retryRes.text;
      } catch (retryErr: any) {
        console.warn('professionalCvFormatterFlow fallback formatting due to API high demand:', retryErr?.message);
        text = buildFallbackCvFromHistory(conversationHistory);
      }
    }

    return text;
  }
);

function buildFallbackCvFromHistory(history: CompanionMessage[]): string {
  const userAnswers = history.filter(m => m.role === 'user').map(m => m.content);
  let name = userAnswers[0] || 'FULL NAME';
  let exp = userAnswers[1] || '';
  let skills = userAnswers[2] || '';
  let otherExp = userAnswers[3] || '';
  let edu = userAnswers[4] || '';
  let proj = userAnswers[5] || '';
  let summary = userAnswers[6] || '';
  let contact = userAnswers[7] || '';

  return `${name.toUpperCase()}\nContact: ${contact}\n\n========================================\n\nPROFESSIONAL SUMMARY\n${summary}\n\nTECHNICAL SKILLS\n${skills}\n\nWORK EXPERIENCE\n${exp}\n${otherExp ? '\n' + otherExp : ''}\n\nEDUCATION & QUALIFICATIONS\n${edu}\n\nPROJECTS\n${proj}`;
}

export type CvTurnResult =
  | { ok: true; answered: boolean; reply: string }
  | { ok: false; error: string };

// Returns errors as data: production builds hide the message of a thrown error.
export async function askCvBuilder(history: CompanionMessage[], prompt: string, step: number): Promise<CvTurnResult> {
  try {
    await requireUser();
    return { ok: true, ...(await cvBuilderFlow({ history, prompt, step })) };
  } catch (err: any) {
    console.error('askCvBuilder failed:', err);
    return { ok: false, error: err?.message || 'The AI CV Writer is unavailable right now.' };
  }
}

export async function generateProfessionalCv(conversationHistory: CompanionMessage[]): Promise<string> {
  // Never throws: falls back to a plain layout built from the answers.
  try {
    await requireUser();
  } catch {
    return buildFallbackCvFromHistory(conversationHistory);
  }
  return professionalCvFormatterFlow({ conversationHistory });
}

const stepAnswerParserFlow = ai.defineFlow(
  {
    name: 'stepAnswerParserFlow',
    inputSchema: z.object({
      step: z.number(),
      answerText: z.string(),
    }),
    outputSchema: z.object({
      fullName: z.string().optional(),
      targetRole: z.string().optional(),
      summary: z.string().optional(),
      recentExperience: z.string().optional(),
      otherExperience: z.string().optional(),
      skills: z.array(z.string()).optional(),
      education: z.string().optional(),
      projects: z.string().optional(),
      contactInfo: z.string().optional(),
    }),
  },
  async ({ step, answerText }) => {
    const prompt = `You are an expert CV parser and professional rewriter. Clean and extract structured CV information from the user's input.

Step Context:
1 = Full name and target job title / role
2 = Recent work experience
3 = Key technical & soft skills
4 = Other work experience
5 = Education & qualifications
6 = Projects & side work
7 = Professional summary
8 = Contact info (phone, email, linkedin)

User Answer: "${answerText}"

CRITICAL INSTRUCTIONS:
- If the user answer contains multiple sections (e.g. TECHNICAL SKILLS, WORK EXPERIENCE, EDUCATION, PROJECTS), parse and return ALL identified sections separately!
- Remove all raw section titles like "TECHNICAL SKILLS", "WORK EXPERIENCE", "Languages", "Frontend", "Backend", "Cloud" from the text body.
- For skills, output a clean array of strings (e.g. ["JavaScript", "Python", "React", "Docker"]).
- Remove conversational fluff like "My name is", "I worked at", "Hi".
- Capitalize names and titles in Title Case.
- Output ONLY a valid JSON object matching the extracted fields.`;

    try {
      const { text } = await ai.generate({
        prompt,
        config: { temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e: any) {
      console.warn('stepAnswerParserFlow suppressed error (API high demand):', e?.message);
    }
    return {};
  }
);

export async function parseStepAnswer(step: number, answerText: string) {
  try {
    await requireUser();
  } catch {
    return {};
  }
  return stepAnswerParserFlow({ step, answerText });
}
