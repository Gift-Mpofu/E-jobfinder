"use client";

import { useState, useEffect } from "react";
import type { FC } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { Upload, FileText, BarChart2, CheckCircle, XCircle, Lightbulb, BrainCircuit, ArrowRight, Zap, ChevronsRight, Frown, Meh, Smile, LogOut, Bell, TrendingUp, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { analyzeCv, type CvAnalysisOutput } from "@/ai/flows/cv-analyzer-flow";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useAuth } from "@/firebase";


const hireRateChartConfig = {
  rate: {
    label: "Hiring Rate",
    color: "hsl(var(--primary))",
  },
};


export default function Dashboard() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<CvAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanType, setScanType] = useState<'quick' | 'deep'>('quick');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [usageLimit] = useState(3);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isUserLoading) {
      const isDeveloper = sessionStorage.getItem('isDeveloper') === 'true';
      const onboardingComplete = sessionStorage.getItem('onboardingComplete') === 'true';

      if (!isDeveloper && !onboardingComplete && authUser) {
        router.push('/dashboard/onboarding');
      }
    }
  }, [isClient, isUserLoading, authUser, router]);

  const isDeveloper = isClient && sessionStorage.getItem('isDeveloper') === 'true';

  const user = isDeveloper
    ? {
        displayName: 'Developer',
        email: 'dev@angine.com',
        photoURL: 'https://i.pravatar.cc/150?u=developer',
      }
    : authUser;

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'User');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('text/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a plain text file (.txt, .md).',
        });
        setCvFile(null);
        event.target.value = ''; // Reset file input
        return;
      }
      setCvFile(file);
      setCvText(''); // Clear text area if file is chosen
    }
  };
  
  const handleCvTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCvText(e.target.value);
      if (e.target.value) {
          setCvFile(null); // Clear file if text is pasted
          // It's tricky to reset the file input visually without this, but it works functionally
          const fileInput = document.getElementById('cv-upload') as HTMLInputElement;
          if(fileInput) fileInput.value = '';
      }
  }

  const handleAnalyzeClick = async () => {
    const storedScans = localStorage.getItem('angine_scansUsed');
    const scansUsed = storedScans ? parseInt(storedScans, 10) : 0;

    if (scansUsed >= usageLimit) {
        toast({
            variant: 'destructive',
            title: 'Usage Limit Reached',
            description: 'You have used all your free scans for this week. Please upgrade for unlimited scans.',
        });
        return;
    }
    
    let cvContent = cvText;

    if (!cvContent && cvFile) {
        try {
            cvContent = await cvFile.text();
        } catch (error) {
            console.error("Error reading file:", error);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read the contents of the uploaded file.',
            });
            return;
        }
    }

    if (!cvContent || !jobDescription) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide both your CV and a job description.',
      });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
        const result = await analyzeCv({
            cvContent,
            jobDescription,
            scanType,
        });
        setAnalysisResult(result);
        const newScansUsed = scansUsed + 1;
        localStorage.setItem('angine_scansUsed', newScansUsed.toString());
    } catch (error: any) {
        console.error("Analysis failed:", error);
        toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: error.message || 'An unknown error occurred during analysis.',
        });
    } finally {
        setIsAnalyzing(false);
    }
  };

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

  const handleFeedbackSubmit = () => {
    // In a real app, you'd send this to a backend.
    console.log("Feedback submitted:", feedbackText);
    toast({
      title: "Feedback Submitted",
      description: "Thank you for helping us improve Angine!",
    });
    setFeedbackText("");
    setFeedbackOpen(false);
  };

  const ResultItem: FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 text-primary">{icon}</div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <div className="mt-2 text-muted-foreground">{children}</div>
      </div>
    </div>
  );

  const getScoreFeedback = (score: number) => {
    if (score < 40) {
      return {
        color: 'text-red-500 dark:text-red-400',
        progressColor: 'bg-red-500 dark:bg-red-400',
        Icon: Frown,
        message: "Don't Apply (Yet!)",
        suggestion: "Significant improvements are needed. Focus on the suggestions below before applying.",
      };
    }
    if (score < 75) {
      return {
        color: 'text-yellow-500 dark:text-yellow-400',
        progressColor: 'bg-yellow-500 dark:bg-yellow-400',
        Icon: Meh,
        message: 'Maybe Apply',
        suggestion: 'Your CV is a decent match, but could be much stronger. Consider the improvements below.',
      };
    }
    return {
      color: 'text-green-500 dark:text-green-400',
      progressColor: 'bg-green-500 dark:bg-green-400',
      Icon: Smile,
      message: 'Yes, Apply!',
      suggestion: 'Your profile is a strong fit for this role. Good luck!',
    };
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const scanModeConfig = {
    quick: {
      name: 'Quick Scan',
      description: 'Get a fast, high-level overview of your match.',
      icon: <Zap size={16} />,
      buttonText: 'Run Quick Scan',
      IconComponent: Zap,
    },
    deep: {
      name: 'Deep Scan',
      description: 'In-depth analysis of your CV, the job, and the company.',
      icon: <ChevronsRight size={16}/>,
      buttonText: 'Run Deep Scan',
      IconComponent: BrainCircuit,
    }
  }

  const scoreFeedback = analysisResult ? getScoreFeedback(analysisResult.matchScore) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border/40">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary font-headline">Angine</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseEnter={() => setNotificationsOpen(true)}
                  onMouseLeave={() => setNotificationsOpen(false)}
                >
                  <Bell className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-96"
                align="end"
                onMouseEnter={() => setNotificationsOpen(true)}
                onMouseLeave={() => setNotificationsOpen(false)}
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      You have 2 new messages.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-4 p-2 rounded-md">
                      <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <div className="grid gap-1">
                        <p className="text-sm font-medium">CV Scan Complete</p>
                        <p className="text-sm text-muted-foreground">
                          Your deep scan for 'Software Engineer' is finished.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-2 rounded-md">
                      <BrainCircuit className="h-6 w-6 text-primary animate-pulse flex-shrink-0" />
                      <div className="grid gap-1">
                        <p className="text-sm font-medium">Analysis in Progress</p>
                        <p className="text-sm text-muted-foreground">
                          Your quick scan for 'Product Manager' has started.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || ''} alt={displayName} />
                    <AvatarFallback>{user ? getInitials(displayName) : 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-primary" />
                <span>Analyze Your Match</span>
              </CardTitle>
              <CardDescription>
                Select a scan mode, provide your CV and a job description, and let Angine do the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <Tabs value={scanType} onValueChange={(value) => setScanType(value as 'quick' | 'deep')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quick">
                    <Zap className="mr-2 h-4 w-4"/>
                    Quick Scan
                  </TabsTrigger>
                  <TabsTrigger value="deep">
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Deep Scan
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="quick" className="text-sm text-muted-foreground p-2">
                 {scanModeConfig.quick.description}
                </TabsContent>
                <TabsContent value="deep" className="text-sm text-muted-foreground p-2">
                  {scanModeConfig.deep.description}
                </TabsContent>
              </Tabs>


              <div className="space-y-2">
                <Label htmlFor="cv-upload">CV Upload</Label>
                <div className="flex items-center gap-3">
                  <Label htmlFor="cv-upload" className="flex-1">
                    <Input id="cv-upload" type="file" accept=".txt,.md" onChange={handleFileChange} className="hidden" />
                    <Button asChild variant="outline">
                      <span className="cursor-pointer flex items-center gap-2">
                        <Upload size={16} />
                        Choose File
                      </span>
                    </Button>
                  </Label>
                  {cvFile && <span className="text-sm text-muted-foreground truncate">{cvFile.name}</span>}
                </div>
                <p className="text-xs text-muted-foreground">Upload your CV as a text file (.txt, .md).</p>
              </div>

              <div className="flex items-center text-center">
                  <div className="flex-grow border-t border-border" />
                  <span className="flex-shrink mx-4 text-muted-foreground text-sm">OR</span>
                  <div className="flex-grow border-t border-border" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv-text">Paste CV</Label>
                <Textarea
                  id="cv-text"
                  placeholder="Paste your CV content here..."
                  className="min-h-[200px] text-base"
                  value={cvText}
                  onChange={handleCvTextAreaChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-description">Job Description</Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the job description here..."
                  className="min-h-[200px] text-base"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAnalyzeClick} disabled={(!cvFile && !cvText) || !jobDescription || isAnalyzing} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {scanModeConfig[scanType].icon}
                    {scanModeConfig[scanType].buttonText}
                    <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg transition-all duration-500 ease-in-out">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="text-primary" />
                <span>Angine Results</span>
              </CardTitle>
              <CardDescription>
                {analysisResult ? 'Here is a breakdown of your compatibility.' : 'Your analysis will appear here.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                  <BrainCircuit className="w-16 h-16 text-primary animate-pulse" />
                  <p className="text-muted-foreground">Performing {scanType} scan...</p>
                  <Progress value={50} className="w-full animate-pulse" />
                </div>
              )}
              {!isAnalyzing && !analysisResult && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground p-8">
                  <BarChart2 className="w-16 h-16 mb-4" />
                  <h3 className="font-semibold text-lg text-foreground">Ready to find your perfect job?</h3>
                  <p>Provide your info, select a scan mode, and let Angine find your optimal path.</p>
                </div>
              )}
              {analysisResult && scoreFeedback && (
                <div className="space-y-8 animate-in fade-in-50 duration-500">
                  <div className="text-center p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold tracking-tight">Match Score</h3>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <scoreFeedback.Icon className={`h-12 w-12 ${scoreFeedback.color}`} />
                      <span className={`text-6xl font-bold ${scoreFeedback.color}`}>{analysisResult.matchScore}%</span>
                    </div>
                    <Progress value={analysisResult.matchScore} className="h-3 mt-4" indicatorClassName={scoreFeedback.progressColor} />
                     <div className="mt-4">
                      <p className={`text-xl font-bold ${scoreFeedback.color}`}>{scoreFeedback.message}</p>
                      <p className="text-sm text-muted-foreground">{scoreFeedback.suggestion}</p>
                    </div>
                  </div>

                  <ResultItem icon={<CheckCircle />} title="Strengths">
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.strengths.map((strength) => (
                        <Badge key={strength} variant="secondary">{strength}</Badge>
                      ))}
                    </div>
                  </ResultItem>

                  <ResultItem icon={<XCircle />} title="Missing Keywords">
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.missingKeywords.map((keyword) => (
                        <Badge key={keyword} variant="destructive">{keyword}</Badge>
                      ))}
                    </div>
                  </ResultItem>
                  
                  <ResultItem icon={<Lightbulb />} title="Improvement Suggestions">
                    <p className="whitespace-pre-wrap">{analysisResult.improvementSuggestions}</p>
                  </ResultItem>

                  {analysisResult.hireRateData && analysisResult.hireRateData.length > 0 && (
                    <ResultItem icon={<TrendingUp />} title={`Hiring Outlook for a ${analysisResult.jobTitle}`}>
                      <ChartContainer config={hireRateChartConfig} className="h-[250px] w-full text-xs">
                          <BarChart accessibilityLayer data={analysisResult.hireRateData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" />
                              <XAxis
                                  dataKey="level"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                              />
                              <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  tickFormatter={(value) => `${value}%`}
                              />
                              <Tooltip
                                  cursor={false}
                                  content={<ChartTooltipContent indicator="dot" />}
                              />
                              <Bar dataKey="rate" fill="var(--color-rate)" radius={4} />
                          </BarChart>
                      </ChartContainer>
                    </ResultItem>
                  )}
                  
                  <ResultItem icon={<BrainCircuit />} title="Expert Reasoning">
                    <p className="whitespace-pre-wrap">{analysisResult.reasoning}</p>
                  </ResultItem>

                  <div className="mt-8 pt-8 border-t text-center">
                    <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Provide Feedback on Your Results
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Provide Feedback</DialogTitle>
                          <DialogDescription>
                            Did Angine work perfectly? Let us know what you think about the analysis you received.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Textarea
                            id="feedback-text"
                            placeholder="Your feedback is valuable to us..."
                            className="min-h-[150px]"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button onClick={handleFeedbackSubmit} disabled={!feedbackText}>Submit Feedback</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
