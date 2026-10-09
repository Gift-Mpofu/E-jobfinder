"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  ScanLine,
  Search,
  FileText,
  MessageCircle,
} from "lucide-react";
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from "@/supabase/provider";
import { useDashboard } from "@/app/dashboard/layout";
import { calcMatchScore } from "@/lib/match-score";
import { formatDistanceToNow, subDays, startOfDay, format, subWeeks, nextMonday, startOfWeek } from "date-fns";

// ─── Shared helpers (mirrors find-jobs page) ───────────────────────────────

const COMPANY_COLOURS = [
  "#FF6B00","#007AFF","#34C759","#FF9F0A",
  "#AF52DE","#FF2D55","#5AC8FA","#1D9E75",
];

function getCompanyColour(name: string) {
  return COMPANY_COLOURS[(name || "X").charCodeAt(0) % COMPANY_COLOURS.length];
}

function CompanyAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const colour = getCompanyColour(name || "X");
  const letter = (name || "X").charAt(0).toUpperCase();
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        backgroundColor: colour,
        fontSize: size > 36 ? 18 : 14,
      }}
    >
      {letter}
    </div>
  );
}

function MatchBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span title="Add skills to your profile to see match scores" className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F5F7] text-[#6E6E73]">
        No match data
      </span>
    );
  }
  const cls =
    score >= 70
      ? "bg-[#E8F8EE] text-[#1A7A3A]"
      : score >= 40
      ? "bg-[#FFF3EB] text-[#CC5200]"
      : "bg-[#F5F5F7] text-[#6E6E73]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {score}% match
    </span>
  );
}

// ─── Career insights built from live job listings ──────────────────────────

type NewsItem = { tag: string; title: string; body: string; color: string };

type MarketJob = {
  title: string;
  location: string | null;
  skills_required: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
};

function topCounts(values: string[], n: number): [string, number][] {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function buildInsights(jobs: MarketJob[], role: string | undefined, userSkills: string[]): NewsItem[] {
  const words = (role ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
  const roleJobs = words.length
    ? jobs.filter((j) => words.some((w) => j.title.toLowerCase().includes(w)))
    : [];
  const pool = roleJobs.length >= 3 ? roleJobs : jobs;
  const scope = pool === roleJobs ? `${role} roles` : "open roles";
  const items: NewsItem[] = [];

  items.push({
    tag: "Openings",
    title: roleJobs.length
      ? `${roleJobs.length} open listings match "${role}"`
      : `${jobs.length} open listings on E-Job Finder`,
    body: roleJobs.length
      ? "Counted from the live listings we ingest daily."
      : role
      ? `None of the latest listings mention "${role}" in the title yet, so these insights cover all open roles.`
      : "Set a target role in your Career Snapshot to see insights for it.",
    color: "#34C759",
  });

  const locations = topCounts(pool.map((j) => (j.location ?? "").split(",")[0].trim()).filter(Boolean), 3);
  if (locations.length) {
    items.push({
      tag: "Locations",
      title: `Most ${scope} are in ${locations[0][0]}`,
      body: locations.map(([l, c]) => `${l} (${c})`).join(" · "),
      color: "#007AFF",
    });
  }

  const skills = topCounts(pool.flatMap((j) => (j.skills_required ?? []).map((s) => s.trim())).filter(Boolean), 5);
  if (skills.length) {
    const have = new Set(userSkills.map((s) => s.toLowerCase().trim()));
    const missing = skills.map(([s]) => s).filter((s) => !have.has(s.toLowerCase()));
    items.push({
      tag: "Skills",
      title: `Most requested: ${skills.map(([s]) => s).slice(0, 3).join(", ")}`,
      body: missing.length
        ? `Not yet on your profile: ${missing.join(", ")}.`
        : "You already list all of the most requested skills.",
      color: "#FF6B00",
    });
  }

  const salaries = pool
    .map((j) => j.salary_max ?? j.salary_min)
    .filter((v): v is number => typeof v === "number" && v > 0)
    .sort((a, b) => a - b);
  if (salaries.length >= 3) {
    const median = salaries[Math.floor(salaries.length / 2)];
    items.push({
      tag: "Salary",
      title: `Median advertised salary: R${Math.round(median).toLocaleString("en-ZA")}`,
      body: `Based on ${salaries.length} ${scope} that list a salary.`,
      color: "#FF9F0A",
    });
  }

  return items;
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
    </div>
  )
}

// ─── Skeleton shimmer ──────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[#F5F5F7] via-[#EBEBEB] to-[#F5F5F7] rounded-2xl ${className ?? ""}`}
    />
  );
}

// ─── Score calc (mirrors find-jobs) ───────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────

type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  skills_required: string[];
  seniority: string;
  status: string;
  posted_at: string | null;
};

type MatchResult = {
  id: string;
  match_score: number;
  analysis_date: string;
};

type Application = {
  id: string;
  status: string;
  applied_at: string;
};

// ─── Main dashboard ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const supabase = getSupabaseClient();
  const { userProfile, isProfileLoading, isAdmin } = useDashboard();

  const [isLoading, setIsLoading] = useState(true);
  const [latestJobs, setLatestJobs] = useState<LiveJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<LiveJob[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [newJobsThisWeek, setNewJobsThisWeek] = useState(0);
  const [allTopJobSkills, setAllTopJobSkills] = useState<string[][]>([]);
  const [marketJobs, setMarketJobs] = useState<MarketJob[]>([]);

  // Redirect admin
  useEffect(() => {
    if (!isUserLoading && isAdmin) router.replace("/dashboard/admin");
  }, [isUserLoading, isAdmin, router]);

  // Parallel data fetch
  useEffect(() => {
    if (!user || isUserLoading || isProfileLoading) return;

    const userId = user.id;
    const lastMonday = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const fortyEightHoursAgo = subDays(new Date(), 2).toISOString();
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    async function fetchAll() {
      setIsLoading(true);
      try {
        // Run all main queries in parallel (applications is separate — may not exist)
        const [
          latestJobsRes,
          recentJobsRes,
          topJobsRes,
          newJobsRes,
          matchResultsRes,
          savedRes,
          marketRes,
        ] = await Promise.all([
          // Top 4 open jobs
          supabase
            .from("live_jobs")
            .select("id,title,company,location,skills_required,seniority,status,posted_at")
            .eq("status", "open")
            .order("posted_at", { ascending: false, nullsFirst: false })
            .limit(4),

          // Jobs from last 48h
          supabase
            .from("live_jobs")
            .select("id,title,company,location,skills_required,seniority,status,posted_at")
            .eq("status", "open")
            .gte("posted_at", fortyEightHoursAgo)
            .order("posted_at", { ascending: false, nullsFirst: false })
            .limit(8),

          // Top 20 jobs for skills radar
          supabase
            .from("live_jobs")
            .select("skills_required")
            .eq("status", "open")
            .order("posted_at", { ascending: false, nullsFirst: false })
            .limit(20),

          // Count new jobs this week
          supabase
            .from("live_jobs")
            .select("*", { count: "exact", head: true })
            .gte("posted_at", lastMonday),

          // Last 5 match results
          supabase
            .from("match_results")
            .select("id,match_score,analysis_date")
            .eq("user_id", userId)
            .order("analysis_date", { ascending: false })
            .limit(5),

          // Saved jobs count
          supabase
            .from("user_job_actions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("action_type", "saved"),

          // Recent open jobs for the Career Insights card
          supabase
            .from("live_jobs")
            .select("title,location,skills_required,salary_min,salary_max")
            .eq("status", "open")
            .order("posted_at", { ascending: false, nullsFirst: false })
            .limit(300),
        ]);

        if (latestJobsRes.error) console.error("Dashboard fetch error (latest jobs):", latestJobsRes.error);
        else setLatestJobs(latestJobsRes.data ?? []);

        if (recentJobsRes.error) console.error("Dashboard fetch error (recent jobs):", recentJobsRes.error);
        else setRecentJobs(recentJobsRes.data ?? []);

        if (topJobsRes.data) setAllTopJobSkills(topJobsRes.data.map((j: { skills_required: string[] }) => j.skills_required ?? []));

        setNewJobsThisWeek(newJobsRes.count ?? 0);

        if (matchResultsRes.error) console.error("Dashboard fetch error (match results):", matchResultsRes.error);
        else setMatchResults([...(matchResultsRes.data ?? [])].reverse());

        setSavedCount(savedRes.count ?? 0);

        if (marketRes.error) console.error("Dashboard fetch error (market jobs):", marketRes.error);
        else setMarketJobs(marketRes.data ?? []);

        // Applications — completely isolated, graceful if table missing
        try {
          const appsRes = await supabase
            .from("applications")
            .select("id,status,applied_at")
            .eq("user_id", userId)
            .gte("applied_at", sevenDaysAgo);
          if (!appsRes.error && appsRes.data) {
            setApplications(appsRes.data);
          }
          // If error (e.g. table missing), silently keep applications as []
        } catch {
          // table doesn't exist — no-op, show 0
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, [user, isUserLoading, isProfileLoading, supabase]);

  // ── Derived values ────────────────────────────────────────────

  // Greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    const meta = (user as any)?.user_metadata?.full_name;
    if (meta) return meta.split(" ")[0];
    return user?.email?.split("@")[0] ?? "there";
  }, [user]);

  // Application activity chart data (last 7 days)
  const activityChartData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
    applications.forEach((app) => {
      const d = new Date(app.applied_at);
      const dayLabel = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
      if (counts[dayLabel] !== undefined) counts[dayLabel]++;
    });
    return days.map((day) => ({ day, count: counts[day] }));
  }, [applications]);

  const totalApps = applications.length;
  const pendingApps = applications.filter((a) => a.status === "pending").length;
  const submittedApps = applications.filter((a) => a.status === "submitted" || a.status === "applied").length;

  // Skills radar
  const radarData = useMemo(() => {
    const userSkills = (userProfile?.skills || []).map((s) => s.toLowerCase().trim());
    const freq: Record<string, number> = {};
    allTopJobSkills.forEach((skillArr) => {
      (skillArr || []).forEach((sk) => {
        const k = sk.toLowerCase().trim();
        freq[k] = (freq[k] || 0) + 1;
      });
    });
    const top6 = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    return top6.map(([skill, count]) => ({
      skill: skill.charAt(0).toUpperCase() + skill.slice(1),
      yourSkills: userSkills.includes(skill) ? 100 : 0,
      marketDemand: Math.round((count / Math.max(allTopJobSkills.length, 1)) * 100),
    }));
  }, [userProfile?.skills, allTopJobSkills]);

  // Score trend
  const scoreTrendData = useMemo(() =>
    matchResults.map((r) => ({
      date: format(new Date(r.analysis_date), "MMM d"),
      score: r.match_score,
    })),
    [matchResults]
  );

  const userSkills = userProfile?.skills || [];
  const news = useMemo(
    () => buildInsights(marketJobs, userProfile?.target_role, userSkills),
    [marketJobs, userProfile?.target_role, userSkills]
  );

  // ─── Render helpers ───────────────────────────────────────────

  const CardWrapper = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <div className={`bg-white rounded-2xl border border-[#E5E5EA] p-5 ${className}`} style={style}>
      {children}
    </div>
  );

  const CardTitle = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: "#6E6E73", marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );

  if (isLoading || isProfileLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8 space-y-6">
      {/* ── SECTION 1: Greeting Header ── */}
      <div
        className="rounded-2xl p-8 text-white"
        style={{ backgroundColor: "#1D1D1F" }}
      >
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF" }}>
              {greeting}, {firstName}.
            </p>
            <p style={{ fontSize: 15, color: "#AEAEB2", marginTop: 4 }}>
              Here&#39;s your job search summary for today.
            </p>
          </div>
          {userProfile?.target_role && (
            <span
              className="self-start sm:self-center"
              style={{
                backgroundColor: "#FF6B00",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 999,
                padding: "4px 12px",
                whiteSpace: "nowrap",
              }}
            >
              {userProfile.target_role}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x sm:divide-[#2C2C2E]">
          {[
            { value: newJobsThisWeek, label: "New jobs this week" },
            { value: totalApps, label: "Applications sent" },
            { value: savedCount, label: "Jobs saved" },
            { value: userProfile?.scans_used ?? 0, label: "Scans used this week" },
          ].map((stat, i) => (
            <div key={i} className="sm:px-6 first:pl-0 last:pr-0 text-center sm:text-left">
              <p style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF" }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: "#AEAEB2", marginTop: 2 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: 2-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-[65fr_35fr] gap-4">
        {/* ─── Left Column ─── */}
        <div className="space-y-4">
          {/* Card A: Latest Matches */}
          <CardWrapper>
            <CardTitle
              title="Latest Matches"
              action={
                <Link
                  href="/dashboard/find-jobs"
                  style={{ fontSize: 13, color: "#FF6B00" }}
                >
                  View all →
                </Link>
              }
            />
            <div className="space-y-0">
              {latestJobs.length === 0 ? (
                <p style={{ fontSize: 13, color: "#6E6E73" }}>No open jobs found.</p>
              ) : (
                latestJobs.map((job, idx) => {
                  const score = calcMatchScore(userSkills, job.skills_required, job.seniority, userProfile?.experience_level);
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 py-3"
                      style={{ borderBottom: idx < latestJobs.length - 1 ? "1px solid #F5F5F7" : "none" }}
                    >
                      <CompanyAvatar name={job.company} size={36} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }} className="truncate">{job.title}</p>
                        <p style={{ fontSize: 12, color: "#6E6E73" }}>{job.company} · {job.location || "Remote"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <MatchBadge score={score} />
                        <button
                          onClick={() => router.push("/dashboard/find-jobs")}
                          className="text-white rounded-full px-3 py-1 hover:opacity-90 transition-opacity"
                          style={{ fontSize: 12, backgroundColor: "#FF6B00" }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardWrapper>

          {/* Card B: Application Activity */}
          <CardWrapper>
            <CardTitle title="Application Activity" subtitle="Last 7 days" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityChartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F5F5F7" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6E6E73" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E5EA",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "#F5F5F7" }}
                />
                <Bar dataKey="count" fill="#FF6B00" radius={[4, 4, 0, 0]} name="Applications" />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: 12, color: "#6E6E73", marginTop: 12 }}>
              Total applied: {totalApps} · Pending: {pendingApps} · Submitted: {submittedApps}
            </p>
          </CardWrapper>

          {/* Card C: Skills Gap Radar */}
          <CardWrapper>
            <CardTitle
              title="Your Skills vs Market Demand"
              subtitle="Based on top 20 matched jobs"
            />
            {userSkills.length === 0 ? (
              <div className="py-8 text-center">
                <p style={{ fontSize: 13, color: "#6E6E73" }}>
                  Upload your CV to see skills analysis.{" "}
                  <Link href="/dashboard/scanner" style={{ color: "#FF6B00" }}>
                    Go to Scanner →
                  </Link>
                </p>
              </div>
            ) : radarData.length === 0 ? (
              <div className="py-8 text-center">
                <p style={{ fontSize: 13, color: "#6E6E73" }}>Not enough job data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#F5F5F7" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fontSize: 11, fill: "#6E6E73" }}
                  />
                  <Radar
                    name="Your Skills"
                    dataKey="yourSkills"
                    stroke="#FF6B00"
                    fill="#FF6B00"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name="Market Demand"
                    dataKey="marketDemand"
                    stroke="#007AFF"
                    fill="#007AFF"
                    fillOpacity={0.1}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E5EA",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${v}%`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardWrapper>
        </div>

        {/* ─── Right Column ─── */}
        <div className="space-y-4">
          {/* Card D: Career Insights */}
          <CardWrapper className="overflow-y-auto" style={{ maxHeight: 420 } as React.CSSProperties}>
            <CardTitle
              title="Career Insights"
              subtitle={
                userProfile?.target_role
                  ? `For ${userProfile.target_role} · South Africa`
                  : "South Africa"
              }
            />
            <div>
              {news.map((item, idx) => (
                <div
                  key={idx}
                  className="py-3"
                  style={{ borderBottom: idx < news.length - 1 ? "1px solid #F5F5F7" : "none" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: item.color,
                        backgroundColor: item.color + "1F",
                        borderRadius: 4,
                        padding: "2px 6px",
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginTop: 4 }}>
                    {item.title}
                  </p>
                  <p
                    style={{ fontSize: 12, color: "#6E6E73", marginTop: 4 }}
                    className="line-clamp-2"
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </CardWrapper>

          {/* Card E: Quick Actions */}
          <CardWrapper>
            <CardTitle title="Quick Actions" />
            <div className="space-y-1">
              {[
                {
                  href: "/dashboard/scanner",
                  icon: ScanLine,
                  color: "#FF6B00",
                  title: "Scan my CV against a job",
                  subtitle: "Paste a job description and get scored",
                },
                {
                  href: "/dashboard/find-jobs",
                  icon: Search,
                  color: "#007AFF",
                  title: "Find matching jobs",
                  subtitle: "Browse AI-ranked live listings",
                },
                {
                  href: "/dashboard/profile",
                  icon: FileText,
                  color: "#34C759",
                  title: "Update my CV",
                  subtitle: "Upload a new CV to refresh your matches",
                },
                {
                  href: "/dashboard/companion",
                  icon: MessageCircle,
                  color: "#AF52DE",
                  title: "Talk to Bubbl",
                  subtitle: "Get career advice from your AI companion",
                },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FFF3EB] transition-all cursor-pointer w-full"
                >
                  <action.icon
                    className="flex-shrink-0"
                    style={{ color: action.color, width: 18, height: 18 }}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#1D1D1F" }}>
                      {action.title}
                    </p>
                    <p style={{ fontSize: 11, color: "#6E6E73" }}>{action.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardWrapper>

          {/* Card F: Match Score Trend */}
          <CardWrapper>
            <CardTitle
              title="Your Scan History"
              subtitle="Match scores over your last 5 scans"
            />
            {scoreTrendData.length < 2 ? (
              <div className="py-4 text-center">
                <p style={{ fontSize: 13, color: "#6E6E73" }}>
                  {scoreTrendData.length === 0
                    ? "Run your first CV scan to start tracking progress."
                    : `Your last scan scored ${scoreTrendData[0].score}%. Run one more to see your trend.`}
                </p>
                <Link
                  href="/dashboard/scanner"
                  className="inline-block mt-2"
                  style={{ fontSize: 13, color: "#FF6B00" }}
                >
                  Go to Scanner →
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={scoreTrendData} margin={{ top: 4, right: 8, left: -30, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#F5F5F7" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#AEAEB2" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E5EA",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, "Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#FF6B00"
                    strokeWidth={2}
                    dot={{ fill: "#FF6B00", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardWrapper>
        </div>
      </div>

      {/* ── SECTION 3: You Might Have Missed ── */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F" }}>
              You might have missed these
            </h2>
            <p style={{ fontSize: 12, color: "#6E6E73", marginTop: 2 }}>
              Posted in the last 48 hours
            </p>
          </div>
          <Link href="/dashboard/find-jobs" style={{ fontSize: 13, color: "#FF6B00" }}>
            View all →
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6E6E73" }}>
            No new jobs posted in the last 48 hours. Check back soon!
          </p>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {recentJobs.map((job) => {
              const score = calcMatchScore(userSkills, job.skills_required, job.seniority, userProfile?.experience_level);
              const postedDate = job.posted_at ? new Date(job.posted_at) : new Date();
              return (
                <Link
                  key={job.id}
                  href="/dashboard/find-jobs"
                  className="flex-shrink-0 w-56 rounded-2xl p-4 border border-[#E5E5EA] hover:border-[#FF6B00] hover:shadow-md transition-all cursor-pointer"
                  style={{ backgroundColor: "#F5F5F7" }}
                >
                  <CompanyAvatar name={job.company} size={32} />
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1D1D1F",
                      marginTop: 8,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {job.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#6E6E73", marginTop: 4 }}>
                    {job.company}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <MatchBadge score={score} />
                    <span style={{ fontSize: 10, color: "#AEAEB2" }}>
                      {formatDistanceToNow(postedDate, { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}