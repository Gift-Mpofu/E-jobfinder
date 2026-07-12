'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase, useUser } from '@/supabase/provider';
import { useDashboard } from '../layout';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Shield, Trash2, Loader2, ChevronRight } from 'lucide-react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E5E5EA] p-6 ${className}`}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile } = useDashboard();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || !confirm('Are you sure? This permanently deletes your account and all data.')) return;
    setIsDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      toast({ title: 'Account deleted', description: 'Your account has been removed.' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#FF6B00]' : 'bg-[#D2D2D7]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );

  return (
    <div className="max-w-[640px] mx-auto space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Settings</h1>
        <p className="text-sm text-[#6E6E73] mt-1">Manage your account and notification preferences.</p>
      </div>

      <Card>
        <h2 className="text-[16px] font-semibold text-[#1D1D1F] mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-xl px-4 py-3">
            <Mail className="h-4 w-4 text-[#AEAEB2] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#AEAEB2] uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-[#1D1D1F] truncate">{user?.email}</p>
            </div>
          </div>
          <Link
            href="/dashboard/profile"
            className="flex items-center justify-between bg-[#F5F5F7] rounded-xl px-4 py-3 hover:bg-[#EBEBEB] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-[#AEAEB2]" />
              <span className="text-sm text-[#1D1D1F]">Edit profile &amp; career snapshot</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#AEAEB2]" />
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-[16px] font-semibold text-[#1D1D1F] mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-[#AEAEB2]" />
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">Email notifications</p>
                <p className="text-xs text-[#6E6E73]">Account updates and scan results</p>
              </div>
            </div>
            <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-[#AEAEB2]" />
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">New job alerts</p>
                <p className="text-xs text-[#6E6E73]">Weekly digest of matching roles</p>
              </div>
            </div>
            <Toggle checked={jobAlerts} onChange={setJobAlerts} />
          </div>
        </div>
        <p className="text-xs text-[#AEAEB2] mt-4">Notification preferences are saved locally during beta.</p>
      </Card>

      <Card>
        <h2 className="text-[16px] font-semibold text-[#FF3B30] mb-2">Danger Zone</h2>
        <p className="text-sm text-[#6E6E73] mb-4">
          Permanently delete your account, CVs, scan history, and saved jobs.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="flex items-center gap-2 text-sm font-medium text-[#FF3B30] hover:text-[#CC2F26] transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete my account
        </button>
      </Card>

      <p className="text-xs text-center text-[#AEAEB2] pb-8">
        Plan: Free · {userProfile?.target_role ? `Targeting ${userProfile.target_role}` : 'Complete onboarding to set your role'}
      </p>
    </div>
  );
}
