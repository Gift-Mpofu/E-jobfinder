import { createClient } from "jsr:@supabase/supabase-js@2";

const ADZUNA_CATEGORIES = [
  "it-jobs",
  "engineering-jobs",
  "finance-jobs",
  "accounting-finance-jobs",
  "sales-jobs",
];

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  created: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const CONFIDENTIAL_EMPLOYER = "Confidential employer";
const PLACEHOLDER_COMPANIES = ["Unknown Company", CONFIDENTIAL_EMPLOYER];

// Adzuna omits the company on many recruiter ads. Ask Gemini to pull the
// employer or agency name from the text, only when it is stated outright.
async function resolveEmployers(
  jobs: Array<{ title: string; description: string }>,
  apiKey: string
): Promise<Array<string | null>> {
  const results: Array<string | null> = jobs.map(() => null);
  for (let start = 0; start < jobs.length; start += 15) {
    // Stay under the Gemini per-minute request limit.
    if (start > 0) await new Promise((r) => setTimeout(r, 7000));
    const chunk = jobs.slice(start, start + 15);
    const listing = chunk
      .map((j, i) => `[${i}] ${j.title}\n${j.description.slice(0, 700)}`)
      .join("\n\n");
    const prompt = `For each job ad below, give the name of the hiring company or recruitment agency if the text states it explicitly. Do not guess and do not use generic phrases like "our client" or "a leading company". If no name is stated, use null.
Respond with only a JSON array of {"i": number, "employer": string | null}.

${listing}`;
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, responseMimeType: "application/json" },
          }),
        }
      );
      if (!res.ok) {
        console.error(`Employer lookup failed: ${res.status}`);
        continue;
      }
      const json: GeminiResponse = await res.json();
      const parsed = JSON.parse(json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]");
      for (const row of Array.isArray(parsed) ? parsed : []) {
        const name = typeof row?.employer === "string" ? row.employer.trim() : "";
        if (Number.isInteger(row?.i) && row.i < chunk.length && name.length > 1 && name.length < 80) {
          results[start + row.i] = name;
        }
      }
    } catch (err) {
      console.error("Employer lookup error:", err);
    }
  }
  return results;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adzunaAppId = Deno.env.get("ADZUNA_APP_ID");
    const adzunaAppKey = Deno.env.get("ADZUNA_APP_KEY");
    const googleAiKey = Deno.env.get("GOOGLE_AI_KEY");

    if (!supabaseUrl || !serviceKey || !adzunaAppId || !adzunaAppKey || !googleAiKey) {
      throw new Error("Missing required environment variables.");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // One-off/maintenance mode: { "backfillCompanies": true } resolves
    // placeholder company names on existing listings instead of ingesting.
    let body: Record<string, unknown> = {};
    try { body = await req.clone().json(); } catch (_e) { /* no body */ }
    if (body?.backfillCompanies === true) {
      const { data: rows, error } = await supabase
        .from("live_jobs")
        .select("id, title, description_text")
        .in("company", PLACEHOLDER_COMPANIES)
        .order("id")
        .range(Number(body.offset ?? 0), Number(body.offset ?? 0) + 59);
      if (error) throw error;
      const names = await resolveEmployers(
        (rows ?? []).map(r => ({ title: r.title, description: r.description_text ?? "" })),
        googleAiKey
      );
      let named = 0;
      for (let i = 0; i < (rows ?? []).length; i++) {
        const company = names[i] ?? CONFIDENTIAL_EMPLOYER;
        if (names[i]) named++;
        await supabase.from("live_jobs").update({ company }).eq("id", rows![i].id);
      }
      return new Response(
        JSON.stringify({ checked: rows?.length ?? 0, named }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── PHASE 1: Fetch and Ingest Jobs from Adzuna ──
    const jobsToUpsert = [];

    // Fetch concurrently using Promise.all
    const fetchPromises = ADZUNA_CATEGORIES.map(async (category) => {
      try {
        const url = new URL(`https://api.adzuna.com/v1/api/jobs/za/search/1`);
        url.searchParams.set("app_id", adzunaAppId);
        url.searchParams.set("app_key", adzunaAppKey);
        url.searchParams.set("category", category);
        url.searchParams.set("results_per_page", "40");

        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error(`Failed to fetch Adzuna category ${category}: ${res.status} ${res.statusText}`);
          return [];
        }

        const data = await res.json();
        const results: AdzunaJob[] = data.results ?? [];

        return results.map(r => ({
          external_id: `adzuna_${r.id}`,
          title: r.title ?? "Untitled",
          company: r.company?.display_name?.trim() || null,
          location: r.location?.display_name ?? "Unknown Location",
          description_text: r.description ?? "",
          url: r.redirect_url ?? "",
          salary_min: r.salary_min ?? null,
          salary_max: r.salary_max ?? null,
          posted_at: r.created ?? new Date().toISOString(),
          source: "adzuna",
          status: "open",
          skills_required: [],
          seniority: "",
        }));
      } catch (err) {
        console.error(`Error fetching category ${category}:`, err);
        return [];
      }
    });

    const categoryResults = await Promise.all(fetchPromises);
    jobsToUpsert.push(...categoryResults.flat());

    // Fill in missing company names: keep a name resolved on an earlier run,
    // otherwise ask Gemini, otherwise mark the employer as confidential.
    const missing = jobsToUpsert.filter(j => !j.company);
    if (missing.length > 0) {
      const { data: existing } = await supabase
        .from("live_jobs")
        .select("external_id, company")
        .in("external_id", missing.map(j => j.external_id));
      const known = new Map(
        (existing ?? [])
          .filter(e => e.company && !PLACEHOLDER_COMPANIES.includes(e.company))
          .map(e => [e.external_id, e.company])
      );
      const unresolved = missing.filter(j => !known.has(j.external_id));
      const names = await resolveEmployers(
        unresolved.map(j => ({ title: j.title, description: j.description_text })),
        googleAiKey
      );
      unresolved.forEach((j, i) => { known.set(j.external_id, names[i] ?? CONFIDENTIAL_EMPLOYER); });
      for (const j of missing) j.company = known.get(j.external_id) ?? CONFIDENTIAL_EMPLOYER;
    }

    let ingestedCount = 0;
    if (jobsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("live_jobs")
        .upsert(jobsToUpsert, { onConflict: "external_id" });

      if (upsertError) {
        console.error("Upsert failed:", upsertError.message);
      } else {
        ingestedCount = jobsToUpsert.length;
      }
    }

    try {
      await fetch(
        Deno.env.get('SUPABASE_URL') + '/functions/v1/categorise-jobs',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_ANON_KEY'),
            'Content-Type': 'application/json'
          },
          body: '{}'
        }
      );
    } catch (err) {
      console.error("Failed to trigger categorise-jobs function:", err);
    }

    // ── PHASE 2: Extract Skills & Seniority via Gemini ──
    let extractedCount = 0;
    let failedCount = 0;

    const { data: unprocessedJobs, error: fetchError } = await supabase
      .from("live_jobs")
      .select("id, description_text")
      .eq("status", "open")
      .eq("seniority", "")
      .limit(8);

    if (fetchError) {
      console.error("Failed to fetch jobs for processing:", fetchError.message);
    } else if (unprocessedJobs && unprocessedJobs.length > 0) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

      for (const job of unprocessedJobs) {
        // Added brief delay to respect basic rate limits where needed
        await new Promise((r) => setTimeout(r, 2000));

        const prompt = `You are a technical recruitment AI. Analyze the job description below.
Extract the required skills and the seniority level.
The final response must be a valid JSON object matching this schema:
{"skills": ["Skill1", "Skill2", "Skill3"], "seniority": "junior" | "mid" | "senior" | "lead"}

Rules:
- skills: array of strings.
- seniority: pick exactly one string from "junior", "mid", "senior", "lead". If unspecified, default to "mid".

Job Description:
${(job.description_text ?? "").slice(0, 1500)}`;

        let rawText = "";

        try {
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": googleAiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 250,
                responseMimeType: "application/json",
              },
            }),
          });

          if (geminiRes.status === 429) {
            console.warn(`Rate limit hit on job ${job.id}`);
            failedCount++;
            continue; // Skip the rest, it will retry this job on the next run
          }

          if (!geminiRes.ok) {
            console.error(`Gemini API error (Status ${geminiRes.status}) on job ${job.id}`);
            failedCount++;
            continue;
          }

          const geminiJson: GeminiResponse = await geminiRes.json();
          rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          if (!rawText) {
             throw new Error("Empty text received from Gemini");
          }

          const parsed = JSON.parse(rawText.trim());
          const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
          const seniority = typeof parsed.seniority === "string" ? parsed.seniority : "mid";

          const { error: updateError } = await supabase
            .from("live_jobs")
            .update({ skills_required: skills, seniority })
            .eq("id", job.id);

          if (updateError) {
            console.error(`Failed to update job ${job.id} in DB:`, updateError.message);
            failedCount++;
          } else {
            extractedCount++;
          }
        } catch (err) {
          console.error(`Failed to process job ${job.id}. RawText: ${rawText}`, err);
          failedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ingested: ingestedCount,
        skills_extracted: extractedCount,
        failed: failedCount,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Function execution error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
