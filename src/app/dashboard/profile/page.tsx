'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc, useCollection, type WithId, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon, Award, Briefcase, BarChart3, MapPin, Gauge, FileText, Clock, Star, Eye, FileUp, LogOut, Settings2, Computer, Building2, DollarSign, History, Lock, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define types for our Firestore data to use with hooks
type UserProfile = {
    targetRole?: string;
    experienceLevel?: string;
    location?: string;
    skills?: string[];
    careerGoals?: string;
}

type CV = {
    fileName: string;
    uploadDate: string;
    fileContent: string;
}

type MatchResult = {
    jobTitle: string;
    matchScore: number;
    analysisDate: string;
}

export default function ProfilePage() {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);
  const [usage, setUsage] = useState({ scansUsed: 0, scansLimit: 3 });
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedCv, setSelectedCv] = useState<WithId<CV> | null>(null);

  useEffect(() => {
    setIsClient(true);
    const storedScans = localStorage.getItem('angine_scansUsed');
    if (storedScans) {
        setUsage(prev => ({ ...prev, scansUsed: parseInt(storedScans, 10) }));
    }
  }, []);

  const isDeveloper = isClient && sessionStorage.getItem('isDeveloper') === 'true';

  const user = useMemo(() => {
    if (isDeveloper) {
      return {
        uid: 'dev-user',
        displayName: 'Developer',
        email: 'dev@angine.com',
        photoURL: 'https://i.pravatar.cc/150?u=developer',
      };
    }
    return authUser;
  }, [isDeveloper, authUser]);
  
  const loading = isDeveloper ? false : authLoading;

  // Fetch User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Fetch User CVs
  const cvsRef = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'cvs'), orderBy('uploadDate', 'desc'));
  }, [user, firestore]);
  const { data: cvs, isLoading: isCvsLoading } = useCollection<CV>(cvsRef);

  // Fetch Scan History for the most recent CV
  const recentCvId = cvs && cvs.length > 0 ? cvs[0].id : null;
  const matchResultsRef = useMemoFirebase(() => {
    if (!user || !recentCvId) return null;
    return query(collection(firestore, 'users', user.uid, 'cvs', recentCvId, 'matchResults'), orderBy('analysisDate', 'desc'), limit(5));
  }, [user, firestore, recentCvId]);
  const { data: scanHistory, isLoading: isHistoryLoading } = useCollection<MatchResult>(matchResultsRef);

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Anonymous User');

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
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score > 75) return 'default';
    if (score > 50) return 'secondary';
    return 'destructive';
  }

  const InfoRow = ({ icon: Icon, label, value, onEdit, isLoading }: { icon: React.ElementType, label: string, value?: string, onEdit?: () => void, isLoading: boolean }) => (
    <div className="flex items-start gap-4 p-3 border rounded-md">
        <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-grow">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isLoading ? <Skeleton className="h-5 w-3/4 mt-1" /> : <p className="text-sm font-medium">{value || 'Not set'}</p>}
        </div>
        {onEdit && <Button asChild variant="outline" size="sm" className="ml-auto"><Link href="/dashboard/onboarding"><Settings2 className="h-4 w-4" /></Link></Button>}
    </div>
  );

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
                    <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
                        <span>Career Snapshot</span>
                        <Button asChild variant="outline" size="sm"><Link href="/dashboard/onboarding"><Settings2 className="h-4 w-4 mr-2" />Edit Snapshot</Link></Button>
                    </h3>
                     <div className="space-y-4">
                        <InfoRow isLoading={isProfileLoading} icon={Briefcase} label="Current / Target Role" value={userProfile?.targetRole} />
                        <InfoRow isLoading={isProfileLoading} icon={BarChart3} label="Experience Level" value={userProfile?.experienceLevel} />
                        <InfoRow isLoading={isProfileLoading} icon={MapPin} label="Location" value={userProfile?.location} />
                    </div>
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-lg font-semibold mb-4">CV Manager</h3>
                    <Card>
                        <CardContent className="p-4 space-y-1">
                            {isCvsLoading && <Skeleton className="h-20 w-full" />}
                            {cvs && cvs.length > 0 ? (
                                cvs.map((cv) => (
                                    <Dialog key={cv.id}>
                                        <DialogTrigger asChild>
                                            <div onClick={() => setSelectedCv(cv)} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold truncate">{cv.fileName}</p>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(cv.uploadDate), { addSuffix: true })}</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" className="flex-shrink-0"><Eye className="h-4 w-4 mr-2" />View</Button>
                                            </div>
                                        </DialogTrigger>
                                    </Dialog>
                                ))
                            ) : !isCvsLoading && (
                                <p className="text-sm text-muted-foreground text-center p-4">You haven't uploaded any CVs yet.</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline" className="w-full"><Link href="/dashboard"><FileUp className="h-4 w-4 mr-2" /> Upload & Analyze New CV</Link></Button>
                        </CardFooter>
                    </Card>
                </div>

                 <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
                        <span>Job Preferences</span>
                        <Button asChild variant="outline" size="sm"><Link href="/dashboard/onboarding"><Settings2 className="h-4 w-4 mr-2" />Edit Preferences</Link></Button>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-2"><Briefcase className="h-4 w-4 text-primary" /> Preferred Roles</CardTitle>
                            {isProfileLoading ? <Skeleton className="h-5 w-full" /> : (
                                <p className="text-sm font-medium">{userProfile?.targetRole || 'Not set'}</p>
                            )}
                        </Card>
                        <Card className="p-4">
                           <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-2"><Star className="h-4 w-4 text-primary" /> Key Skills</CardTitle>
                           {isProfileLoading ? <Skeleton className="h-5 w-full" /> : (
                                <div className="flex flex-wrap gap-2">
                                    {userProfile?.skills && userProfile.skills.length > 0 ? userProfile.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>) : <p className="text-sm text-muted-foreground">Not set</p>}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-lg font-semibold mb-4">Recent Scan History</h3>
                    <Card>
                        <CardContent className="p-2">
                           {isHistoryLoading && <div className="space-y-1 p-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
                           {scanHistory && scanHistory.length > 0 ? (
                                <ul className="space-y-1">
                                    {scanHistory.map((scan) => (
                                        <li key={scan.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-semibold truncate">{scan.jobTitle}</p>
                                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(scan.analysisDate), { addSuffix: true })}</p>
                                            </div>
                                            <div className="flex items-center gap-4 ml-4">
                                              <Badge variant={getScoreBadgeVariant(scan.matchScore)} className="w-[50px] justify-center">{scan.matchScore}%</Badge>
                                              <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
                                            </div>
                                        </li>
                                    ))}
                               </ul>
                           ) : !isHistoryLoading && (
                                <div className="text-center text-sm text-muted-foreground p-4">
                                   No scan history found. Analyze a CV on the dashboard to get started.
                                </div>
                           )}
                           {scanHistory && scanHistory.length > 0 && (
                             <div className="text-center text-sm text-muted-foreground p-4 mt-2 border-t">
                                <Lock className="inline-block h-4 w-4 mr-1" />
                                Showing results for most recent CV only. 
                                <Button variant="link" className="p-0 h-auto text-sm ml-1">Upgrade to Pro to view all results.</Button>
                            </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
              </>
            ) : (
              !loading && <p>No user is signed in.</p>
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

       {selectedCv && (
        <Dialog open={!!selectedCv} onOpenChange={(isOpen) => !isOpen && setSelectedCv(null)}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                <DialogTitle>{selectedCv.fileName}</DialogTitle>
                <DialogDescription>
                    Uploaded on {new Date(selectedCv.uploadDate).toLocaleDateString()}
                </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] mt-4">
                    <pre className="text-sm whitespace-pre-wrap p-4 bg-muted rounded-md font-mono">
                        {selectedCv.fileContent}
                    </pre>
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
