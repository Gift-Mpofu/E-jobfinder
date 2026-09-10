"use client";

import { useState, useEffect, type FC } from "react";
import { useRouter } from "next/navigation";

import {
  Upload,
  FileText,
  BarChart2,
  CheckCircle,
  XCircle,
  Lightbulb,
  BrainCircuit,
  ArrowRight,
  Zap,
  ChevronsRight,
  Frown,
  Meh,
  Smile,
  TrendingUp,
  MessageSquare,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { analyzeCv, type CvAnalysisOutput } from "@/ai/flows/cv-analyzer-flow";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import ReactMarkdown from 'react-markdown';

type ParsedSuggestion = {
  title: string;
  body: string;
};

function parseSuggestions(text: string): ParsedSuggestion[] {
  if (!text || !text.trim()) return [];

  const items = text
    .split(/(?=\d+[\.\)]\s+)/)
    .map(s => s.trim())
    .filter(Boolean);

  const list = items.length > 0 ? items : text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

  return list.map(item => {
    const cleaned = item.replace(/^\d+[\.\)]\s*/, '').trim();
    const boldMatch = cleaned.match(/^\*\*(.*?)\*\*:?\s*([\s\S]*)/);
    if (boldMatch) {
      return {
        title: boldMatch[1].trim(),
        body: boldMatch[2].trim(),
      };
    }

    const colonMatch = cleaned.match(/^([^:\n]+):\s*([\s\S]*)/);
    if (colonMatch && colonMatch[1].length < 45) {
      return {
        title: colonMatch[1].replace(/\*\*/g, '').trim(),
        body: colonMatch[2].trim(),
      };
    }

    const words = cleaned.replace(/\*\*/g, '').split(/\s+/);
    if (words.length > 6) {
      return {
        title: words.slice(0, 6).join(' ') + '...',
        body: words.slice(6).join(' '),
      };
    }

    return {
      title: cleaned.replace(/\*\*/g, ''),
      body: '',
    };
  });
}

function NumberedSuggestionsList({ text }: { text: string }) {
  const suggestions = parseSuggestions(text);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3 mt-2">
      {suggestions.map((item, index) => (
        <div key={index} className="bg-[#F5F5F7] rounded-xl p-4 border border-[#E5E5EA]">
          <div className="flex gap-3 items-start">
            <span className="bg-[#FF6B00] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1D1D1F] mb-1">
                {item.title}
              </p>
              {item.body ? (
                <div className="text-[12px] text-[#6E6E73] leading-relaxed">
                  <ReactMarkdown>{item.body}</ReactMarkdown>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSupabase, useUser } from "@/supabase/provider";
import { useDashboard } from "@/app/dashboard/layout";

const hireRateChartConfig = {
  rate: {
    label: "Hiring Rate",
    color: "hsl(var(--primary))",
  },
};

const cvTips = [
  "Use action verbs like 'led', 'managed', and 'developed' to describe your accomplishments.",
  "Quantify your achievements with numbers and percentages whenever possible.",
  "Tailor your CV for each specific job application by highlighting relevant skills.",
  "Proofread your CV multiple times to eliminate any typos or grammatical errors.",
  "Keep your CV concise and ideally to one page for less than 10 years of experience.",
];

const LoadingAnalysis = () => {
  const [tip, setTip] = useState(cvTips[0]);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTip((prevTip) => {
        const currentIndex = cvTips.indexOf(prevTip);
        const nextIndex = (currentIndex + 1) % cvTips.length;
        return cvTips[nextIndex];
      });
    }, 4000);
    return () => clearInterval(tipInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
      <BrainCircuit className="w-16 h-16 text-primary animate-pulse" />
      <p className="text-muted-foreground text-lg font-semibold">
        Performing Analysis...
      </p>
      <Progress value={50} className="w-full animate-pulse" />
      <Card className="mt-4 w-full bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <Lightbulb className="inline-block mr-2 h-4 w-4 text-yellow-400" />
            {tip}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default function ScannerPage() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<CvAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanType, setScanType] = useState<"quick" | "deep">("quick");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabase();
  const { scansUsed, usageLimit, addScan, addNotification, isLimitActive } =
    useDashboard();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const allowedTypes = ["text/plain", "text/markdown", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a .txt, .md, or .pdf file.",
        });
        setCvFile(null);
        event.target.value = "";
        return;
      }

      setCvFile(file);
      setCvText("Extracting text from document, please wait...");

      try {
        if (file.type === "application/pdf") {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          let pdfText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            pdfText +=
              textContent.items
                .map((item: any) => ("str" in item ? item.str : ""))
                .join(" ") + "\n";
          }
          setCvText(pdfText);
        } else {
          const text = await file.text();
          setCvText(text);
        }
      } catch (error) {
        console.error("Error extracting file text:", error);
        setCvText("");
        toast({
          variant: "destructive",
          title: "Extraction Error",
          description: "Could not automatically extract text from the file.",
        });
      }
    }
  };

  const handleCvTextAreaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setCvText(e.target.value);
    if (e.target.value) {
      setCvFile(null);
      const fileInput = document.getElementById(
        "cv-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const saveAnalysisData = async (
    userId: string,
    cvContent: string,
    fileName: string,
    jobDesc: string,
    analysis: CvAnalysisOutput
  ) => {
    try {
      const cleanCvContent = cvContent.replace(/\0/g, "");
      const cleanJobDesc = jobDesc.replace(/\0/g, "");

      const { data: cvData, error: cvError } = await supabase
        .from("cvs")
        .insert({
          user_id: userId,
          file_name: fileName,
          file_content: cleanCvContent,
        })
        .select("id")
        .single();
      if (cvError) throw cvError;

      const { data: jdData, error: jdError } = await supabase
        .from("job_descriptions")
        .insert({
          user_id: userId,
          description_text: cleanJobDesc,
        })
        .select("id")
        .single();
      if (jdError) throw jdError;

      await supabase.from("match_results").insert({
        user_id: userId,
        cv_id: cvData.id,
        job_description_id: jdData.id,
        job_title: analysis.jobTitle,
        match_score: analysis.matchScore,
        strengths: analysis.strengths,
        missing_keywords: analysis.missingKeywords,
        improvement_suggestions: analysis.improvementSuggestions,
        reasoning: analysis.reasoning,
        hire_rate_data: analysis.hireRateData,
      });
    } catch (error: any) {
      console.error(
        "Failed to save analysis data:",
        error?.message || error?.details || JSON.stringify(error)
      );
    }
  };

  const handleAnalyzeClick = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "You must be logged in to analyze a CV.",
      });
      router.push("/login");
      return;
    }

    const isAdminUser = user?.email?.toLowerCase() === 'giftmpofud@gmail.com';

    if (!isAdminUser && scansUsed >= usageLimit && isLimitActive) {
      toast({
        variant: "destructive",
        title: "Usage Limit Reached",
        description:
          "You have used all your free scans for this week. Check notifications for your reset time.",
      });
      return;
    }

    const cvContent = cvText;
    const cvFileName = cvFile?.name || "pasted-cv.txt";

    if (!cvContent || !jobDescription) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both your CV and a job description.",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    addNotification({
      type: "scan_in_progress",
      title: "Analysis Started",
      description: `Your ${scanType} scan is underway.`,
    });

    try {
      const result = await analyzeCv({
        cvContent,
        jobDescription,
        scanType,
      });
      setAnalysisResult(result);
      await addScan();
      addNotification({
        type: "scan_complete",
        title: "Analysis Complete",
        description: `Your CV scan for "${result.jobTitle}" is finished.`,
        data: result,
      });
      if (user.id) {
        saveAnalysisData(user.id, cvContent, cvFileName, jobDescription, result);
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "An unknown error occurred during analysis.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFeedbackSubmit = () => {
    console.log("Feedback submitted:", feedbackText);
    toast({
      title: "Feedback Submitted",
      description: "Thank you for helping us improve E-Job Finder!",
    });
    setFeedbackText("");
    setFeedbackOpen(false);
  };

  const ResultItem: FC<{
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }> = ({ icon, title, children }) => (
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
        color: "text-red-500 dark:text-red-400",
        progressColor: "bg-red-500 dark:bg-red-400",
        Icon: Frown,
        message: "Don't Apply (Yet!)",
        suggestion:
          "Significant improvements are needed. Focus on the suggestions below before applying.",
      };
    }
    if (score < 75) {
      return {
        color: "text-yellow-500 dark:text-yellow-400",
        progressColor: "bg-yellow-500 dark:bg-yellow-400",
        Icon: Meh,
        message: "Maybe Apply",
        suggestion:
          "Your CV is a decent match, but could be much stronger. Consider the improvements below.",
      };
    }
    return {
      color: "text-green-500 dark:text-green-400",
      progressColor: "bg-green-500 dark:bg-green-400",
      Icon: Smile,
      message: "Yes, Apply!",
      suggestion: "Your profile is a strong fit for this role. Good luck!",
    };
  };

  const scanModeConfig = {
    quick: {
      name: "Quick Scan",
      description: "Get a fast, high-level overview of your match.",
      icon: <Zap size={16} />,
      buttonText: "Run Quick Scan",
      IconComponent: Zap,
    },
    deep: {
      name: "Deep Scan",
      description: "In-depth analysis of your CV, the job, and the company.",
      icon: <ChevronsRight size={16} />,
      buttonText: "Run Deep Scan",
      IconComponent: BrainCircuit,
    },
  };

  const scoreFeedback = analysisResult
    ? getScoreFeedback(analysisResult.matchScore)
    : null;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, backgroundColor: "#FFF3EB" }}
          >
            <ScanLine className="h-5 w-5" style={{ color: "#FF6B00" }} />
          </div>
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: 28, color: "#1D1D1F" }}
          >
            CV Scanner
          </h1>
        </div>
        <p style={{ fontSize: 15, color: "#6E6E73" }}>
          Paste a job description and see how well your CV matches — with
          AI-powered gap analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-primary" />
              <span>Analyze Your Match</span>
            </CardTitle>
            <CardDescription>
              Select a scan mode, provide your CV and a job description, and let
              E-Job Finder do the rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs
              value={scanType}
              onValueChange={(value) =>
                setScanType(value as "quick" | "deep")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick">
                  <Zap className="mr-2 h-4 w-4" />
                  Quick Scan
                </TabsTrigger>
                <TabsTrigger value="deep">
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  Deep Scan
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="quick"
                className="text-sm text-muted-foreground p-2"
              >
                {scanModeConfig.quick.description}
              </TabsContent>
              <TabsContent
                value="deep"
                className="text-sm text-muted-foreground p-2"
              >
                {scanModeConfig.deep.description}
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="cv-upload">CV Upload</Label>
              <div className="flex items-center gap-3">
                <Label htmlFor="cv-upload" className="flex-1">
                  <Input
                    id="cv-upload"
                    type="file"
                    accept="text/plain,text/markdown,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button asChild variant="outline">
                    <span className="cursor-pointer flex items-center gap-2">
                      <Upload size={16} />
                      Choose File
                    </span>
                  </Button>
                </Label>
                {cvFile && (
                  <span className="text-sm text-muted-foreground truncate">
                    {cvFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload your CV as a .txt, .md, or .pdf file.
              </p>
            </div>

            <div className="flex items-center text-center">
              <div className="flex-grow border-t border-border" />
              <span className="flex-shrink mx-4 text-muted-foreground text-sm">
                OR
              </span>
              <div className="flex-grow border-t border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cv-text">Paste CV</Label>
              <Textarea
                id="cv-text"
                placeholder="Paste your CV content here (you can also paste text from a PDF)..."
                className="bg-white text-[#1D1D1F] border border-[#E5E5EA] rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[500px]"
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
            <Button
              onClick={handleAnalyzeClick}
              disabled={(!cvFile && !cvText) || !jobDescription || isAnalyzing}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
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
              <span>E-Job Finder Results</span>
            </CardTitle>
            <CardDescription>
              {analysisResult
                ? "Here is a breakdown of your compatibility."
                : "Your analysis will appear here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzing && <LoadingAnalysis />}
            {!isAnalyzing && !analysisResult && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground p-8">
                <BarChart2 className="w-16 h-16 mb-4" />
                <h3 className="font-semibold text-lg text-foreground">
                  Ready to find your perfect job?
                </h3>
                <p>
                  Provide your info, select a scan mode, and let E-Job Finder
                  find your optimal path.
                </p>
              </div>
            )}
            {analysisResult && scoreFeedback && (
              <div className="space-y-8 animate-in fade-in-50 duration-500">
                <div className="text-center p-6 border rounded-lg bg-card">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Match Score
                  </h3>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <scoreFeedback.Icon
                      className={`h-12 w-12 ${scoreFeedback.color}`}
                    />
                    <span
                      className={`text-6xl font-bold ${scoreFeedback.color}`}
                    >
                      {analysisResult.matchScore}%
                    </span>
                  </div>
                  <Progress
                    value={analysisResult.matchScore}
                    className="h-3 mt-4"
                    indicatorClassName={scoreFeedback.progressColor}
                  />
                  <div className="mt-4">
                    <p className={`text-xl font-bold ${scoreFeedback.color}`}>
                      {scoreFeedback.message}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {scoreFeedback.suggestion}
                    </p>
                  </div>
                </div>

                <ResultItem icon={<CheckCircle />} title="Strengths">
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.strengths.map((strength) => (
                      <Badge key={strength} variant="secondary">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </ResultItem>

                <ResultItem icon={<XCircle />} title="Missing Keywords">
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.missingKeywords.map((keyword) => (
                      <Badge key={keyword} variant="destructive">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </ResultItem>

                <ResultItem
                  icon={<Lightbulb />}
                  title="Improvement Suggestions"
                >
                  <NumberedSuggestionsList text={analysisResult.improvementSuggestions} />
                </ResultItem>

                {analysisResult.hireRateData &&
                  analysisResult.hireRateData.length > 0 && (
                    <ResultItem
                      icon={<TrendingUp />}
                      title={`Hiring Outlook for a ${analysisResult.jobTitle}`}
                    >
                      <ChartContainer
                        config={hireRateChartConfig}
                        className="h-[250px] w-full text-xs"
                      >
                        <LineChart
                          accessibilityLayer
                          data={analysisResult.hireRateData}
                          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                          />
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
                          <Line
                            type="monotone"
                            dataKey="rate"
                            stroke="var(--color-rate)"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </ResultItem>
                  )}

                <ResultItem icon={<BrainCircuit />} title="Expert Reasoning">
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <ReactMarkdown>{analysisResult.reasoning}</ReactMarkdown>
                  </div>
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
                          Did E-Job Finder work perfectly? Let us know what you
                          think about the analysis you received.
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
                        <Button
                          onClick={handleFeedbackSubmit}
                          disabled={!feedbackText}
                        >
                          Submit Feedback
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
