'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@/supabase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Briefcase, BarChart3, MapPin, FileText, Clock, Eye, FileUp, LogOut, Settings2, Lock, ChevronRight, ChevronDown, ChevronUp, Pencil, Loader2, Trash2, Award, Gauge, Star, FileSearch, Settings, Bell, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, isSameWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '../layout';
import { NumberedSuggestionsList } from '@/components/ui/numbered-suggestions';

type CV = { id: string; fileName: string; uploadDate: string; fileContent: string; };
type FullScanResult = {
  id: string;
  jobTitle: string;
  matchScore: number;
  analysisDate: string;
  strengths?: string[];
  missingKeywords?: string[];
  improvementSuggestions?: string;
  reasoning?: string;
  cvFileName?: string;
  jobDescriptionSnippet?: string;
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E5E5EA] ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[16px] font-semibold text-[#1D1D1F]">{children}</h2>
      {action}
    </div>
  );
}

export default function ProfilePage() {
  const { user, isUserLoading: authLoading } = useUser();
  const supabase = getSupabaseClient();
  const router = useRouter();
  const { toast } = useToast();
  const { scansUsed, usageLimit, userProfile, isProfileLoading } = useDashboard();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cvs, setCvs] = useState<CV[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isCvsLoading, setIsCvsLoading] = useState(true);
  const [scanHistory, setScanHistory] = useState<FullScanResult[] | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [expandedResultIds, setExpandedResultIds] = useState<Set<string>>(new Set());

  // Settings State
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [cityInput, setCityInput] = useState('Johannesburg');

  useEffect(() => {
    if (userProfile) {
      if (userProfile.full_name) setDisplayNameInput(userProfile.full_name);
      if (userProfile.username) setUsernameInput(userProfile.username);
      if (userProfile.bio) setBioInput(userProfile.bio);
      if (userProfile.location) setCityInput(userProfile.location);
      if (userProfile.email_notifications != null) setEmailNotifs(userProfile.email_notifications);
      if (userProfile.job_alerts != null) setJobAlerts(userProfile.job_alerts);
    }
  }, [userProfile]);

  const handleSaveProfileField = async (fieldsToUpdate: Record<string, unknown>) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update(fieldsToUpdate)
      .eq('id', user.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
      return;
    }
    if (typeof fieldsToUpdate.full_name === 'string') {
      await supabase.auth.updateUser({ data: { full_name: fieldsToUpdate.full_name } });
    }
    setSavedFeedback('Saved ✓');
    setTimeout(() => setSavedFeedback(null), 2000);
  };

  const loading = authLoading || isProfileLoading;

  useEffect(() => {
    if (!user) { if (!authLoading) setIsCvsLoading(false); return; }
    let mounted = true;
    supabase.from('cvs').select('*').eq('user_id', user.id).order('upload_date', { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('Error fetching CVs:', error);
          toast({ variant: 'destructive', title: 'Could not load CVs', description: error.message });
        } else if (data) {
          setCvs(data.map(d => ({ id: d.id, fileName: d.file_name, uploadDate: d.upload_date, fileContent: d.file_content })));
        }
        setIsCvsLoading(false);
      });
    return () => { mounted = false; };
  }, [user, supabase, authLoading]);

  useEffect(() => {
    if (!user) { if (!authLoading) setIsHistoryLoading(false); return; }
    const userId = user.id;
    let mounted = true;

    async function fetchScanHistory() {
      setIsHistoryLoading(true);
      try {
        const { data: matchData, error } = await supabase
          .from('match_results')
          .select('id, user_id, cv_id, job_description_id, job_title, match_score, analysis_date, strengths, missing_keywords, improvement_suggestions, reasoning')
          .eq('user_id', userId)
          .order('analysis_date', { ascending: false })
          .limit(10);

        if (error || !matchData) {
          if (mounted) { setScanHistory([]); setIsHistoryLoading(false); }
          return;
        }

        const cvIds = Array.from(new Set(matchData.map(m => m.cv_id).filter(Boolean)));
        const jdIds = Array.from(new Set(matchData.map(m => m.job_description_id).filter(Boolean)));

        const cvMap: Record<string, string> = {};
        const jdMap: Record<string, string> = {};

        if (cvIds.length > 0) {
          const { data: cvsData } = await supabase.from('cvs').select('id, file_name').in('id', cvIds);
          if (cvsData) {
            cvsData.forEach(c => { cvMap[c.id] = c.file_name; });
          }
        }

        if (jdIds.length > 0) {
          const { data: jdsData } = await supabase.from('job_descriptions').select('id, description_text').in('id', jdIds);
          if (jdsData) {
            jdsData.forEach(j => { jdMap[j.id] = j.description_text; });
          }
        }

        const formattedResults: FullScanResult[] = matchData.map(m => ({
          id: m.id,
          jobTitle: m.job_title || 'Untitled Job',
          matchScore: m.match_score || 0,
          analysisDate: m.analysis_date,
          strengths: m.strengths || [],
          missingKeywords: m.missing_keywords || [],
          improvementSuggestions: m.improvement_suggestions || '',
          reasoning: m.reasoning || '',
          cvFileName: m.cv_id ? (cvMap[m.cv_id] || 'CV not found') : 'CV not found',
          jobDescriptionSnippet: m.job_description_id ? (jdMap[m.job_description_id] || 'Description not available') : 'Description not available',
        }));

        if (mounted) {
          setScanHistory(formattedResults);
          setIsHistoryLoading(false);
        }
      } catch (err) {
        console.error("Error fetching scan history:", err);
        if (mounted) { setScanHistory([]); setIsHistoryLoading(false); }
      }
    }

    fetchScanHistory();
    return () => { mounted = false; };
  }, [user, supabase, authLoading]);

  // Safe avatar — no Japanese characters from OAuth
  const avatarSrc = userProfile?.photo_url && userProfile.photo_url.trim() !== '' ? userProfile.photo_url : null;
  const emailInitials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';
  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Anonymous User');

  const onSignOut = async () => {
    try { await supabase.auth.signOut(); router.push('/login'); }
    catch { toast({ variant: "destructive", title: "Sign Out Failed" }); }
  };

  const handleAvatarClick = () => { if (!isUploading) fileInputRef.current?.click(); };
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    toast({ title: 'Uploading...', description: 'Your profile picture is being uploaded.' });
    try {
      const filePath = `${user.id}/${Date.now()}.${file.name.split('.').pop() || 'png'}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      await supabase.from('profiles').update({ photo_url: publicUrl }).eq('id', user.id);
      toast({ title: 'Success!', description: 'Profile picture updated.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const usagePct = Math.min((scansUsed / usageLimit) * 100, 100);

  const getScoreColour = (score: number) => score > 75 ? '#34C759' : score > 50 ? '#FF9F0A' : '#FF3B30';

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png,image/jpeg,image/gif" className="hidden" />

      {/* ── Profile Header ── */}
      <Card className="p-6">
        {loading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-32" /></div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="h-16 w-16">
                {avatarSrc && <AvatarImage src={avatarSrc} alt="Profile" />}
                <AvatarFallback className="bg-[#FF6B00] text-white text-xl font-semibold">{emailInitials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Pencil className="h-5 w-5 text-white" />}
              </div>
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-[#1D1D1F]">{displayName}</h1>
              <p className="text-[14px] text-[#6E6E73]">{user.email}</p>
              <span className="inline-block mt-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73]">Free Plan</span>
            </div>
          </div>
        ) : (
          <p className="text-[#6E6E73] text-sm">No user signed in.</p>
        )}
      </Card>

      {/* ── Account Details ── */}
      <Card className="p-6">
        <SectionTitle>Account Details</SectionTitle>
        <div className="space-y-3">
          {/* Account type row */}
          <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-xl px-4 py-3">
            <Lock className="h-4 w-4 text-[#AEAEB2] flex-shrink-0" />
            <span className="text-sm text-[#6E6E73] flex-1">Account Type</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#D2D2D7]">Free</span>
          </div>

          {/* Usage meter */}
          <div className="bg-[#F5F5F7] rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Gauge className="h-4 w-4 text-[#AEAEB2] flex-shrink-0" />
              <span className="text-sm text-[#6E6E73] flex-1">Weekly scans</span>
              <span className="text-sm font-medium text-[#1D1D1F]">{scansUsed} / {usageLimit} used</span>
            </div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-[#FF6B00] rounded-full transition-all duration-500" style={{ width: `${usagePct}%` }} />
            </div>
            <p className="text-xs text-[#6E6E73] mt-2">
              Resets every Monday ·{' '}
              <Link href="/dashboard/upgrade" className="text-[#FF6B00] hover:underline">Upgrade for unlimited</Link>
            </p>
          </div>
        </div>
      </Card>

      {/* ── Career Snapshot ── */}
      <Card className="p-6">
        <SectionTitle action={
          <Link href="/dashboard/onboarding" className="text-sm text-[#FF6B00] font-medium hover:underline">Edit Snapshot</Link>
        }>Career Snapshot</SectionTitle>
        <div className="space-y-2">
          {[
            { icon: Briefcase, label: 'CURRENT / TARGET ROLE', value: userProfile?.target_role },
            { icon: BarChart3, label: 'EXPERIENCE LEVEL', value: userProfile?.experience_level },
            { icon: MapPin, label: 'LOCATION', value: userProfile?.location },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#F5F5F7] rounded-xl px-4 py-3">
              <p className="text-[11px] font-medium text-[#AEAEB2] uppercase tracking-wider mb-0.5">{label}</p>
              {isProfileLoading ? <Skeleton className="h-4 w-3/4 mt-1" /> : (
                <p className="text-[14px] font-medium text-[#1D1D1F]">{value || 'Not set'}</p>
              )}
            </div>
          ))}

          {/* Skills */}
          <div className="bg-[#F5F5F7] rounded-xl px-4 py-3">
            <p className="text-[11px] font-medium text-[#AEAEB2] uppercase tracking-wider mb-2">KEY SKILLS</p>
            {isProfileLoading ? <Skeleton className="h-6 w-full" /> : (
              <div className="flex flex-wrap gap-1.5">
                {userProfile?.skills && userProfile.skills.length > 0
                  ? userProfile.skills.map((s: string) => (
                    <span key={s} className="bg-[#FFF3EB] text-[#CC5200] rounded-full px-3 py-1 text-xs font-medium">{s}</span>
                  ))
                  : <p className="text-sm text-[#AEAEB2]">Not set</p>
                }
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── CV Manager ── */}
      <Card className="p-6">
        <SectionTitle>CV Manager</SectionTitle>
        <div className="space-y-1">
          {isCvsLoading && <Skeleton className="h-16 w-full rounded-xl" />}
          {cvs && cvs.length > 0 ? (
            (showAll ? cvs : cvs.slice(0, 3)).map(cv => (
              <Dialog key={cv.id}>
                <DialogTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F5F7] cursor-pointer transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-5 w-5 text-[#AEAEB2] flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-[#1D1D1F] truncate">{cv.fileName}</p>
                        <p className="text-xs text-[#6E6E73] flex items-center gap-1">
                          <Clock className="h-3 w-3" />{formatDistanceToNow(new Date(cv.uploadDate), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#6E6E73] flex items-center gap-1 flex-shrink-0 ml-2">
                      <Eye className="h-3.5 w-3.5" />View
                    </span>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl bg-white">
                  <DialogHeader>
                    <DialogTitle>{cv.fileName}</DialogTitle>
                    <DialogDescription>Uploaded {formatDistanceToNow(new Date(cv.uploadDate), { addSuffix: true })}</DialogDescription>
                  </DialogHeader>
                  <div className="bg-white text-[#1D1D1F] border border-[#E5E5EA] rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[500px]">
                    {cv.fileContent && cv.fileContent.trim() !== ''
                      ? cv.fileContent
                      : 'CV content not available for this file. Try uploading again as .txt format.'}
                  </div>
                </DialogContent>
              </Dialog>
            ))
          ) : !isCvsLoading && (
            <p className="text-sm text-[#6E6E73] text-center py-4">No CVs uploaded yet.</p>
          )}
        </div>

        {cvs && cvs.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-[#FF6B00] mt-2 font-medium hover:underline"
          >
            {showAll ? 'Show less' : `Show all ${cvs.length} CVs`}
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
          <Link href="/dashboard/scanner" className="flex items-center justify-center gap-2 w-full py-3 border border-[#D2D2D7] rounded-full text-sm font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
            <FileUp className="h-4 w-4" />Upload &amp; Analyse New CV
          </Link>
        </div>
      </Card>

      {/* ── Scan History ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1D1D1F]">Scan History</h2>
            <p className="text-[14px] text-[#6E6E73] mt-0.5">Your recent CV scan results</p>
          </div>
          {scanHistory && scanHistory.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF3EB] text-[#CC5200]">
              {(() => {
                const countThisWeek = scanHistory.filter(s => isSameWeek(new Date(s.analysisDate), new Date(), { weekStartsOn: 1 })).length;
                return `${countThisWeek} scan${countThisWeek === 1 ? '' : 's'} this week`;
              })()}
            </span>
          )}
        </div>

        {isHistoryLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        )}

        {!isHistoryLoading && scanHistory && scanHistory.length > 0 && (
          <div className="space-y-3">
            {scanHistory.map(scan => {
              const isExpanded = expandedResultIds.has(scan.id);
              const scoreColor = scan.matchScore >= 70
                ? '#34C759'
                : scan.matchScore >= 40
                ? '#FF6B00'
                : '#AEAEB2';

              return (
                <div
                  key={scan.id}
                  className="border border-[#E5E5EA] rounded-2xl p-4 transition-all duration-200 hover:shadow-sm"
                >
                  {/* Always visible top row */}
                  <div
                    onClick={() => {
                      setExpandedResultIds(prev => {
                        const next = new Set(prev);
                        if (next.has(scan.id)) next.delete(scan.id);
                        else next.add(scan.id);
                        return next;
                      });
                    }}
                    className="flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: 48px Score Circle */}
                    <div
                      className="w-12 h-12 rounded-full border-[3px] flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: scoreColor, color: scoreColor }}
                    >
                      <span className="text-[14px] font-bold">{scan.matchScore}%</span>
                    </div>

                    {/* Middle: Job title, CV used, Date */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold text-[#1D1D1F] truncate leading-snug">
                        {scan.jobTitle}
                      </h3>
                      <p className="text-[12px] text-[#6E6E73] mt-0.5 truncate">
                        CV: {scan.cvFileName}
                      </p>
                      <p className="text-[12px] text-[#AEAEB2] mt-0.5">
                        {formatDistanceToNow(new Date(scan.analysisDate), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Right: Chevron Icon */}
                    <div className="flex-shrink-0 text-[#AEAEB2]">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div
                      className="mt-3 bg-[#F5F5F7] rounded-2xl p-4 space-y-3 border border-[#E5E5EA] cursor-default"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Job Description Preview */}
                      <div>
                        <p className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-1">
                          Job Description Preview
                        </p>
                        <p className="text-[12px] text-[#6E6E73] italic leading-relaxed">
                          {scan.jobDescriptionSnippet
                            ? (scan.jobDescriptionSnippet.length > 200
                                ? `${scan.jobDescriptionSnippet.slice(0, 200)}...`
                                : scan.jobDescriptionSnippet)
                            : 'Description not available'}
                        </p>
                      </div>

                      {/* Strengths */}
                      {scan.strengths && scan.strengths.length > 0 && (
                        <div>
                          <p className="text-[12px] font-medium text-[#34C759] mb-1.5">✓ Strengths</p>
                          <div className="flex flex-wrap gap-1.5">
                            {scan.strengths.map((s, i) => (
                              <span key={i} className="text-[10px] bg-[#E8F8EE] text-[#1A7A3A] rounded-full px-2.5 py-0.5 font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Keywords */}
                      {scan.missingKeywords && scan.missingKeywords.length > 0 && (
                        <div>
                          <p className="text-[12px] font-medium text-[#FF3B30] mb-1.5">✗ Missing</p>
                          <div className="flex flex-wrap gap-1.5">
                            {scan.missingKeywords.map((k, i) => (
                              <span key={i} className="text-[10px] bg-[#FFE5E5] text-[#FF3B30] rounded-full px-2.5 py-0.5 font-medium">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Improvement Suggestion */}
                      {scan.improvementSuggestions && (
                        <div>
                          <p className="text-[12px] font-medium text-[#6E6E73] mb-0.5">Suggestion</p>
                          <NumberedSuggestionsList text={scan.improvementSuggestions} />
                        </div>
                      )}

                      {/* Re-scan button */}
                      <div className="pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push('/dashboard/scanner');
                          }}
                          className="text-sm font-medium text-[#FF6B00] hover:underline flex items-center gap-1"
                        >
                          Scan this job again →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isHistoryLoading && (!scanHistory || scanHistory.length === 0) && (
          <div className="text-center py-8 px-4 space-y-3">
            <FileSearch className="h-10 w-10 mx-auto text-[#AEAEB2]" />
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F]">No scans yet</p>
              <p className="text-xs text-[#6E6E73] mt-1">Use the Scanner to analyse your CV against job descriptions</p>
            </div>
            <Button
              onClick={() => router.push('/dashboard/scanner')}
              className="bg-[#FF6B00] hover:bg-[#E55F00] text-white text-xs rounded-full px-4 py-2 mt-2"
            >
              Go to Scanner →
            </Button>
          </div>
        )}
      </Card>

      {/* ── Settings Section ── */}
      <Card className="p-6">
        <div
          onClick={() => setIsSettingsExpanded(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#FF6B00]" />
            <h2 className="text-[16px] font-semibold text-[#1D1D1F]">⚙ Account Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            {savedFeedback && (
              <span className="text-xs font-semibold text-[#34C759] bg-[#E8F8EE] px-2.5 py-0.5 rounded-full transition-opacity">
                {savedFeedback}
              </span>
            )}
            <span className="text-[#AEAEB2]">
              {isSettingsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </span>
          </div>
        </div>

        {isSettingsExpanded && (
          <div className="mt-5 pt-5 border-t border-[#E5E5EA] space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayNameInput}
                onChange={e => setDisplayNameInput(e.target.value)}
                onBlur={() => handleSaveProfileField({ full_name: displayNameInput })}
                placeholder="Your full name"
                className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] outline-none focus:border-[#FF6B00] transition-colors"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                onBlur={() => handleSaveProfileField({ username: usernameInput })}
                placeholder="username"
                className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] outline-none focus:border-[#FF6B00] transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider mb-1">
                Bio
              </label>
              <textarea
                rows={3}
                value={bioInput}
                onChange={e => setBioInput(e.target.value)}
                onBlur={() => handleSaveProfileField({ bio: bioInput })}
                placeholder="Brief professional bio..."
                className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] outline-none focus:border-[#FF6B00] transition-colors resize-none"
              />
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider mb-1">
                City (South Africa)
              </label>
              <select
                value={cityInput}
                onChange={e => {
                  setCityInput(e.target.value);
                  handleSaveProfileField({ location: e.target.value });
                }}
                className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] outline-none focus:border-[#FF6B00] transition-colors"
              >
                {['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Gqeberha (Port Elizabeth)', 'Bloemfontein', 'Polokwane', 'Nelspruit', 'East London', 'Kimberley', 'Remote / Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Notification Toggles */}
            <div className="pt-2 border-t border-[#E5E5EA] space-y-3">
              <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">Notifications</h3>
              
              <div className="flex items-center justify-between bg-[#F5F5F7] p-3 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-[#1D1D1F]">Email Notifications</p>
                  <p className="text-[11px] text-[#6E6E73]">Account updates and scan results</p>
                </div>
                <button
                  role="switch"
                  aria-checked={emailNotifs}
                  onClick={() => {
                    const next = !emailNotifs;
                    setEmailNotifs(next);
                    handleSaveProfileField({ email_notifications: next });
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${emailNotifs ? 'bg-[#FF6B00]' : 'bg-[#D2D2D7]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${emailNotifs ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#F5F5F7] p-3 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-[#1D1D1F]">Job Match Alerts</p>
                  <p className="text-[11px] text-[#6E6E73]">Weekly digest of high-match roles</p>
                </div>
                <button
                  role="switch"
                  aria-checked={jobAlerts}
                  onClick={() => {
                    const next = !jobAlerts;
                    setJobAlerts(next);
                    handleSaveProfileField({ job_alerts: next });
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${jobAlerts ? 'bg-[#FF6B00]' : 'bg-[#D2D2D7]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${jobAlerts ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            {/* Delete Account Info */}
            <div className="pt-2 border-t border-[#E5E5EA]">
              <p className="text-xs font-semibold text-[#FF3B30] mb-1">Delete Account</p>
              <p className="text-xs text-[#6E6E73]">
                To request permanent account and data deletion, contact support at{' '}
                <a href="mailto:support@e-jobfinder.co.za" className="text-[#FF6B00] underline">
                  support@e-jobfinder.co.za
                </a>.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Sign out ── */}
      {user && (
        <div className="pb-8">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-[#6E6E73] hover:text-[#FF3B30] transition-colors"
          >
            <LogOut className="h-4 w-4" />Log out
          </button>
        </div>
      )}
    </div>
  );
}
