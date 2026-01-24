'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon, Award, Briefcase, BarChart3, MapPin, Gauge, FileText, Clock, Star, RefreshCcw, Replace, Settings2, Computer, Home, Building2, DollarSign, History, Lock, Eye, FileUp, LogOut } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [usage, setUsage] = useState({ scansUsed: 0, scansLimit: 3 });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
        const storedScans = localStorage.getItem('angine_scansUsed');
        if (storedScans) {
            setUsage(prev => ({ ...prev, scansUsed: parseInt(storedScans, 10) }));
        }
    }
  }, [isClient]);

  const isDeveloper = isClient && sessionStorage.getItem('isDeveloper') === 'true';

  const user = isDeveloper
    ? {
        displayName: 'Developer',
        email: 'dev@angine.com',
        photoURL: 'https://i.pravatar.cc/150?u=developer',
      }
    : authUser;
  
  const loading = isDeveloper ? false : authLoading;

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Anonymous User');

  const onSignOut = async () => {
    try {
      if (isDeveloper) {
        sessionStorage.removeItem('isDeveloper');
      } else {
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
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  // --- Placeholder Data ---
  const cvs = [
      { name: 'Software_Engineer_CV_2024.pdf', lastScanned: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), bestScore: 88, },
      { name: 'Product_Manager_Resume.pdf', lastScanned: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), bestScore: 72, },
  ];

  const jobPreferences = {
      roles: ['Senior Product Manager', 'Product Lead'],
      workModel: 'Hybrid',
      salaryRange: '£90,000 - £120,000',
  };

  const scanHistory = [
      { jobTitle: 'Lead Frontend Developer @ Vercel', matchScore: 88, feedback: 'Strong alignment with React & Next.js skills.' },
      { jobTitle: 'Software Engineer @ Google', matchScore: 75, feedback: 'Good, but missing some data structure keywords.' },
      { jobTitle: 'Junior Developer @ Shopify', matchScore: 65, feedback: 'Lacks experience in specified e-commerce platforms.' },
  ];

  const getScoreBadgeVariant = (score: number) => {
    if (score > 75) return 'default';
    if (score > 50) return 'secondary';
    return 'destructive';
  }
  // --- End Placeholder Data ---


  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
      <div className="container mx-auto">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="text-primary" />
              <span>User Profile</span>
            </CardTitle>
            <CardDescription>View and manage your profile and career details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {loading ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : user ? (
              <>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.photoURL || ''} alt={displayName} />
                    <AvatarFallback className="text-3xl">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-4">Account Details</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-3 border rounded-md">
                            <Award className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Account Type</span>
                            <span className="text-sm text-primary font-semibold ml-auto bg-primary/10 px-2 py-1 rounded-full">Free</span>
                        </div>

                        <div className="p-3 border rounded-md">
                            <div className="flex items-center gap-4">
                                <Gauge className="h-5 w-5 text-muted-foreground" />
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium">Usage Meter</span>
                                        <span className="text-xs text-muted-foreground">{usage.scansUsed} / {usage.scansLimit} scans used</span>
                                    </div>
                                    <Progress value={(usage.scansUsed / usage.scansLimit) * 100} />
                                    <p className="text-xs text-muted-foreground mt-2">Your free scans reset weekly. <Button variant="link" className="p-0 h-auto text-xs">Upgrade for unlimited scans.</Button></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-4">Career Snapshot</h3>
                     <div className="space-y-4">
                        <div className="flex items-start gap-4 p-3 border rounded-md">
                            <Briefcase className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-xs text-muted-foreground">Current / Target Role</p>
                                <p className="text-sm font-medium">Senior Product Manager</p>
                            </div>
                             <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                        </div>
                        <div className="flex items-start gap-4 p-3 border rounded-md">
                            <BarChart3 className="h-5 w-5 text-muted-foreground mt-1" />
                             <div>
                                <p className="text-xs text-muted-foreground">Experience Level</p>
                                <p className="text-sm font-medium">Senior</p>
                            </div>
                             <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                        </div>
                         <div className="flex items-start gap-4 p-3 border rounded-md">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="text-sm font-medium">London, UK</p>
                            </div>
                             <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                        </div>
                    </div>
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-lg font-semibold mb-4">CV Manager</h3>
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            {cvs.map((cv, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-4">
                                        <FileText className="h-6 w-6 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">{cv.name}</p>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(cv.lastScanned, { addSuffix: true })}</span>
                                                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Best score: <span className="font-bold text-foreground">{cv.bestScore}%</span></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm"><RefreshCcw className="h-4 w-4 mr-2" />Re-scan</Button>
                                        <Button variant="ghost" size="sm"><Replace className="h-4 w-4 mr-2" />Replace</Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter>
                             <Button variant="outline" className="w-full"><FileUp className="h-4 w-4 mr-2" /> Upload New CV</Button>
                        </CardFooter>
                    </Card>
                </div>

                 <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
                        <span>Job Preferences</span>
                        <Button variant="outline" size="sm"><Settings2 className="h-4 w-4 mr-2" />Edit Preferences</Button>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-2"><Briefcase className="h-4 w-4 text-primary" /> Preferred Roles</CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {jobPreferences.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                            </div>
                        </Card>
                        <Card className="p-4">
                           <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-2"><Computer className="h-4 w-4 text-primary" /> Work Model</CardTitle>
                            <p className="text-sm font-medium flex items-center gap-2">
                                {jobPreferences.workModel === 'Hybrid' && <Building2 className="h-4 w-4 text-muted-foreground" />}
                                {jobPreferences.workModel === 'Remote' && <Home className="h-4 w-4 text-muted-foreground" />}
                                {jobPreferences.workModel}
                            </p>
                        </Card>
                        <Card className="p-4">
                           <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-primary" /> Salary Range</CardTitle>
                            <p className="text-sm font-medium">{jobPreferences.salaryRange}</p>
                        </Card>
                    </div>
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-lg font-semibold mb-4">Scan History & Results</h3>
                    <Card>
                        <CardContent className="p-2">
                           <ul className="space-y-1">
                                {scanHistory.map((scan, index) => (
                                    <li key={index} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                                        <div className="flex-1">
                                            <p className="font-semibold">{scan.jobTitle}</p>
                                            <p className="text-xs text-muted-foreground">{scan.feedback}</p>
                                        </div>
                                        <div className="flex items-center gap-4 ml-4">
                                          <Badge variant={getScoreBadgeVariant(scan.matchScore)} className="w-[50px] justify-center">{scan.matchScore}%</Badge>
                                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                                        </div>
                                    </li>
                                ))}
                           </ul>
                           <div className="text-center text-sm text-muted-foreground p-4 mt-2 border-t">
                                <Lock className="inline-block h-4 w-4 mr-1" />
                                Detailed insights are locked for free users. 
                                <Button variant="link" className="p-0 h-auto text-sm ml-1">Upgrade to Pro to view all results.</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
              </>
            ) : (
              <p>No user is signed in.</p>
            )}
          </CardContent>
          {user && (
            <CardFooter className="border-t pt-6">
              <Button variant="outline" onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
