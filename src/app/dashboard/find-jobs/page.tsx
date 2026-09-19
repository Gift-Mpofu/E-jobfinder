'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@/supabase/provider';
import { useProfile } from '@/supabase/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bookmark, BookmarkCheck, Search, AlertCircle, Sparkles, Copy, Download, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDashboard } from '../layout';

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

function JobFreshnessBadge({ postedAt, creationDate }: { postedAt: string | null; creationDate?: string }) {
  const dateStr = postedAt || creationDate;
  if (!dateStr) return null;
  const postedDate = new Date(dateStr);
  const diffHours = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours <= 24) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#34C759] font-medium">
        <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
        New today
      </span>
    );
  }

  if (diffDays <= 7) {
    return (
      <span className="text-xs text-[#6E6E73]">
        {diffDays} {diffDays === 1 ? 'day' : 'days'} ago
      </span>
    );
  }

  if (diffDays <= 14) {
    return (
      <span className="text-xs text-[#8E8E93]">
        {Math.floor(diffDays / 7)} {Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago
      </span>
    );
  }

  if (diffDays <= 21) {
    return (
      <span className="text-xs text-[#8E8E93]">
        2 weeks ago
      </span>
    );
  }

  const weeksAgo = Math.floor(diffDays / 7);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#8E8E93]">
      {weeksAgo} weeks ago <span className="text-[#FF9F0A] font-medium">(older listing)</span>
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
  const { userProfile } = useDashboard();

  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('All Jobs');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');

  // Auto Apply Modal State
  const [autoApplyState, setAutoApplyState] = useState<'generating' | 'review' | 'done' | null>(null);
  const [selectedJob, setSelectedJob] = useState<LiveJob | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [tailoredSummary, setTailoredSummary] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'coverLetter' | 'summary'>('coverLetter');
  const [isMarkingApplied, setIsMarkingApplied] = useState(false);

  const handleAutoApply = async (job: LiveJob) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication required', description: 'Please sign in to auto-apply.' });
      return;
    }

    // Fetch user CVs from Supabase
    const { data: cvData } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', user.id)
      .order('upload_date', { ascending: false })
      .limit(1);

    const userCvText = cvData?.[0]?.file_content || '';
    if (!userCvText && !userProfile?.skills?.length) {
      toast({
        variant: 'destructive',
        title: 'Upload a CV first',
        description: 'Please upload a CV in your profile before using Auto Apply.',
      });
      return;
    }

    setSelectedJob(job);
    setAutoApplyState('generating');
    setActiveModalTab('coverLetter');

    try {
      const res = await fetch('/api/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          description: job.description_text,
          userSkills: userProfile?.skills || [],
          cvText: userCvText,
          userName: userProfile?.full_name || user?.email?.split('@')[0] || 'Applicant',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate application package.');
      }

      const data = await res.json();
      setCoverLetter(data.coverLetter || '');
      setTailoredSummary(data.tailoredSummary || '');
      setAutoApplyState('review');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Auto Apply Error',
        description: err.message || 'Something went wrong while generating application.',
      });
      setAutoApplyState(null);
    }
  };

  const handleMarkAsApplied = async () => {
    if (!user || !selectedJob) return;
    setIsMarkingApplied(true);
    try {
      const { error } = await supabase.from('applications').insert({
        user_id: user.id,
        job_id: selectedJob.id,
        job_title: selectedJob.title,
        company: selectedJob.company,
        cover_letter_used: coverLetter,
        status: 'applied',
      });

      if (error) throw error;
      setAutoApplyState('done');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Application Failed',
        description: err.message || 'Could not record application.',
      });
    } finally {
      setIsMarkingApplied(false);
    }
  };

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

  const filterByDate = (j: LiveJob) => {
    if (dateFilter === 'all') return true;
    const postedTime = j.posted_at ? new Date(j.posted_at).getTime() : new Date(j.creation_date).getTime();
    const now = Date.now();
    const diffHours = (now - postedTime) / (1000 * 60 * 60);
    if (dateFilter === '24h') return diffHours <= 24;
    if (dateFilter === '7d') return diffHours <= 24 * 7;
    if (dateFilter === '30d') return diffHours <= 24 * 30;
    return true;
  };

  const q = searchQuery.toLowerCase().trim();
  const fq = (j: LiveJob) =>
    (!q || j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q)) &&
    filterByDate(j);

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
          <p className="text-[15px] text-[#6E6E73] mt-1">AI-matched live listings updated daily</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#AEAEB2]" />
            <input
              type="text"
              placeholder="Search jobs, companies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-full pl-9 pr-4 py-2 text-sm text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:border-[#FF6B00] transition-colors"
            />
          </div>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="bg-[#F5F5F7] border border-[#D2D2D7] rounded-full px-3 py-2 text-xs font-medium text-[#1D1D1F] outline-none focus:border-[#FF6B00] transition-colors cursor-pointer"
          >
            <option value="all">Posted: Any time</option>
            <option value="24h">Posted: Last 24 hours</option>
            <option value="7d">Posted: Last 7 days</option>
            <option value="30d">Posted: Last 30 days</option>
          </select>
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
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex gap-4 p-5 bg-white rounded-2xl border border-[#E5E5EA]"
            >
              <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
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
                      <JobFreshnessBadge postedAt={job.posted_at} creationDate={job.creation_date} />
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoApply(job);
                      }}
                      className="flex items-center gap-1.5 bg-[#FF6B00] text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full hover:bg-[#E55F00] transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto Apply
                    </button>
                    <a
                      href={job.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hidden sm:inline-block bg-[#F5F5F7] border border-[#E5E5EA] hover:bg-[#E5E5EA] text-[#1D1D1F] text-sm font-medium px-4 py-2 rounded-full transition-colors duration-150"
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

      {/* Auto Apply Modal */}
      <Dialog open={autoApplyState !== null} onOpenChange={(open) => { if (!open) setAutoApplyState(null); }}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6">
          {autoApplyState === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="font-semibold text-[#1D1D1F] text-lg">Crafting your application...</h3>
              <p className="text-sm text-[#6E6E73] mt-1">Analysing job requirements...</p>
            </div>
          )}

          {autoApplyState === 'review' && selectedJob && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1D1D1F]">
                  Application Package: {selectedJob.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#6E6E73]">
                  {selectedJob.company} • Tailored by AI for your profile
                </DialogDescription>
              </DialogHeader>

              {/* Tab Selector */}
              <div className="flex gap-2 border-b border-[#E5E5EA] pb-2">
                <button
                  onClick={() => setActiveModalTab('coverLetter')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeModalTab === 'coverLetter' ? 'bg-[#FF6B00] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Cover Letter
                </button>
                <button
                  onClick={() => setActiveModalTab('summary')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeModalTab === 'summary' ? 'bg-[#FF6B00] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  CV Summary
                </button>
              </div>

              {/* Editable Content */}
              {activeModalTab === 'coverLetter' ? (
                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetter);
                      toast({ title: 'Copied!', description: 'Cover letter copied to clipboard.' });
                    }}
                    className="absolute right-3 top-3 p-1.5 bg-white rounded-lg border border-[#E5E5EA] hover:bg-[#F5F5F7] text-[#6E6E73] transition-colors"
                    title="Copy cover letter"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={10}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-4 text-xs font-mono text-[#1D1D1F] outline-none focus:border-[#FF6B00] leading-relaxed resize-y"
                  />
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tailoredSummary);
                      toast({ title: 'Copied!', description: 'CV summary copied to clipboard.' });
                    }}
                    className="absolute right-3 top-3 p-1.5 bg-white rounded-lg border border-[#E5E5EA] hover:bg-[#F5F5F7] text-[#6E6E73] transition-colors"
                    title="Copy summary"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <textarea
                    value={tailoredSummary}
                    onChange={(e) => setTailoredSummary(e.target.value)}
                    rows={6}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-4 text-xs font-mono text-[#1D1D1F] outline-none focus:border-[#FF6B00] leading-relaxed resize-y"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E5EA]">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(coverLetter);
                    toast({ title: 'Copied cover letter!', description: 'Copied to clipboard.' });
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-lg border border-[#E5E5EA] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy cover letter
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-lg border border-[#E5E5EA] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>

                {(() => {
                  const emailMatch = selectedJob.description_text?.match(
                    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
                  );
                  const recipientEmail = emailMatch ? emailMatch[0] : null;
                  const mailtoUrl = recipientEmail
                    ? `mailto:${recipientEmail}?subject=${encodeURIComponent(`Application for ${selectedJob.title} - ${userProfile?.full_name || 'Applicant'}`)}&body=${encodeURIComponent(coverLetter)}`
                    : null;

                  return mailtoUrl ? (
                    <a
                      href={mailtoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-lg border border-[#E5E5EA] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#007AFF]" />
                      Send via email ({recipientEmail})
                    </a>
                  ) : null;
                })()}

                <button
                  onClick={handleMarkAsApplied}
                  disabled={isMarkingApplied}
                  className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-[#FF6B00] hover:bg-[#E55F00] text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isMarkingApplied ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Mark as applied
                </button>
              </div>
            </div>
          )}

          {autoApplyState === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-12 h-12 text-[#34C759] mb-3" />
              <h3 className="font-bold text-[#1D1D1F] text-xl">Application package ready!</h3>
              <p className="text-sm text-[#6E6E73] mt-1 max-w-sm">
                Your application has been logged to your profile applications list.
              </p>
              <button
                onClick={() => setAutoApplyState(null)}
                className="mt-6 bg-[#FF6B00] hover:bg-[#E55F00] text-white font-medium rounded-full px-6 py-2 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
