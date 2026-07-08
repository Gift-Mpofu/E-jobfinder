'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase, useUser } from '@/supabase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Briefcase, BarChart3, MapPin, FileText, Clock, Eye, FileUp, LogOut, Settings2, Lock, ChevronRight, Pencil, Loader2, Trash2, Award, Gauge, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '../layout';

type CV = { id: string; fileName: string; uploadDate: string; fileContent: string; };
type MatchResult = { id: string; jobTitle: string; matchScore: number; analysisDate: string; };

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
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { scansUsed, usageLimit, userProfile, isProfileLoading } = useDashboard();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cvs, setCvs] = useState<CV[] | null>(null);
  const [isCvsLoading, setIsCvsLoading] = useState(true);
  const [scanHistory, setScanHistory] = useState<MatchResult[] | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const loading = authLoading || isProfileLoading;

  useEffect(() => {
    if (!user) { if (!authLoading) setIsCvsLoading(false); return; }
    let mounted = true;
    supabase.from('cvs').select('*').eq('user_id', user.id).order('upload_date', { ascending: false })
      .then(({ data }) => {
        if (mounted) { if (data) setCvs(data.map(d => ({ id: d.id, fileName: d.file_name, uploadDate: d.upload_date, fileContent: d.file_content }))); setIsCvsLoading(false); }
      });
    return () => { mounted = false; };
  }, [user, supabase, authLoading]);

  useEffect(() => {
    if (!user || !cvs || cvs.length === 0) { if (!isCvsLoading) setIsHistoryLoading(false); return; }
    let mounted = true;
    supabase.from('match_results').select('*').eq('user_id', user.id).eq('cv_id', cvs[0].id).order('analysis_date', { ascending: false }).limit(5)
      .then(({ data }) => {
        if (mounted) { if (data) setScanHistory(data.map(d => ({ id: d.id, jobTitle: d.job_title, matchScore: d.match_score, analysisDate: d.analysis_date }))); setIsHistoryLoading(false); }
      });
    return () => { mounted = false; };
  }, [user, cvs, supabase, isCvsLoading]);

  // Safe avatar — no Japanese characters from OAuth
  const avatarSrc = userProfile?.photo_url && userProfile.photo_url.trim() !== '' ? userProfile.photo_url : null;
  const emailInitials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';
  const displayName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Anonymous User');

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
          {cvs && cvs.length > 0 ? cvs.map(cv => (
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
                <ScrollArea className="h-96">
                  <pre className="bg-white text-[#1D1D1F] border border-[#E5E5EA] rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[500px] font-sans">{cv.fileContent}</pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )) : !isCvsLoading && (
            <p className="text-sm text-[#6E6E73] text-center py-4">No CVs uploaded yet.</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
          <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full py-3 border border-[#D2D2D7] rounded-full text-sm font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
            <FileUp className="h-4 w-4" />Upload &amp; Analyse New CV
          </Link>
        </div>
      </Card>

      {/* ── Scan History ── */}
      <Card className="p-6">
        <SectionTitle>Recent Scan History</SectionTitle>
        {isHistoryLoading && <div className="space-y-2"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /></div>}
        {scanHistory && scanHistory.length > 0 ? (
          <>
            <ul className="space-y-1">
              {scanHistory.map(scan => (
                <li key={scan.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-[#1D1D1F] truncate">{scan.jobTitle}</p>
                    <p className="text-xs text-[#6E6E73]">{formatDistanceToNow(new Date(scan.analysisDate), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm font-bold" style={{ color: getScoreColour(scan.matchScore) }}>{scan.matchScore}%</span>
                    <ChevronRight className="h-4 w-4 text-[#AEAEB2]" />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-center text-[#AEAEB2] mt-4 pt-4 border-t border-[#E5E5EA]">
              <Lock className="inline h-3 w-3 mr-1" />Showing most recent CV only.{' '}
              <Link href="/dashboard/upgrade" className="text-[#FF6B00]">Upgrade for full history.</Link>
            </p>
          </>
        ) : !isHistoryLoading && (
          <p className="text-sm text-[#6E6E73] text-center py-4">
            No scan history yet. Analyse a CV on the dashboard to get started.
          </p>
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
