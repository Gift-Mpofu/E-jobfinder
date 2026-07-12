'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase, useUser } from '@/supabase/provider';
import { useProfile } from '@/supabase/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, X, RotateCcw, MapPin, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description_text: string;
  skills_required: string[];
  seniority: string;
  url?: string;
};

const COMPANY_COLOURS = ['#FF6B00', '#007AFF', '#34C759', '#FF9F0A', '#AF52DE', '#FF2D55', '#5AC8FA', '#1D9E75'];

function getCompanyColour(name: string) {
  return COMPANY_COLOURS[(name || 'X').charCodeAt(0) % COMPANY_COLOURS.length];
}

export default function SwipePage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setIsLoading(true);
      const [jobsRes, swipesRes] = await Promise.all([
        supabase
          .from('live_jobs')
          .select('id, title, company, location, description_text, skills_required, seniority, url')
          .eq('status', 'open')
          .order('posted_at', { ascending: false, nullsFirst: false })
          .limit(50),
        supabase.from('job_swipes').select('job_id, direction').eq('user_id', user!.id),
      ]);

      const swiped = new Set((swipesRes.data || []).map((s) => s.job_id));
      setSwipedIds(swiped);
      setJobs((jobsRes.data || []).filter((j) => !swiped.has(j.id)));
      setIsLoading(false);
    }
    load();
  }, [user, supabase]);

  const currentJob = jobs[currentIndex];

  const recordSwipe = useCallback(async (jobId: string, direction: 'left' | 'right') => {
    if (!user) return;
    const { error } = await supabase.from('job_swipes').upsert(
      { user_id: user.id, job_id: jobId, direction },
      { onConflict: 'user_id,job_id' }
    );
    if (error) {
      console.error('Swipe save error:', error);
    }
    if (direction === 'right') {
      await supabase.from('user_job_actions').upsert(
        { user_id: user.id, job_id: jobId, action_type: 'saved' },
        { onConflict: 'user_id,job_id,action_type' }
      );
      toast({ title: 'Saved!', description: 'Job added to your saved list.' });
    }
  }, [user, supabase, toast]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentJob || isAnimating) return;
    setIsAnimating(direction);
    await recordSwipe(currentJob.id, direction);
    setTimeout(() => {
      setSwipedIds((prev) => new Set([...prev, currentJob.id]));
      setCurrentIndex((i) => i + 1);
      setIsAnimating(null);
    }, 300);
  };

  const calcScore = (job: LiveJob) => {
    if (!profile?.skills?.length) return 50;
    const us = profile.skills.map((s) => s.toLowerCase().trim());
    const js = (job.skills_required || []).map((s) => s.toLowerCase().trim());
    if (!js.length) return 50;
    const matched = js.filter((j) => us.some((u) => j.includes(u) || u.includes(j))).length;
    return Math.min(Math.max(40 + Math.ceil((matched / js.length) * 60), 10), 99);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-10">
          <Briefcase className="h-12 w-12 text-[#AEAEB2] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">All caught up!</h2>
          <p className="text-sm text-[#6E6E73] mb-6">
            You&apos;ve reviewed all available jobs. Check back later for new listings.
          </p>
          <button
            onClick={() => { setCurrentIndex(0); setJobs([]); window.location.reload(); }}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#FF6B00] hover:underline"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh jobs
          </button>
        </div>
      </div>
    );
  }

  const colour = getCompanyColour(currentJob.company);
  const score = calcScore(currentJob);

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Swipe Jobs</h1>
        <p className="text-sm text-[#6E6E73] mt-1">
          Swipe right to save · Swipe left to pass · {jobs.length - currentIndex} remaining
        </p>
      </div>

      <div
        className={`bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm transition-transform duration-300 ${
          isAnimating === 'right' ? 'translate-x-24 rotate-6 opacity-0' :
          isAnimating === 'left' ? '-translate-x-24 -rotate-6 opacity-0' : ''
        }`}
      >
        <div className="p-6" style={{ borderTop: `4px solid ${colour}` }}>
          <div className="flex items-start gap-4 mb-4">
            <div
              className="flex-shrink-0 flex items-center justify-center font-bold text-white text-xl"
              style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colour }}
            >
              {currentJob.company.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold text-[#1D1D1F] leading-tight">{currentJob.title}</h2>
              <p className="text-sm text-[#6E6E73] mt-0.5">{currentJob.company}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-[#AEAEB2]">
                <MapPin className="h-3 w-3" />
                {currentJob.location || 'South Africa'}
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF3EB] text-[#CC5200]">
              {score}% match
            </span>
          </div>

          <p className="text-sm text-[#6E6E73] leading-relaxed line-clamp-5 mb-4">
            {currentJob.description_text}
          </p>

          {(currentJob.skills_required || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentJob.skills_required.slice(0, 6).map((sk) => (
                <span key={sk} className="bg-[#F5F5F7] text-[#6E6E73] rounded-full px-2.5 py-0.5 text-xs">
                  {sk}
                </span>
              ))}
            </div>
          )}
          {currentJob.seniority && (
            <span className="text-xs text-[#AEAEB2] capitalize">{currentJob.seniority} level</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 mt-8">
        <button
          onClick={() => handleSwipe('left')}
          disabled={!!isAnimating}
          className="h-16 w-16 rounded-full border-2 border-[#FF3B30] flex items-center justify-center text-[#FF3B30] hover:bg-[#FFF0EF] transition-colors disabled:opacity-50"
          aria-label="Pass"
        >
          <X className="h-7 w-7" />
        </button>
        <button
          onClick={() => handleSwipe('right')}
          disabled={!!isAnimating}
          className="h-16 w-16 rounded-full border-2 border-[#34C759] flex items-center justify-center text-[#34C759] hover:bg-[#E8F8EE] transition-colors disabled:opacity-50"
          aria-label="Save"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>

      {currentJob.url && (
        <p className="text-center mt-6">
          <a
            href={currentJob.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#FF6B00] hover:underline"
          >
            View full listing →
          </a>
        </p>
      )}
    </div>
  );
}
