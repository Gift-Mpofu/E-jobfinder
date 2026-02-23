
'use client';

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, updateDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, User, LogOut, CheckCircle, BrainCircuit, Timer, LayoutDashboard, CreditCard, Menu, Briefcase, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { WithId } from "@/firebase";

const ADMIN_EMAIL = 'giftmpofud@gmail.com';

type UserProfile = {
    scansUsed?: number;
    scanLimitReachedAt?: Timestamp | null;
    photoURL?: string;
    email?: string;
    lastActive?: Timestamp | null;
};

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
  userProfile: WithId<UserProfile> | null;
  isProfileLoading: boolean;
  isAdmin: boolean;
};

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

const NavItems = ({ isAdmin }: { isAdmin: boolean }) => {
    const pathname = usePathname();
    const navLinks = [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/dashboard/profile', label: 'Profile' },
        ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
        { href: '/dashboard/upgrade', label: 'Upgrade to Pro' }
    ];

    return (
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-sm font-medium">
            {navLinks.map(link => (
                 <Link 
                    key={link.href} 
                    href={link.href} 
                    className={`transition-colors hover:text-primary flex items-center gap-1.5 ${(pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))) ? 'text-primary' : 'text-muted-foreground'}`}
                >
                    {link.icon && <link.icon className="h-4 w-4" />}
                    {link.label}
                </Link>
            ))}
        </nav>
    );
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [usageLimit] = useState(3);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [resetTimeLeft, setResetTimeLeft] = useState('');
  const [isLimitActive, setIsLimitActive] = useState(false);

  // Defer admin check until after hydration to avoid mismatch
  const isAdminUser = mounted && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const scansUsed = userProfile?.scansUsed ?? 0;
  const scanLimitReachedAt = userProfile?.scanLimitReachedAt;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track user activity
  useEffect(() => {
    if (userProfileRef) {
      updateDoc(userProfileRef, { lastActive: serverTimestamp() })
        .catch(err => console.warn("Activity tracking error:", err));
    }
  }, [userProfileRef]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification = { ...notification, id: new Date().toISOString() };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addScan = useCallback(async () => {
    if (!user || !userProfileRef) return;

    const newScansUsed = (userProfile?.scansUsed ?? 0) + 1;
    let updateData: Partial<UserProfile> = { scansUsed: newScansUsed };

    if (newScansUsed >= usageLimit) {
      updateData.scanLimitReachedAt = serverTimestamp() as Timestamp;
      addNotification({
        type: 'limit_reached',
        title: 'Usage Limit Reached',
        description: 'Your free scans will reset in 7 days.',
      });
    }

    try {
      await updateDoc(userProfileRef, updateData);
    } catch (error) {
      console.error("Failed to update scan count:", error);
    }
  }, [user, userProfileRef, userProfile?.scansUsed, usageLimit, addNotification]);

  useEffect(() => {
    if (!scanLimitReachedAt) {
        setIsLimitActive(false);
        setResetTimeLeft('');
        return;
    }

    const limitDate = scanLimitReachedAt.toDate();
    const resetTime = limitDate.getTime() + 7 * 24 * 60 * 60 * 1000;

    if (new Date().getTime() > resetTime) {
      if (userProfileRef && (userProfile?.scansUsed ?? 0) > 0) {
        updateDoc(userProfileRef, {
          scansUsed: 0,
          scanLimitReachedAt: null
        }).catch(err => console.error("Failed to reset scan count:", err));
      }
      setIsLimitActive(false);
      return;
    }

    setIsLimitActive(true);
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = resetTime - now;

      if (distance < 0) {
        clearInterval(interval);
        setResetTimeLeft('');
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setResetTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scanLimitReachedAt, userProfileRef, userProfile?.scansUsed]);

  useEffect(() => {
    // Redirect non-admins without profiles to onboarding
    if (mounted && !isUserLoading && user && !isAdminUser) {
      if (!isProfileLoading && !userProfile) {
        router.push('/dashboard/onboarding');
      }
    }
  }, [mounted, isUserLoading, user, isAdminUser, isProfileLoading, userProfile, router]);


  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'User');
  const photoURL = userProfile?.photoURL || user?.photoURL;

  const onSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      router.push('/login');
    } catch (error) {
      console.error("Sign out failed", error);
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: "An error occurred while signing out.",
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : name[0];
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'scan_complete': return <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />;
      case 'limit_reached': return <Timer className="h-6 w-6 text-yellow-500 flex-shrink-0" />;
      case 'scan_in_progress': return <BrainCircuit className="h-6 w-6 text-primary animate-pulse flex-shrink-0" />;
      default: return <Bell className="h-6 w-6 text-muted-foreground flex-shrink-0" />;
    }
  };

  const contextValue = {
    scansUsed,
    usageLimit,
    addScan,
    notifications,
    addNotification,
    clearNotifications,
    resetTimeLeft,
    isLimitActive,
    userProfile: userProfile as WithId<UserProfile> | null,
    isProfileLoading,
    isAdmin: isAdminUser,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
        <div className="min-h-screen bg-background text-foreground">
            <header className="p-2 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
              <div className="container mx-auto flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64">
                            <div className="p-4">
                                <Link href="/dashboard" className="text-2xl font-bold text-primary font-headline flex items-center gap-2 mb-8">
                                    <Briefcase />
                                    <span>E-Job Finder</span>
                                </Link>
                                <nav className="flex flex-col gap-2">
                                    <Button asChild variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}><Link href="/dashboard"><LayoutDashboard className="mr-2"/>Dashboard</Link></Button>
                                    <Button asChild variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}><Link href="/dashboard/profile"><User className="mr-2"/>Profile</Link></Button>
                                    {isAdminUser && (
                                        <Button asChild variant="ghost" className="justify-start text-primary" onClick={() => setMobileMenuOpen(false)}><Link href="/dashboard/admin"><ShieldCheck className="mr-2"/>Admin Panel</Link></Button>
                                    )}
                                    <Button asChild variant="ghost" className="justify-start" onClick={() => setMobileMenuOpen(false)}><Link href="/dashboard/upgrade"><CreditCard className="mr-2"/>Upgrade</Link></Button>
                                </nav>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <Link href="/dashboard" className="hidden md:flex items-center gap-2 text-2xl font-bold text-primary font-headline">
                        <Briefcase />
                        <span>E-Job Finder</span>
                    </Link>
                    {mounted && <NavItems isAdmin={isAdminUser} />}
                 </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {mounted && notifications.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="end">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            {notifications.length > 0 ? `You have ${notifications.length} new notification(s).` : 'No new notifications.'}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          {resetTimeLeft && (
                            <div className="flex items-center gap-4 p-2 rounded-md bg-muted/50">
                              {getNotificationIcon('limit_reached')}
                              <div className="grid gap-1">
                                <p className="text-sm font-medium">Next scans available in:</p>
                                <p className="text-sm text-muted-foreground font-mono">{resetTimeLeft}</p>
                              </div>
                            </div>
                          )}
                          {notifications.map(notif => (
                            <div key={notif.id} className="flex items-center gap-4 p-2 rounded-md">
                              {getNotificationIcon(notif.type)}
                              <div className="grid gap-1">
                                <p className="text-sm font-medium">{notif.title}</p>
                                <p className="text-sm text-muted-foreground">{notif.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={photoURL || ''} alt={displayName} />
                            <AvatarFallback>{mounted && user ? getInitials(displayName) : 'U'}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" align="end">
                         <div className="flex flex-col space-y-2">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{mounted ? displayName : 'User'}</p>
                            <p className="text-xs leading-none text-muted-foreground">{mounted ? user?.email : ''}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={onSignOut} className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                          </Button>
                        </div>
                      </PopoverContent>
                  </Popover>
                </div>
              </div>
            </header>
            <main className="container mx-auto p-4 lg:p-8">
              {children}
            </main>
        </div>
    </DashboardContext.Provider>
  );
}
