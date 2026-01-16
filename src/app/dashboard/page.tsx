"use client";

import { useState } from "react";
import type { FC } from "react";
import { useRouter } from 'next/navigation';
import { handleSignOut } from '@/firebase/auth';
import { Upload, FileText, BarChart2, CheckCircle, XCircle, Lightbulb, BrainCircuit, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

type AnalysisResult = {
  matchScore: number;
  strengths: string[];
  missingKeywords: string[];
  improvementSuggestions: string;
  reasoning: string;
};

const placeholderResult: AnalysisResult = {
  matchScore: 85,
  strengths: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Project Management"],
  missingKeywords: ["GraphQL", "Docker", "Kubernetes"],
  improvementSuggestions: "Consider highlighting your experience with state management libraries like Redux or Zustand. Adding projects that showcase end-to-end development could also strengthen your profile.",
  reasoning: "Incorporating missing keywords like 'GraphQL' is crucial as the job description explicitly mentions experience with modern APIs. This will help your CV pass through initial automated screenings and demonstrate a broader skill set to human reviewers."
};

export default function Dashboard() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    await handleSignOut();
    router.push('/');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCvFile(event.target.files[0]);
    }
  };

  const handleAnalyzeClick = () => {
    if ((!cvFile && !cvText) || !jobDescription) {
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      setAnalysisResult(placeholderResult);
      setIsAnalyzing(false);
    }, 1500);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border/40">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary font-headline">E-Jobfinder Pro</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-primary" />
                <span>Analyze Your Match</span>
              </CardTitle>
              <CardDescription>Upload your CV and paste a job description to see your compatibility score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cv-upload">CV Upload</Label>
                <div className="flex items-center gap-3">
                  <Label htmlFor="cv-upload" className="flex-1">
                    <Input id="cv-upload" type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
                    <Button asChild variant="outline">
                      <span className="cursor-pointer flex items-center gap-2">
                        <Upload size={16} />
                        Choose File
                      </span>
                    </Button>
                  </Label>
                  {cvFile && <span className="text-sm text-muted-foreground truncate">{cvFile.name}</span>}
                </div>
                <p className="text-xs text-muted-foreground">Upload your CV to analyze job compatibility (PDF or DOCX).</p>
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
                  onChange={(e) => setCvText(e.target.value)}
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
                    Analyze Match
                    <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>

          <div className="sticky top-8">
            <Card className="shadow-lg transition-all duration-500 ease-in-out">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="text-primary" />
                  <span>Match Results</span>
                </CardTitle>
                <CardDescription>
                  {analysisResult ? 'Here is a breakdown of your compatibility.' : 'Your analysis will appear here.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <BrainCircuit className="w-16 h-16 text-primary animate-pulse" />
                    <p className="text-muted-foreground">Performing deep analysis...</p>
                    <Progress value={50} className="w-full animate-pulse" />
                  </div>
                )}
                {!isAnalyzing && !analysisResult && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground p-8">
                    <BarChart2 className="w-16 h-16 mb-4" />
                    <h3 className="font-semibold text-lg text-foreground">Ready to find your perfect job?</h3>
                    <p>Upload your CV and a job description, then click "Analyze Match" to get started.</p>
                  </div>
                )}
                {analysisResult && (
                  <div className="space-y-8 animate-in fade-in-50 duration-500">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">Match Score</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <Progress value={analysisResult.matchScore} className="h-3" />
                        <span className="text-2xl font-bold text-primary">{analysisResult.matchScore}%</span>
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
                      <p>{analysisResult.improvementSuggestions}</p>
                    </ResultItem>
                    
                    <ResultItem icon={<BrainCircuit />} title="Expert Reasoning">
                      <p>{analysisResult.reasoning}</p>
                    </ResultItem>

                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
