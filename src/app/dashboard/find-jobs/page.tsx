'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@/supabase/provider';
import { useProfile } from '@/supabase/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bookmark, BookmarkCheck, Search, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description_text: string;
  url?: string;
  skills_required: string[];
  seniority: string;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  posted_at: string | null;
  creation_date: string;
};

// Company colour avatar — no "?" bubbles
const COMPANY_COLOURS = ['#FF6B00','#007AFF','#34C759','#FF9F0A','#AF52DE','#FF2D55','#5AC8FA','#1D9E75'];
function getCompanyColour(name: string) {
  return COMPANY_COLOURS[name.charCodeAt(0) % COMPANY_COLOURS.length];
}
function CompanyAvatar({ name }: { name: string }) {
  const colour = getCompanyColour(name || 'X');
  const letter = (name || 'X').charAt(0).toUpperCase();
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-bold text-white text-lg"
      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colour }}
    >
      {letter}
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  const cls = score >= 70
    ? 'bg-[#E8F8EE] text-[#1A7A3A]'
    : score >= 40
    ? 'bg-[#FFF3EB] text-[#CC5200]'
    : 'bg-[#F5F5F7] text-[#6E6E73]';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {score}% match
      {score === 50 && (
        <span title="Score improves as AI processes job skills" className="cursor-help opacity-70">ⓘ</span>
      )}
    </span>
  );
}

const TABS = ['All Jobs', 'Best Matches', 'Remote', 'Saved'] as const;
type TabKey = typeof TABS[number];

export default function FindJobsPage() {
  const supabase = getSupabaseClient();
  const { user } = useUser();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('All Jobs');

  const toggleExpandJob = (jobId: string) => {
    setExpandedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setIsLoadingJobs(true);
      const { data: jobsData, error: fetchError } = await supabase
        .from('live_jobs')
        .select('id, title, company, location, description_text, url, skills_required, seniority, salary_min, salary_max, status, posted_at, creation_date')
        .eq('status', 'open')
        .order('posted_at', { ascending: false, nullsFirst: false });
      if (fetchError) {
        setError(fetchError.code === '42P01' ? "live_jobs table missing — run: supabase db push" : `Database error: ${fetchError.message}`);
        setIsLoadingJobs(false); return;
      }
      const { data: savedData } = await supabase.from('user_job_actions').select('job_id').eq('user_id', user.id).eq('action_type', 'saved');
      const savedSet = new Set<string>((savedData || []).map(s => s.job_id));
      setJobs(jobsData || []);
      setSavedJobIds(savedSet);
      setIsLoadingJobs(false);
    }
    if (!isProfileLoading) fetchData();
  }, [supabase, isProfileLoading, user]);

  const toggleSaveJob = async (jobId: string) => {
    if (!user) return;
    const isSaved = savedJobIds.has(jobId);
    setSavedJobIds(prev => { const s = new Set(prev); isSaved ? s.delete(jobId) : s.add(jobId); return s; });
    if (isSaved) {
      const { error } = await supabase.from('user_job_actions').delete().eq('user_id', user.id).eq('job_id', jobId).eq('action_type', 'saved');
      if (error) { setSavedJobIds(prev => { const s = new Set(prev); s.add(jobId); return s; }); toast({ variant: "destructive", title: "Error", description: error.message }); }
    } else {
      const { error } = await supabase.from('user_job_actions').insert({ user_id: user.id, job_id: jobId, action_type: 'saved' });
      if (error) { setSavedJobIds(prev => { const s = new Set(prev); s.delete(jobId); return s; }); toast({ variant: "destructive", title: "Error", description: error.message }); }
    }
  };

  const calcScore = (job: LiveJob) => {
    if (!profile?.skills?.length) return 0;
    const us = profile.skills.map(s => s.toLowerCase().trim());
    const js = job.skills_required?.map(s => s.toLowerCase().trim()) || [];
    if (!js.length) return 50;
    const matched = js.filter(j => us.some(u => j.includes(u) || u.includes(j))).length;
    let score = 40 + Math.ceil((matched / js.length) * 60);
    if (profile.experience_level && job.seniority) {
      const e = profile.experience_level.toLowerCase(), s2 = job.seniority.toLowerCase();
      if (e.includes('senior') && s2.includes('junior')) score -= 20;
      else if (e.includes('junior') && s2.includes('senior')) score -= 20;
      else if (e.includes(s2) || s2.includes(e)) score += 10;
    }
    return Math.min(Math.max(score, 10), 99);
  };

  const q = searchQuery.toLowerCase().trim();
  const fq = (j: LiveJob) => !q || j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
  const allJobs = jobs.filter(fq).sort((a, b) => new Date(b.posted_at || b.creation_date).getTime() - new Date(a.posted_at || a.creation_date).getTime());
  const bestMatches = [...jobs].filter(fq).map(j => ({ job: j, score: calcScore(j) })).filter(j => j.score >= 60).sort((a, b) => b.score - a.score);
  const remoteJobs = jobs.filter(j => fq(j) && (j.location?.toLowerCase().includes('remote') || j.title?.toLowerCase().includes('remote')));
  const savedJobs = jobs.filter(j => savedJobIds.has(j.id) && fq(j));

  const tabJobs: Record<TabKey, { job: LiveJob; score: number }[]> = {
    'All Jobs': allJobs.map(j => ({ job: j, score: calcScore(j) })),
    'Best Matches': bestMatches,
    'Remote': remoteJobs.map(j => ({ job: j, score: calcScore(j) })),
    'Saved': savedJobs.map(j => ({ job: j, score: calcScore(j) })),
  };

  const emptyMessages: Record<TabKey, string> = {
    'All Jobs': 'No jobs found.',
    'Best Matches': 'No high-matching jobs yet. Update your profile skills!',
    'Remote': 'No remote jobs found at the moment.',
    'Saved': 'Save jobs by clicking the bookmark icon.',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-bold text-[#1D1D1F] tracking-tight">Find Jobs</h1>
          <p className="text-[15px] text-[#6E6E73] mt-1">AI-matched live listings updated every 6 hours</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#AEAEB2]" />
          <input
            type="text"
            placeholder="Search jobs, companies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-full pl-9 pr-4 py-2 text-sm text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:border-[#FF6B00] transition-colors"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-[#E5E5EA] p-1 inline-flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === tab ? 'bg-[#FF6B00] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isLoadingJobs || isProfileLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : tabJobs[activeTab].length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-[#D2D2D7] mb-3" />
          <h3 className="font-semibold text-[#1D1D1F] mb-1">No jobs found</h3>
          <p className="text-sm text-[#6E6E73]">{emptyMessages[activeTab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tabJobs[activeTab].map(({ job, score }) => {
            const isSaved = savedJobIds.has(job.id);
            const isExpanded = expandedJobIds.has(job.id);
            const postedDate = job.posted_at ? new Date(job.posted_at) : new Date(job.creation_date);
            const descSnippet = job.description_text
              ? job.description_text.length > 120
                ? `${job.description_text.slice(0, 120)}...`
                : job.description_text
              : '';

            return (
              <div
                key={job.id}
                onClick={() => toggleExpandJob(job.id)}
                className="bg-white rounded-2xl border border-[#E5E5EA] p-5 hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <CompanyAvatar name={job.company} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[15px] font-semibold text-[#1D1D1F] leading-snug">{job.title}</h2>
                        <p className="text-[13px] text-[#6E6E73] mt-0.5">
                          {job.company} · {job.location || 'Remote'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveJob(job.id);
                        }}
                        className={`flex-shrink-0 p-1 transition-colors ${isSaved ? 'text-[#FF6B00]' : 'text-[#AEAEB2] hover:text-[#FF6B00]'}`}
                        aria-label={isSaved ? 'Unsave job' : 'Save job'}
                      >
                        {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Description preview */}
                    {descSnippet && (
                      <p className="text-xs text-[#6E6E73] mt-1 line-clamp-2">
                        {descSnippet}
                      </p>
                    )}

                    {/* Skill pill tags */}
                    {job.skills_required && job.skills_required.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {job.skills_required.slice(0, 4).map((skill, i) => (
                          <span key={i} className="text-[10px] bg-[#FFF3EB] text-[#CC5200] rounded-full px-2 py-0.5 font-medium">
                            {skill}
                          </span>
                        ))}
                        {job.skills_required.length > 4 && (
                          <span className="text-[10px] bg-[#FFF3EB] text-[#CC5200] rounded-full px-2 py-0.5 font-medium">
                            +{job.skills_required.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <MatchBadge score={score} />
                      <span className="text-xs text-[#AEAEB2]">
                        Posted {formatDistanceToNow(postedDate, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 hidden sm:block">
                    <a
                      href={job.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block bg-[#FF6B00] hover:bg-[#E55F00] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors duration-150"
                    >
                      View Details
                    </a>
                  </div>
                </div>

                {/* Expandable section */}
                {isExpanded && (
                  <div
                    className="mt-4 pt-4 border-t border-[#E5E5EA] space-y-3 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider mb-1.5">Description</h4>
                      <div className="text-xs text-[#1D1D1F] leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-48 p-3.5 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA]">
                        {job.description_text || 'No description available for this job listing.'}
                      </div>
                    </div>

                    {job.skills_required && job.skills_required.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider mb-1.5">All Required Skills</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills_required.map((skill, i) => (
                            <span key={i} className="text-[10px] bg-[#FFF3EB] text-[#CC5200] rounded-full px-2 py-0.5 font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-[#6E6E73] pt-1">
                      {job.seniority && (
                        <div>
                          <span className="font-semibold text-[#1D1D1F]">Seniority: </span>
                          {job.seniority}
                        </div>
                      )}
                      {(job.salary_min != null || job.salary_max != null) && (
                        <div>
                          <span className="font-semibold text-[#1D1D1F]">Salary Range: </span>
                          {job.salary_min != null ? `R${job.salary_min.toLocaleString()}` : ''}
                          {job.salary_min != null && job.salary_max != null ? ' - ' : ''}
                          {job.salary_max != null ? `R${job.salary_max.toLocaleString()}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
