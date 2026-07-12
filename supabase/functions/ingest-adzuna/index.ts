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
          company: r.company?.display_name ?? "Unknown Company",
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
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

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
