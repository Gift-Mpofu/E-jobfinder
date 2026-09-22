import { createClient } from "jsr:@supabase/supabase-js@2";

const SKILL_KEYWORDS: Record<string, string[]> = {
  'JavaScript': ['javascript','js','node.js','nodejs','react','vue','angular','next.js'],
  'TypeScript': ['typescript', ' ts,', ' ts.', '(ts)'],
  'Python': ['python','django','flask','fastapi','pandas','numpy'],
  'React': ['react','reactjs','react.js','next.js','nextjs'],
  'SQL': ['sql server', 'postgresql', 'mysql', 'supabase postgres', ' sql ', 'database queries', 'relational database'],
  'Java': ['java','spring','maven','gradle'],
  'PHP': ['php','laravel','wordpress'],
  'C#': ['c#','dotnet','.net','asp.net'],
  'Excel': ['excel','spreadsheet','vlookup','pivot'],
  'Power BI': ['power bi','powerbi','tableau','data visualization'],
  'Accounting': ['accounting','bookkeeping','xero','sage','pastel'],
  'Sales': ['sales representative', 'sales manager', 'sales executive', 'sales coordinator', 'business development', 'crm', 'salesforce', 'cold calling', 'prospecting'],
  'Marketing': ['digital marketing', 'marketing manager', 'seo specialist', 'content marketing', 'social media manager', 'google ads', 'marketing coordinator', 'brand manager'],
  'Project Management': ['project management','agile','scrum','jira','prince2','pmp'],
  'Customer Service': ['customer service','customer support','call centre','helpdesk'],
  'Design': ['figma','adobe','photoshop','illustrator','ui/ux','ux design'],
  'DevOps': ['devops','docker','kubernetes','ci/cd','aws','azure','gcp','terraform'],
  'Data Analysis': ['data analyst', 'data analysis', 'business intelligence', 'power bi', 'tableau', 'reporting analyst', 'data scientist', 'analytics'],
  'HR': ['human resources', 'hr manager', 'hr coordinator', 'recruitment consultant', 'talent acquisition', 'payroll administrator', 'people operations'],
  'Finance': ['finance','financial','cfa','cima','acca','budgeting','forecasting'],
};

const SENIORITY_KEYWORDS = {
  junior:  ['junior','entry level','entry-level','graduate','intern','trainee','0-1 year','0-2 year','1 year experience','2 years experience'],
  mid:     ['mid level','mid-level','intermediate','2-4 year','3-5 year','3 years','4 years'],
  senior:  ['senior','sr.','sr ','lead','principal','5+ year','5-8 year','6+ year','7+ year'],
  lead:    ['head of','director','manager','team lead','vp of','chief','cto','cfo','coo'],
};

function extractSkills(title: string, description: string): string[] {
  const text = (title + ' ' + description).toLowerCase();
  const found: string[] = [];

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => {
      const trimmed = kw.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s|\\b)${escaped}(?:$|\\s|\\b)`, 'i');
      return regex.test(text);
    })) {
      found.push(skill);
    }
  }

  return found.length > 0 ? found : ['General'];
}

function extractSeniority(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return level;
    }
  }
  return 'mid';
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing required Supabase environment variables.");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if request body contains reset: true
    let shouldReset = false;
    if (req.method === "POST") {
      try {
        const body = await req.clone().json();
        if (body?.reset === true) {
          shouldReset = true;
        }
      } catch (_e) {
        // body was not JSON or empty
      }
    }

    if (shouldReset) {
      console.log("Reset flag detected. Resetting all open live_jobs skills & seniority...");
      const { error: resetError } = await supabase
        .from('live_jobs')
        .update({ skills_required: '{}', seniority: '' })
        .eq('status', 'open');

      if (resetError) {
        console.error("Reset failed:", resetError.message);
      }
    }

    // Fetch ALL live_jobs where skills_required is empty array '{}'
    const { data: jobs, error: fetchError } = await supabase
      .from('live_jobs')
      .select('id, title, description_text')
      .eq('skills_required', '{}');

    if (fetchError) {
      throw fetchError;
    }

    const updates = (jobs || []).map((job: { id: string; title: string; description_text?: string }) => ({
      id: job.id,
      skills_required: extractSkills(job.title, job.description_text ?? ''),
      seniority: extractSeniority(job.title, job.description_text ?? '')
    }));

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('live_jobs')
        .update({
          skills_required: update.skills_required,
          seniority: update.seniority
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Failed to update job ${update.id}:`, updateError.message);
      }
    }

    return new Response(
      JSON.stringify({
        reset: shouldReset,
        processed: updates.length,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Function execution error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      }
    );
  }
});
