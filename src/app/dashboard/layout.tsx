'use client';

import { useState, useEffect, createContext, useContext, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useUser, useAuth } from "@/firebase";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, User, LogOut, CheckCircle, BrainCircuit, Timer, LayoutDashboard, CreditCard } from "lucide-react";
import { type CvAnalysisOutput } from "@/ai/flows/cv-analyzer-flow";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';


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
  addScan: () => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  clearNotifications: () => void;
  resetTimeLeft: string;
};

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

const NavItems = () => {
    const pathname = usePathname();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                    <Link href="/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/profile')} tooltip="Profile">
                    <Link href="/dashboard/profile">
                        <User />
                        <span>Profile</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/upgrade')} tooltip="Upgrade to Pro">
                    <Link href="/dashboard/upgrade">
                        <CreditCard />
                        <span>Upgrade to Pro</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const auth = useAuth();
  
  const [isClient, setIsClient] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const [scansUsed, setScansUsed] = useState(0);
  const [usageLimit] = useState(3);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [resetTimeLeft, setResetTimeLeft] = useState('');

  useEffect(() => {
    setIsClient(true);
    const storedScans = localStorage.getItem('angine_scansUsed');
    setScansUsed(storedScans ? parseInt(storedScans, 10) : 0);
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification = { ...notification, id: new Date().toISOString() };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addScan = useCallback(() => {
    const newScansUsed = scansUsed + 1;
    setScansUsed(newScansUsed);
    localStorage.setItem('angine_scansUsed', newScansUsed.toString());
    if (newScansUsed >= usageLimit) {
      const now = new Date().toISOString();
      localStorage.setItem('scanLimitReachedAt', now);
      addNotification({
        type: 'limit_reached',
        title: 'Usage Limit Reached',
        description: 'Your free scans will reset in 7 days.',
      });
    }
  }, [scansUsed, usageLimit, addNotification]);

  useEffect(() => {
    const limitReachedAt = localStorage.getItem('scanLimitReachedAt');
    if (limitReachedAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const resetTime = new Date(limitReachedAt).getTime() + 7 * 24 * 60 * 60 * 1000;
        const distance = resetTime - now;

        if (distance < 0) {
          clearInterval(interval);
          setResetTimeLeft('');
          localStorage.removeItem('scanLimitReachedAt');
          localStorage.removeItem('angine_scansUsed');
          setScansUsed(0);
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          setResetTimeLeft(`${days}d ${hours}h ${minutes}m`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [scansUsed]);

  useEffect(() => {
    if (isClient && !isUserLoading && authUser) {
      const isDeveloper = sessionStorage.getItem('isDeveloper') === 'true';
      const onboardingComplete = sessionStorage.getItem('onboardingComplete') === 'true';

      if (!isDeveloper && !onboardingComplete) {
        router.push('/dashboard/onboarding');
      }
    }
  }, [isClient, isUserLoading, authUser, router]);

  const isDeveloper = isClient && sessionStorage.getItem('isDeveloper') === 'true';

  const user = useMemo(() => isDeveloper
    ? {
        uid: 'dev-user',
        displayName: 'Developer',
        email: 'dev@angine.com',
        photoURL: 'https://i.pravatar.cc/150?u=developer',
      }
    : authUser, [isDeveloper, authUser]);

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'User');

  const onSignOut = async () => {
    try {
      if (isDeveloper) {
        sessionStorage.removeItem('isDeveloper');
      } else if (auth) {
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
  };

  return (
    <DashboardContext.Provider value={contextValue}>
       <SidebarProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Sidebar>
            <SidebarHeader>
              <Link href="/dashboard" className="text-2xl font-bold text-primary font-headline p-2 flex items-center gap-2">
                <BrainCircuit />
                <span>Angine</span>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <NavItems />
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onSignOut}>
                    <LogOut />
                    <span>Log out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="p-2 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
              <div className="container mx-auto flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <p className="font-semibold hidden md:block">Dashboard</p>
                 </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                        {notifications.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />}
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
                            <AvatarImage src={user?.photoURL || ''} alt={displayName} />
                            <AvatarFallback>{user ? getInitials(displayName) : 'U'}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" align="end">
                         <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
                        </div>
                      </PopoverContent>
                  </Popover>
                </div>
              </div>
            </header>
            <main className="container mx-auto p-4 lg:p-8">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
