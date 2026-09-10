'use client';

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase, useUser } from "@/supabase/provider";
import { useProfile, type UserProfile } from "@/supabase/hooks";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, User, LogOut, CheckCircle, BrainCircuit, Timer, LayoutDashboard, CreditCard, Menu, ShieldCheck, ScanLine, Settings, Heart, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AiCompanion } from '@/components/ui/ai-companion';
import { isSameWeek, nextMonday, startOfDay } from 'date-fns';

const ADMIN_EMAIL = 'giftmpofud@gmail.com';

type Notification = {
  id: string;
  type: 'scan_complete' | 'limit_reached' | 'scan_in_progress';
  title: string;
  description: string;
  data?: any;
};

type DashboardContextType = {
  scansUsed: number;
  usageLimit: number;
  addScan: () => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  clearNotifications: () => void;
  resetTimeLeft: string;
  isLimitActive: boolean;
  userProfile: UserProfile | null;
  isProfileLoading: boolean;
  isAdmin: boolean;
};

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
  return context;
};

const NavItems = ({ isAdmin }: { isAdmin: boolean }) => {
  const pathname = usePathname();
  const isAdminPage = pathname === '/dashboard/admin';

  const navLinks = [
    ...(!isAdminPage ? [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/scanner', label: 'Scanner', icon: ScanLine },
      { href: '/dashboard/cv-builder', label: 'CV Builder', icon: FileText },
      { href: '/dashboard/find-jobs', label: 'Find Jobs' },
      { href: '/dashboard/swipe', label: 'Swipe', icon: Heart },
      { href: '/dashboard/profile', label: 'Profile' },
    ] : []),
    ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navLinks.map(link => {
        const isActive = link.href === '/dashboard' ? pathname === '/dashboard' : pathname === link.href || pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors duration-150 flex items-center gap-1.5 ${
              isActive ? 'text-[#FF6B00] font-semibold' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            {link.icon && <link.icon className="h-4 w-4" />}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usageLimit] = useState(20);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [resetTimeLeft, setResetTimeLeft] = useState('');
  const [isLimitActive, setIsLimitActive] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isAdminUser = mounted && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (mounted && !isUserLoading && isAdminUser && pathname.startsWith('/dashboard') && pathname !== '/dashboard/admin') {
      router.replace('/dashboard/admin');
    }
  }, [mounted, isUserLoading, isAdminUser, pathname, router]);

  const { profile: userProfile, isLoading: isProfileLoading } = useProfile();

  useEffect(() => {
    if (userProfile && mounted && user) {
      supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', user.id).then(({ error }) => { if (error) console.error(error); });
    }
  }, [userProfile?.id, mounted, user, supabase]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    setNotifications(prev => [{ ...notification, id: new Date().toISOString() }, ...prev].slice(0, 5));
  }, []);

  const clearNotifications = useCallback(() => { setNotifications([]); }, []);

  const addScan = useCallback(async () => {
    if (!user) return;
    const isUserAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const newScansUsed = (userProfile?.scans_used ?? 0) + 1;
    if (!isUserAdmin && newScansUsed >= usageLimit) {
      addNotification({ type: 'limit_reached', title: 'Usage Limit Reached', description: 'Your free scans will reset next Monday.' });
    }
    try {
      await supabase.from('profiles').update({ scans_used: newScansUsed }).eq('id', user.id);
    } catch (error) { console.error("Failed to update scan count:", error); }
  }, [user, userProfile?.scans_used, usageLimit, addNotification, supabase]);

  useEffect(() => {
    if (!user) return;
    const isUserAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (isUserAdmin) {
      setIsLimitActive(false);
      setResetTimeLeft('');
      return;
    }
    const now = new Date();
    const lastResetDate = userProfile?.last_scan_reset ? new Date(userProfile.last_scan_reset) : null;
    if (!lastResetDate || !isSameWeek(now, lastResetDate, { weekStartsOn: 1 })) {
      if ((userProfile?.scans_used ?? 0) > 0 || !lastResetDate) {
        supabase.from('profiles').update({ scans_used: 0, last_scan_reset: new Date().toISOString() }).eq('id', user.id).then(({ error }) => { if (error) console.error(error); });
      }
      setIsLimitActive(false); setResetTimeLeft(''); return;
    }
    if ((userProfile?.scans_used ?? 0) >= usageLimit) {
      setIsLimitActive(true);
      const resetTime = startOfDay(nextMonday(new Date())).getTime();
      const interval = setInterval(() => {
        const distance = resetTime - new Date().getTime();
        if (distance < 0) { clearInterval(interval); setResetTimeLeft(''); }
        else {
          const d = Math.floor(distance / 86400000);
          const h = Math.floor((distance % 86400000) / 3600000);
          const m = Math.floor((distance % 3600000) / 60000);
          setResetTimeLeft(`${d}d ${h}h ${m}m`);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else { setIsLimitActive(false); setResetTimeLeft(''); }
  }, [user, userProfile?.last_scan_reset, userProfile?.scans_used, usageLimit, supabase]);

  useEffect(() => {
    if (mounted && !isUserLoading && user && !isAdminUser) {
      if (!isProfileLoading && !userProfile && pathname !== '/dashboard/onboarding') {
        router.push('/dashboard/onboarding');
      }
    }
  }, [mounted, isUserLoading, user, isAdminUser, isProfileLoading, userProfile, router, pathname]);

  // Safe avatar: only pass src if non-empty string
  const avatarSrc = userProfile?.photo_url && userProfile.photo_url.trim() !== '' ? userProfile.photo_url : null;
  const emailInitials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';
  const displayName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'User');

  const onSignOut = async () => {
    try { await supabase.auth.signOut(); router.push('/login'); }
    catch (error) { console.error("Sign out failed", error); }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'scan_complete': return <CheckCircle className="h-5 w-5 text-[#34C759]" />;
      case 'limit_reached': return <Timer className="h-5 w-5 text-[#FF9F0A]" />;
      case 'scan_in_progress': return <BrainCircuit className="h-5 w-5 text-[#FF6B00] animate-pulse" />;
      default: return <Bell className="h-5 w-5 text-[#6E6E73]" />;
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#F5F5F7]" />;

  const contextValue = {
    scansUsed: userProfile?.scans_used ?? 0,
    usageLimit, addScan, notifications, addNotification, clearNotifications,
    resetTimeLeft, isLimitActive, userProfile, isProfileLoading, isAdmin: isAdminUser,
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/scanner', label: 'Scanner', icon: ScanLine },
    { href: '/dashboard/find-jobs', label: 'Find Jobs' },
    { href: '/dashboard/swipe', label: 'Swipe', icon: Heart },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/upgrade', label: 'Upgrade', icon: CreditCard },
  ];

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#F5F5F7]" style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
        {/* ── NAV ── */}
        <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5EA]" style={{ height: '52px' }}>
          <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
            {/* Logo + Mobile sheet trigger */}
            <div className="flex items-center gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="md:hidden p-1.5 rounded text-[#6E6E73]" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 bg-white p-0">
                  <div className="p-5 border-b border-[#E5E5EA]">
                    <span className="font-bold text-[17px] text-[#1D1D1F]">
                      <span className="text-[#FF6B00]">E</span>
                      <span className="text-[#FF6B00] text-[8px] align-middle mx-[1px]">●</span>
                      Job Finder
                    </span>
                  </div>
                  <nav className="flex flex-col p-4 gap-1">
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          (link.href === '/dashboard' ? pathname === '/dashboard' : pathname === link.href || pathname.startsWith(link.href)) ? 'bg-[#FFF3EB] text-[#FF6B00]' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        {link.icon && <link.icon className="h-4 w-4" />}
                        {link.label}
                      </Link>
                    ))}
                    {isAdminUser && (
                      <Link href="/dashboard/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#FF6B00] hover:bg-[#FFF3EB]">
                        <ShieldCheck className="h-4 w-4" />Admin Panel
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="font-bold text-[17px] text-[#1D1D1F]">
                <span className="text-[#FF6B00]">E</span>
                <span className="text-[#FF6B00] text-[8px] align-middle mx-[1px]">●</span>
                Job Finder
              </Link>

              <NavItems isAdmin={isAdminUser} />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Upgrade button */}
              {!isAdminUser && (
                <Link
                  href="/dashboard/upgrade"
                  className="hidden md:block text-sm font-medium px-4 py-1.5 rounded-full bg-[#FF6B00] text-white hover:bg-[#E55F00] transition-colors duration-150"
                >
                  Upgrade to Pro
                </Link>
              )}

              {/* Bell */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF6B00]" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-white border border-[#E5E5EA] rounded-2xl shadow-lg p-4" align="end">
                  <p className="text-sm font-semibold text-[#1D1D1F] mb-3">Notifications</p>
                  {notifications.length === 0 && !resetTimeLeft ? (
                    <p className="text-sm text-[#6E6E73]">No new notifications.</p>
                  ) : (
                    <div className="space-y-2">
                      {resetTimeLeft && (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-[#F5F5F7]">
                          {getNotificationIcon('limit_reached')}
                          <div>
                            <p className="text-sm font-medium text-[#1D1D1F]">Resets in {resetTimeLeft}</p>
                          </div>
                        </div>
                      )}
                      {notifications.map(n => (
                        <div key={n.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#F5F5F7]">
                          {getNotificationIcon(n.type)}
                          <div>
                            <p className="text-sm font-medium text-[#1D1D1F]">{n.title}</p>
                            <p className="text-xs text-[#6E6E73]">{n.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Avatar */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      {avatarSrc && <AvatarImage src={avatarSrc} alt="Profile" />}
                      <AvatarFallback className="bg-[#FF6B00] text-white text-xs font-semibold">
                        {emailInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 bg-white border border-[#E5E5EA] rounded-2xl shadow-lg p-4" align="end">
                  <p className="text-sm font-semibold text-[#1D1D1F] truncate">{displayName}</p>
                  <p className="text-xs text-[#6E6E73] truncate mb-3">{user?.email}</p>
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2 text-sm text-[#6E6E73] hover:text-[#FF3B30] transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>

        <AiCompanion />
      </div>
    </DashboardContext.Provider>
  );
}