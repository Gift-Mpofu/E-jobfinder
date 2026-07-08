import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Normalizes JSearch job data into the public.live_jobs format
 */
const normalizeJSearchResult = (result: any) => {
  return {
    external_id: `jsearch_${result.job_id}`,
    title: result.job_title,
    company: result.employer_name,
    location: `${result.job_city ?? ''}, ${result.job_country ?? ''}`.trim().replace(/^,|,$/g, '').trim(),
    description_text: result.job_description,
    url: result.job_apply_link,
    salary_min: result.job_min_salary ?? null,
    salary_max: result.job_max_salary ?? null,
    posted_at: result.job_posted_at_datetime_utc,
    source: 'jsearch',
    status: 'open',
    skills_required: [], // populated by AI later
    seniority: '', // derived later
  };
};

/**
 * Handles the ingest-jsearch endpoint
 */
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !rapidApiKey) {
      throw new Error("Missing required environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const queries = [
      "software developer South Africa",
      "data analyst South Africa",
      "finance manager South Africa",
      "engineer South Africa"
    ];

    let totalIngested = 0;

    for (const query of queries) {
      const url = new URL("https://jsearch.p.rapidapi.com/search");
      url.searchParams.append("query", query);
      url.searchParams.append("page", "1");
      url.searchParams.append("num_pages", "1");

      const response = await fetch(url.toString(), {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
      });

      if (!response.ok) {
         console.warn(`Failed to fetch query ${query}: ${response.statusText}`);
         continue;
      }

      const data = await response.json();
      const results = data.data || [];
      if (results.length === 0) continue;

      const normalizedJobs = results.map(normalizeJSearchResult);

      const { error } = await supabase
        .from('live_jobs')
        .upsert(normalizedJobs, { onConflict: 'external_id' });

      if (error) {
         throw error;
      }

      totalIngested += normalizedJobs.length;
    }

    return new Response(
      JSON.stringify({
        ingested: totalIngested,
        source: 'jsearch',
        timestamp: new Date().toISOString()
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
