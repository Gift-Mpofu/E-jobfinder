import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing required environment variables.");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const thirtySevenDaysAgo = new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Mark open jobs older than 30 days as expired
    const { data: expiredData, error: expireError } = await supabase
      .from("live_jobs")
      .update({ status: "expired" })
      .eq("status", "open")
      .lt("posted_at", thirtyDaysAgo)
      .select("id");

    if (expireError) {
      console.error("Error expiring jobs:", expireError.message);
    }
    const expiredCount = expiredData ? expiredData.length : 0;

    // 2. Delete jobs marked expired for > 7 days (posted_at < 37 days ago)
    const { data: deletedData, error: deleteError } = await supabase
      .from("live_jobs")
      .delete()
      .eq("status", "expired")
      .lt("posted_at", thirtySevenDaysAgo)
      .select("id");

    if (deleteError) {
      console.error("Error deleting jobs:", deleteError.message);
    }
    const deletedCount = deletedData ? deletedData.length : 0;

    return new Response(
      JSON.stringify({
        expired: expiredCount,
        deleted: deletedCount,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Cleanup jobs execution error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
