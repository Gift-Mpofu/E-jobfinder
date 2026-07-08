import { createClient } from "jsr:@supabase/supabase-js@2";

const ADZUNA_CATEGORIES = [
  "it-jobs",
  "engineering-jobs",
  "finance-jobs",
  "accounting-finance-jobs",
  "sales-jobs",
];

interface AdzunaResult {
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

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adzunaAppId = Deno.env.get("ADZUNA_APP_ID")!;
  const adzunaAppKey = Deno.env.get("ADZUNA_APP_KEY")!;
  const googleAiKey = Deno.env.get("GOOGLE_AI_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);

  // ── PHASE 1: Ingest jobs from Adzuna ─────────────────────────────
  const jobs: Record<string, unknown>[] = [];

  for (const category of ADZUNA_CATEGORIES) {
    try {
      const url = new URL(
        `https://api.adzuna.com/v1/api/jobs/za/search/1`
      );
      url.searchParams.set("app_id", adzunaAppId);
      url.searchParams.set("app_key", adzunaAppKey);
      url.searchParams.set("category", category);
      url.searchParams.set("results_per_page", "40");

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error(`Adzuna ${category} failed: ${res.status}`);
        continue;
      }

      const json = await res.json();
      const results: AdzunaResult[] = json.results ?? [];

      for (const r of results) {
        jobs.push({
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
        });
      }
    } catch (e) {
      console.error(`Error fetching category ${category}:`, e);
    }
  }

  let ingestedCount = 0;
  if (jobs.length > 0) {
    const { error: upsertError } = await supabase
      .from("live_jobs")
      .upsert(jobs, { onConflict: "external_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError.message);
    } else {
      ingestedCount = jobs.length;
    }
  }

  // ── PHASE 2: Extract skills with Gemini ──────────────────────────
  let extractedCount = 0;
  let failedCount = 0;

  const { data: unprocessed, error: fetchError } = await supabase
    .from("live_jobs")
    .select("id, description_text")
    .eq("status", "open")
    .eq("seniority", "")
    .limit(8);

  if (fetchError) {
    console.error("Failed to fetch unprocessed jobs:", fetchError.message);
  } else if (unprocessed && unprocessed.length > 0) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

    for (const row of unprocessed) {
      await new Promise((r) => setTimeout(r, 5000));

      const prompt = `Return ONLY a JSON object with no markdown, no code fences, no explanation.
Format: {"skills":["Skill1","Skill2"],"seniority":"junior"}
Seniority must be exactly one of: junior, mid, senior, lead
Extract from this job description:
${(row.description_text ?? "").slice(0, 800)}`;

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
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        });

        if (geminiRes.status === 429) {
          console.log("Rate limited — skipping row", row.id);
          failedCount++;
          continue;
        }

        if (!geminiRes.ok) {
          console.error(`Gemini ${geminiRes.status} for row ${row.id}`);
          failedCount++;
          continue;
        }

        const geminiJson: GeminiResponse = await geminiRes.json();
        rawText =
          geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        const clean = rawText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        const parsed = JSON.parse(clean);
        const skills: string[] = Array.isArray(parsed.skills)
          ? parsed.skills
          : [];
        const seniority: string =
          typeof parsed.seniority === "string" ? parsed.seniority : "mid";

        const { error: updateError } = await supabase
          .from("live_jobs")
          .update({ skills_required: skills, seniority })
          .eq("id", row.id);

        if (updateError) {
          console.error("Update failed for row", row.id, updateError.message);
          failedCount++;
        } else {
          extractedCount++;
        }
      } catch (e) {
        console.error(
          "Parse error for row",
          row.id,
          "| raw:",
          rawText.slice(0, 150),
          e
        );
        failedCount++;
      }
    }
  }

  return Response.json({
    ingested: ingestedCount,
    skills_extracted: extractedCount,
    failed: failedCount,
    timestamp: new Date().toISOString(),
  });
});
