import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(req: Request) {
  try {
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

    // Make two Gemini calls concurrently via Promise.all()
    const [coverLetterRes, summaryRes] = await Promise.all([
      ai.generate({
        system: 'You are a professional SA cover letter writer.',
        prompt: coverLetterPrompt,
      }).catch(async () => {
        // Fallback REST call if Genkit fails
        const apiKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return { text: `Dear Hiring Manager at ${company},\n\nI am thrilled to express my strong interest in the ${jobTitle} role. With my background in ${skillsStr || 'the field'}, I am confident in delivering high impact for your team.\n\nSincerely,\n${candidateName}` };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `System: You are a professional SA cover letter writer.\n\n${coverLetterPrompt}` }] }]
          })
        });
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { text: text || `Dear Hiring Team at ${company},\n\nDriven by a passion for excellence in ${jobTitle}, I bring strong expertise in ${skillsStr}.\n\nWarm regards,\n${candidateName}` };
      }),
      ai.generate({
        prompt: summaryPrompt,
      }).catch(async () => {
        const apiKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return { text: `Results-driven professional applying for ${jobTitle} at ${company}. Proven skills in ${skillsStr}.` };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: summaryPrompt }] }]
          })
        });
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { text: text || `Experienced candidate tailored for ${jobTitle} at ${company}.` };
      })
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
