import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { createClient } from '@/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to auto-apply.' }, { status: 401 });
    }

    const body = await req.json();
    const { jobTitle, company, description, userSkills, cvText, userName } = body;

    const skillsStr = Array.isArray(userSkills) ? userSkills.join(', ') : (userSkills || '');
    const candidateName = userName || 'Applicant';
    const bgText = (cvText || '').slice(0, 600);
    const jobDesc = (description || '').slice(0, 500);

    const coverLetterPrompt = `Write a cover letter for ${candidateName} applying to ${jobTitle} at ${company}.
Their skills: ${skillsStr}
Their background: ${bgText}
Job requirements: ${jobDesc}
Rules: under 220 words, do NOT start with 'I am writing to apply', start with impact, professional South African English, no placeholders.`;

    const summaryPrompt = `Rewrite this summary to match the job. Keep same facts, adjust keywords.
Original: ${(cvText || '').slice(0, 200)}
Target role: ${jobTitle} at ${company}
Output only the summary, 3 sentences max.`;

    // Two Gemini calls in parallel. If the model is unavailable, fall back to a
    // plain template so the user still gets an editable draft.
    const [coverLetterRes, summaryRes] = await Promise.all([
      ai.generate({
        system: 'You are a professional SA cover letter writer.',
        prompt: coverLetterPrompt,
      }).catch((err) => {
        console.warn('auto-apply cover letter generation failed:', err?.message);
        return { text: `Dear Hiring Team at ${company},\n\nDriven by a passion for excellence in ${jobTitle}, I bring strong expertise in ${skillsStr || 'the field'} and I am ready to deliver results for your team.\n\nWarm regards,\n${candidateName}` };
      }),
      ai.generate({
        prompt: summaryPrompt,
      }).catch((err) => {
        console.warn('auto-apply summary generation failed:', err?.message);
        return { text: `Results-driven professional applying for ${jobTitle} at ${company}. Proven skills in ${skillsStr || 'the field'}.` };
      }),
    ]);

    const coverLetter = coverLetterRes?.text ?? '';
    const tailoredSummary = summaryRes?.text ?? '';

    return NextResponse.json({ coverLetter, tailoredSummary });
  } catch (err: any) {
    console.error('Error in auto-apply route:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate application package' },
      { status: 500 }
    );
  }
}
