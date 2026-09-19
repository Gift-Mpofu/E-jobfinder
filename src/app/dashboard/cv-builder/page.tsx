'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@/supabase/provider';
import { useDashboard } from '../layout';
import { useToast } from '@/hooks/use-toast';
import { askCvBuilder, generateProfessionalCv, parseStepAnswer, type CompanionMessage } from '@/ai/flows/cv-builder-flow';

function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type ExtractedSections = {
  fullName?: string;
  targetRole?: string;
  summary?: string;
  recentExperience?: string;
  otherExperience?: string;
  skills?: string[];
  education?: string;
  projects?: string;
  contactInfo?: string;
};

function parsePreHeader(preHeader: string): { fullName?: string; targetRole?: string; contactInfo?: string } {
  if (!preHeader) return {};

  const lines = preHeader.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

  if (lines.length >= 2) {
    const fullName = titleCase(lines[0]);
    const targetRole = titleCase(lines[1]);
    const contactInfo = lines.slice(2).join(' | ');
    return { fullName, targetRole, contactInfo };
  } else if (lines.length === 1) {
    const parts = lines[0].split(/[|—-]+/).map(p => p.trim()).filter(Boolean);
    const fullName = titleCase(parts[0] || '');
    const targetRole = parts[1] ? titleCase(parts[1]) : '';
    const contactInfo = parts.slice(2).join(' | ');
    return { fullName, targetRole, contactInfo };
  }

  return {};
}

function detectAndExtractMultiSections(text: string): ExtractedSections {
  if (!text || text.length < 30) return {};

  const hasHeaders = /(?:TECHNICAL SKILLS|WORK EXPERIENCE|EMPLOYMENT|EDUCATION|PROJECTS|PROFESSIONAL SUMMARY|QUALIFICATIONS)/i.test(text);
  if (!hasHeaders) return {};

  const result: ExtractedSections = {};
  const sectionRegex = /(?:^|\n|\r|\s)\s*(TECHNICAL SKILLS|WORK EXPERIENCE|EMPLOYMENT|EDUCATION & QUALIFICATIONS|EDUCATION|PROJECTS & SIDE WORK|PROJECTS|KEY PROJECTS|PROFESSIONAL SUMMARY|SUMMARY|CONTACT INFO|CONTACT)\b\s*[:\n\-—]*/gi;

  const matches = Array.from(text.matchAll(sectionRegex));
  if (matches.length === 0) return {};

  // Extract name/role/contact from pre-header text if present
  const firstHeaderIndex = matches[0].index || 0;
  const preHeader = text.slice(0, firstHeaderIndex).trim();
  if (preHeader) {
    const parsedHeader = parsePreHeader(preHeader);
    if (parsedHeader.fullName) result.fullName = parsedHeader.fullName;
    if (parsedHeader.targetRole) result.targetRole = parsedHeader.targetRole;
    if (parsedHeader.contactInfo) result.contactInfo = parsedHeader.contactInfo;
  }

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const headerName = currentMatch[1].toUpperCase();
    const startIndex = (currentMatch.index || 0) + currentMatch[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;

    const content = text.slice(startIndex, endIndex).trim();
    if (!content) continue;

    if (/SKILLS/i.test(headerName)) {
      const rawSkills = content.replace(/^(Languages|Frontend|Backend|Cloud|DevOps|Tools|Databases|Other Technical)\s*[:\-\—]*/gi, '');
      const parsed = rawSkills.split(/[,;\n•]+/).map(s => s.replace(/^(Languages|Frontend|Backend|Cloud|DevOps|Tools|Databases|Other Technical)/gi, '').trim()).filter(s => s.length > 1 && s.length < 40);
      result.skills = Array.from(new Set(parsed.map(titleCase)));
    } else if (/WORK|EMPLOYMENT|EXPERIENCE/i.test(headerName)) {
      result.recentExperience = content;
    } else if (/EDUCATION|QUALIFICATIONS/i.test(headerName)) {
      result.education = content;
    } else if (/PROJECTS/i.test(headerName)) {
      result.projects = content;
    } else if (/SUMMARY/i.test(headerName)) {
      result.summary = content;
    } else if (/CONTACT/i.test(headerName)) {
      result.contactInfo = content;
    }
  }

  return result;
}

function parseStep1Fallback(text: string): { fullName: string; targetRole: string } {
  let cleaned = text.trim();

  // If input contains major section keywords or is super long, truncate to first line / first clause
  if (cleaned.length > 60 || /(?:SUMMARY|EXPERIENCE|SKILLS|EDUCATION|PROJECTS|PROFESSIONAL)/i.test(cleaned)) {
    const firstLine = cleaned.split(/[\n\r]|(?=PROFESSIONAL|TECHNICAL|WORK|EDUCATION|PROJECTS)/i)[0].trim();
    cleaned = firstLine.slice(0, 80);
  }

  cleaned = cleaned.replace(/^(hi|hello|hey|my name is|i am|i'm)\s+/i, '');

  const roleMatch = cleaned.match(/^(.*?)(?:\s+(?:im\s+|i'm\s+|i\s+am\s+)?(?:applying\s+for|targeting|looking\s+for|want\s+to\s+be|a\s+role\s+as|as\s+a)\s+)(.*)$/i);
  if (roleMatch) {
    const name = roleMatch[1].replace(/^(my name is|i am|i'm)\s+/i, '').trim();
    const role = roleMatch[2].replace(/^(a|an)\s+/i, '').trim();
    return {
      fullName: titleCase(name.slice(0, 35)),
      targetRole: titleCase(role.slice(0, 45)),
    };
  }

  if (cleaned.includes(' - ')) {
    const [n, r] = cleaned.split(' - ');
    return { fullName: titleCase(n.trim().slice(0, 35)), targetRole: titleCase(r.trim().slice(0, 45)) };
  }
  if (cleaned.includes(',')) {
    const [n, ...r] = cleaned.split(',');
    return { fullName: titleCase(n.trim().slice(0, 35)), targetRole: titleCase(r.join(',').trim().slice(0, 45)) };
  }

  // Safety fallback: if string has spaces, treat first 2 words as name and remaining as role
  const words = cleaned.split(/\s+/);
  if (words.length > 2) {
    const name = words.slice(0, 2).join(' ');
    const role = words.slice(2, 6).join(' ');
    return { fullName: titleCase(name), targetRole: titleCase(role) };
  }

  return { fullName: titleCase(cleaned.slice(0, 35)), targetRole: '' };
}
import {
  Send,
  Loader2,
  Sparkles,
  Download,
  Save,
  RotateCcw,
  CheckCircle2,
  FileText,
  Bot,
  User,
  Printer,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type CvData = {
  fullName: string;
  targetRole: string;
  contactInfo: string;
  summary: string;
  recentExperience: string;
  otherExperience: string;
  skills: string[];
  education: string;
  projects: string;
};

const INITIAL_CV_DATA: CvData = {
  fullName: '',
  targetRole: '',
  contactInfo: '',
  summary: '',
  recentExperience: '',
  otherExperience: '',
  skills: [],
  education: '',
  projects: '',
};

const INITIAL_QUESTION = "Hi! I'm your AI CV Writer. I'll ask you 8 quick questions to help build a professional CV. First, what's your full name and current job title or the role you're targeting?";
const STORAGE_KEY = 'cv_builder_progress';

export default function CvBuilderPage() {
  const supabase = getSupabaseClient();
  const { user } = useUser();
  const { toast } = useToast();

  const [messages, setMessages] = useState<CompanionMessage[]>([
    { role: 'model', content: INITIAL_QUESTION }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [questionStep, setQuestionStep] = useState(1);
  const [cvData, setCvData] = useState<CvData>(INITIAL_CV_DATA);
  const [formattedCvText, setFormattedCvText] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [pendingSession, setPendingSession] = useState<any | null>(null);
  const [cvTemplate, setCvTemplate] = useState<'modern' | 'corporate' | 'minimalist' | 'jordan'>('jordan');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const skipInitialSaveRef = useRef(true);

  // On mount: offer to restore a session less than 24 hours old
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < 86400000) {
          setPendingSession(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save after each chat message exchange
  useEffect(() => {
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    if (pendingSession) return;
    if (messages.length <= 1) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages,
          currentStep: questionStep,
          answers: cvData,
          formattedCvText,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.error('Failed to save CV session to localStorage:', e);
    }
  }, [messages, questionStep, cvData, formattedCvText, pendingSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isFormatting]);

  const restoreSession = () => {
    if (!pendingSession) return;
    setMessages(pendingSession.messages || [{ role: 'model', content: INITIAL_QUESTION }]);
    setQuestionStep(pendingSession.currentStep ?? pendingSession.questionStep ?? 1);
    setCvData(pendingSession.answers ?? pendingSession.cvData ?? INITIAL_CV_DATA);
    setFormattedCvText(pendingSession.formattedCvText ?? null);
    const step = pendingSession.currentStep ?? pendingSession.questionStep ?? 1;
    if (pendingSession.formattedCvText || step > 8) {
      setIsReady(true);
    }
    setPendingSession(null);
    toast({ title: 'Session Restored', description: 'Continued from your previous CV session.' });
  };

  const clearSessionPrompt = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPendingSession(null);
  };

  const updateCvDataFromStep = (step: number, answerText: string) => {
    const text = answerText.trim();
    const extracted = detectAndExtractMultiSections(text);

    setCvData(prev => {
      const next = { ...prev };
      if (extracted && Object.keys(extracted).length > 0) {
        if (extracted.skills) next.skills = extracted.skills;
        if (extracted.recentExperience) next.recentExperience = extracted.recentExperience;
        if (extracted.education) next.education = extracted.education;
        if (extracted.projects) next.projects = extracted.projects;
        if (extracted.summary) next.summary = extracted.summary;
        if (extracted.contactInfo) next.contactInfo = extracted.contactInfo;
        return next;
      }

      if (step === 1) {
        const parsed = parseStep1Fallback(text);
        next.fullName = parsed.fullName;
        next.targetRole = parsed.targetRole;
      } else if (step === 2) {
        next.recentExperience = text;
      } else if (step === 3) {
        const parsedSkills = text.split(/[,;\n]+/).map(s => titleCase(s.trim())).filter(Boolean);
        next.skills = parsedSkills.length > 0 ? parsedSkills : [titleCase(text)];
      } else if (step === 4) {
        next.otherExperience = text;
      } else if (step === 5) {
        next.education = text;
      } else if (step === 6) {
        next.projects = text;
      } else if (step === 7) {
        next.summary = text;
      } else if (step === 8) {
        next.contactInfo = text;
      }
      return next;
    });
  };

  const handleTriggerFormatCv = async (history: CompanionMessage[]) => {
    setIsFormatting(true);
    try {
      const formattedResult = await generateProfessionalCv(history);
      setFormattedCvText(formattedResult);
      setIsReady(true);
    } catch (err: any) {
      console.error('Error generating professional CV:', err);
      toast({
        variant: 'destructive',
        title: 'Formatting Error',
        description: 'Failed to format CV text with AI. Using raw preview.'
      });
      setIsReady(true);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isFormatting) return;

    const userMessage = input.trim();
    setInput('');

    const newHistory: CompanionMessage[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ];

    setMessages(newHistory);
    updateCvDataFromStep(questionStep, userMessage);

    // Check if user pasted a multi-section full CV
    const multiExtracted = detectAndExtractMultiSections(userMessage);
    const isMultiSectionPaste = multiExtracted && Object.keys(multiExtracted).length >= 2;

    if (isMultiSectionPaste) {
      setCvData(prev => ({
        ...prev,
        ...(multiExtracted.fullName ? { fullName: multiExtracted.fullName } : {}),
        ...(multiExtracted.targetRole ? { targetRole: multiExtracted.targetRole } : {}),
        ...(multiExtracted.summary ? { summary: multiExtracted.summary } : {}),
        ...(multiExtracted.recentExperience ? { recentExperience: multiExtracted.recentExperience } : {}),
        ...(multiExtracted.otherExperience ? { otherExperience: multiExtracted.otherExperience } : {}),
        ...(multiExtracted.skills && multiExtracted.skills.length > 0 ? { skills: multiExtracted.skills } : {}),
        ...(multiExtracted.education ? { education: multiExtracted.education } : {}),
        ...(multiExtracted.projects ? { projects: multiExtracted.projects } : {}),
        ...(multiExtracted.contactInfo ? { contactInfo: multiExtracted.contactInfo } : {}),
      }));

      const aiReply = "Awesome! I detected a full CV paste and automatically extracted all your sections (Name, Role, Skills, Work Experience, Education, Projects) into the Live Preview.";
      const updatedHistory: CompanionMessage[] = [
        ...newHistory,
        { role: 'model', content: aiReply }
      ];

      setMessages(updatedHistory);
      setQuestionStep(9);

      await handleTriggerFormatCv(updatedHistory);
      return;
    }

    // Asynchronously trigger AI parsing for clean live document updates
    parseStepAnswer(questionStep, userMessage)
      .then(extracted => {
        if (extracted && Object.keys(extracted).length > 0) {
          setCvData(prev => ({
            ...prev,
            ...(extracted.fullName ? { fullName: extracted.fullName } : {}),
            ...(extracted.targetRole ? { targetRole: extracted.targetRole } : {}),
            ...(extracted.summary ? { summary: extracted.summary } : {}),
            ...(extracted.recentExperience ? { recentExperience: extracted.recentExperience } : {}),
            ...(extracted.otherExperience ? { otherExperience: extracted.otherExperience } : {}),
            ...(extracted.skills && extracted.skills.length > 0 ? { skills: extracted.skills } : {}),
            ...(extracted.education ? { education: extracted.education } : {}),
            ...(extracted.projects ? { projects: extracted.projects } : {}),
            ...(extracted.contactInfo ? { contactInfo: extracted.contactInfo } : {}),
          }));
        }
      })
      .catch(e => console.error('Background AI step parsing error:', e));

    setIsLoading(true);

    try {
      const aiReply = await askCvBuilder(newHistory.slice(0, -1), userMessage);

      const updatedHistory: CompanionMessage[] = [
        ...newHistory,
        { role: 'model', content: aiReply }
      ];

      setMessages(updatedHistory);
      const nextStep = isEditingAnswer ? questionStep : questionStep + 1;
      setQuestionStep(nextStep);

      // Trigger professional CV formatting if 8 questions answered or in edit mode
      if (nextStep > 8 || isEditingAnswer) {
        await handleTriggerFormatCv(updatedHistory);
        setIsEditingAnswer(false);
      }
    } catch (err: any) {
      console.error('Error in CV Builder AI:', err);
      toast({
        variant: 'destructive',
        title: 'AI Communication Error',
        description: err?.message || 'Failed to communicate with AI CV Writer.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleSaveToCvManager = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please sign in to save your CV.' });
      return;
    }

    setIsSaving(true);
    try {
      const fileName = `${(cvData.fullName || 'My').replace(/\s+/g, '_')}_CV_${new Date().toISOString().slice(0, 10)}.txt`;
      const fileContent = formattedCvText || buildFallbackCvText(cvData);

      const { error } = await supabase.from('cvs').insert({
        user_id: user.id,
        file_name: fileName,
        file_content: fileContent,
        upload_date: new Date().toISOString(),
      });

      if (error) throw error;

      localStorage.removeItem(STORAGE_KEY);
      toast({
        title: 'CV Saved!',
        description: 'CV saved to your profile in CV Manager.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err?.message || 'Could not save CV to database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOver = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{ role: 'model', content: INITIAL_QUESTION }]);
    setInput('');
    setQuestionStep(1);
    setCvData(INITIAL_CV_DATA);
    setFormattedCvText(null);
    setIsReady(false);
    setIsEditingAnswer(false);
    setPendingSession(null);
  };

  const isInterviewComplete = questionStep > 8 && !isEditingAnswer;

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* Print CSS Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-cv, #printable-cv * {
            visibility: visible !important;
          }
          #printable-cv {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 30px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Resume Session Banner */}
      {pendingSession && (
        <div className="bg-[#FFF3EB] border border-[#FFE0CC] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[#CC5200] font-medium">
            <Sparkles className="h-4 w-4 text-[#FF6B00]" />
            <span>Resume session?</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={restoreSession}
              className="bg-[#FF6B00] hover:bg-[#E55F00] text-white text-xs rounded-full px-4 py-1.5"
            >
              Continue
            </Button>
            <Button
              onClick={clearSessionPrompt}
              variant="outline"
              className="border-[#D2D2D7] text-[#1D1D1F] text-xs rounded-full px-4 py-1.5"
            >
              Start fresh
            </Button>
          </div>
        </div>
      )}

      {/* Top Banner / Upload Shortcut */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-[#1D1D1F] font-medium">
          <Sparkles className="h-4 w-4 text-[#FF6B00]" />
          <span>AI CV Writer — Interview, auto-format &amp; generate your CV</span>
        </div>
        <Link
          href="/dashboard/profile"
          className="text-xs font-semibold text-[#FF6B00] hover:underline flex items-center gap-1 flex-shrink-0"
        >
          Already have a CV? Upload it instead →
        </Link>
      </div>

      {/* Success State Banner when Ready */}
      {isReady && !isFormatting && (
        <div className="bg-[#E8F8EE] border border-[#34C759]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#34C759] flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Your CV is ready!</h3>
              <p className="text-xs text-[#6E6E73]">Download as PDF or save directly to your CV Manager.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              className="bg-[#1D1D1F] hover:bg-[#3A3A3C] text-white text-xs rounded-full px-4 py-2 flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Download as PDF
            </Button>
            <Button
              onClick={handleSaveToCvManager}
              disabled={isSaving}
              className="bg-[#FF6B00] hover:bg-[#E55F00] text-white text-xs rounded-full px-4 py-2 flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save to CV Manager
            </Button>
            <Button
              onClick={handleStartOver}
              variant="outline"
              className="border-[#D2D2D7] text-[#1D1D1F] text-xs rounded-full px-4 py-2 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </Button>
          </div>
        </div>
      )}

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel (Chat Interface) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E5EA] flex flex-col h-[650px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center text-white font-bold text-xs">
                AI
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#1D1D1F]">AI CV Interviewer</h2>
                <p className="text-[11px] text-[#6E6E73]">
                  {questionStep > 8 ? 'Interview Completed' : `Step ${questionStep} of 8`}
                </p>
              </div>
            </div>
            {isInterviewComplete && (
              <Button
                onClick={() => setIsEditingAnswer(true)}
                variant="outline"
                className="text-xs border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF3EB] rounded-full px-3 py-1 flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" /> Edit an answer
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-[#F5F5F7] w-full">
            <div
              className="h-full bg-[#FF6B00] transition-all duration-300"
              style={{ width: `${Math.min((questionStep / 8) * 100, 100)}%` }}
            />
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-[#FFF3EB] text-[#FF6B00]'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-h-56 overflow-y-auto break-words whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#FF6B00] text-white rounded-tr-none'
                      : 'bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 mr-auto max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-[#FFF3EB] text-[#FF6B00] flex items-center justify-center text-xs flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl text-xs bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA] rounded-tl-none flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />
                  Thinking...
                </div>
              </div>
            )}

            {isFormatting && (
              <div className="p-3 bg-[#FFF3EB] border border-[#FFE0CC] rounded-2xl text-xs text-[#CC5200] flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-[#FF6B00]" />
                <span>Interview complete — your professional CV is being generated...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Box Area */}
          <div className="p-3 border-t border-[#E5E5EA] flex items-center gap-2">
            {isInterviewComplete ? (
              <div className="flex-1 bg-[#F5F5F7] border border-[#E5E5EA] rounded-full px-4 py-2 text-xs text-[#6E6E73] flex items-center justify-between">
                <span>Interview complete — your CV is ready</span>
                <button
                  onClick={() => setIsEditingAnswer(true)}
                  className="text-xs font-semibold text-[#FF6B00] hover:underline"
                >
                  Edit an answer →
                </button>
              </div>
            ) : (
              <>
                <textarea
                  rows={1}
                  placeholder={isEditingAnswer ? "Type your correction to the AI..." : "Type your answer or paste full CV..."}
                  value={input}
                  disabled={isLoading || isFormatting}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-[#F5F5F7] border border-[#D2D2D7] rounded-2xl px-4 py-2 text-xs text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:border-[#FF6B00] transition-colors disabled:opacity-50 resize-none min-h-[38px] max-h-24 overflow-y-auto"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || isFormatting || !input.trim()}
                  className="bg-[#FF6B00] hover:bg-[#E55F00] text-white rounded-full p-2.5 h-9 w-9 flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right Panel (Live / Formatted Professional CV Preview) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E5EA] p-6 h-[650px] overflow-y-auto flex flex-col justify-between relative">
          {isFormatting && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-2xl z-10">
              <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-[#6E6E73]">
                Crafting your professional CV...
              </p>
            </div>
          )}
          <div>
            <div className="flex flex-col gap-2 border-b border-[#E5E5EA] pb-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E6E73]">
                  {formattedCvText ? 'Formatted Professional CV' : 'Live Document Preview'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  formattedCvText ? 'bg-[#E8F8EE] text-[#1A7A3A]' : 'bg-[#FFF3EB] text-[#CC5200]'
                }`}>
                  {formattedCvText ? 'AI Formatted' : 'Live Preview'}
                </span>
              </div>

              {/* Template Selector Switcher Toolbar */}
              <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-lg border border-[#E5E5EA] mt-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setCvTemplate('jordan')}
                  className={`flex-1 py-1 px-2 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap ${
                    cvTemplate === 'jordan' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Jordan SA (Tech Grad)
                </button>
                <button
                  type="button"
                  onClick={() => setCvTemplate('modern')}
                  className={`flex-1 py-1 px-2 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap ${
                    cvTemplate === 'modern' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Modern Tech
                </button>
                <button
                  type="button"
                  onClick={() => setCvTemplate('corporate')}
                  className={`flex-1 py-1 px-2 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap ${
                    cvTemplate === 'corporate' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Corporate SA
                </button>
                <button
                  type="button"
                  onClick={() => setCvTemplate('minimalist')}
                  className={`flex-1 py-1 px-2 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap ${
                    cvTemplate === 'minimalist' ? 'bg-white text-[#FF6B00] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Minimalist
                </button>
              </div>
            </div>

            {/* Printable CV Container */}
            <div
              id="printable-cv"
              className="bg-white text-[#1D1D1F] p-6 border border-[#E5E5EA] rounded-xl shadow-sm text-xs leading-relaxed font-sans flex flex-col justify-between min-h-[500px]"
            >
              <div>
              {formattedCvText ? (
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#1D1D1F]">
                  {formattedCvText}
                </div>
              ) : (
                <>
                  {/* Template 4: Jordan SA (Tech Graduate & Executive Layout) */}
                  {cvTemplate === 'jordan' && (
                    <div className="space-y-4 text-xs font-sans text-[#1D1D1F]">
                      {/* Header */}
                      <div className="text-center border-b border-[#1D1D1F] pb-3">
                        <h1 className="text-lg font-extrabold uppercase tracking-tight text-[#1D1D1F]">
                          {cvData.fullName || 'JORDAN MPOFU'}
                        </h1>
                        <p className="text-xs font-bold text-[#FF6B00] mt-0.5">
                          {cvData.targetRole || 'IT Graduate | Software Developer | Cloud & DevOps | AI & SaaS'}
                        </p>
                        <p className="text-[10px] text-[#6E6E73] mt-1 font-medium">
                          {cvData.contactInfo || 'Johannesburg, South Africa | 072 886 3781 | andrewsleighton023@gmail.com | linkedin.com/in/leighton-andrews-43729426b/'}
                        </p>
                      </div>

                      {/* Summary */}
                      {cvData.summary && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1.5">
                            PROFESSIONAL SUMMARY
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">{cvData.summary}</p>
                        </div>
                      )}

                      {/* Technical Skills */}
                      {cvData.skills && cvData.skills.length > 0 && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1.5">
                            TECHNICAL SKILLS
                          </h2>
                          <div className="flex flex-wrap gap-1.5">
                            {cvData.skills.map((skill, i) => (
                              <span key={i} className="text-[10px] bg-[#F5F5F7] text-[#1D1D1F] border border-[#D2D2D7] rounded-md px-2 py-0.5 font-semibold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Professional Experience */}
                      {cvData.recentExperience && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1.5">
                            PROFESSIONAL EXPERIENCE
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.recentExperience}</p>
                          {cvData.otherExperience && (
                            <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed pt-2 mt-2 border-t border-dashed border-[#E5E5EA]">
                              {cvData.otherExperience}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Selected Technical Projects */}
                      {cvData.projects && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1.5">
                            SELECTED TECHNICAL PROJECTS
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.projects}</p>
                        </div>
                      )}

                      {/* Education */}
                      {cvData.education && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1.5">
                            EDUCATION
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.education}</p>
                        </div>
                      )}

                      {/* References */}
                      <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1">
                          REFERENCES
                        </h2>
                        <p className="text-[10px] text-[#6E6E73] italic">Available upon request.</p>
                      </div>
                    </div>
                  )}

                  {/* Template 1: Modern Tech (2-Column Layout) */}
                  {cvTemplate === 'modern' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Sidebar */}
                      <div className="md:col-span-4 bg-[#F9F9FB] p-3 rounded-lg border border-[#E5E5EA] space-y-4">
                        <div>
                          <h1 className="text-sm font-bold uppercase tracking-tight text-[#1D1D1F] break-words">
                            {cvData.fullName || 'YOUR NAME'}
                          </h1>
                          {cvData.targetRole && (
                            <p className="text-[11px] font-semibold text-[#FF6B00] mt-0.5">{cvData.targetRole}</p>
                          )}
                        </div>

                        {cvData.contactInfo && (
                          <div className="pt-2 border-t border-[#E5E5EA]">
                            <h4 className="text-[9px] font-bold uppercase text-[#6E6E73] mb-1">Contact</h4>
                            <p className="text-[10px] text-[#1D1D1F] whitespace-pre-line leading-snug">{cvData.contactInfo}</p>
                          </div>
                        )}

                        {cvData.skills && cvData.skills.length > 0 && (
                          <div className="pt-2 border-t border-[#E5E5EA]">
                            <h4 className="text-[9px] font-bold uppercase text-[#6E6E73] mb-1.5">Key Skills</h4>
                            <div className="flex flex-wrap gap-1">
                              {cvData.skills.map((skill, i) => (
                                <span key={i} className="text-[9px] bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded px-1.5 py-0.5 font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {cvData.education && (
                          <div className="pt-2 border-t border-[#E5E5EA]">
                            <h4 className="text-[9px] font-bold uppercase text-[#6E6E73] mb-1">Education</h4>
                            <p className="text-[10px] text-[#1D1D1F] whitespace-pre-wrap leading-tight">{cvData.education}</p>
                          </div>
                        )}
                      </div>

                      {/* Main Column */}
                      <div className="md:col-span-8 space-y-4">
                        {cvData.summary && (
                          <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] border-b border-[#FFE0CC] pb-0.5 mb-1">
                              Professional Summary
                            </h2>
                            <p className="text-[11px] text-[#1D1D1F] leading-relaxed">{cvData.summary}</p>
                          </div>
                        )}

                        {cvData.recentExperience && (
                          <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] border-b border-[#FFE0CC] pb-0.5 mb-1">
                              Work Experience
                            </h2>
                            <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.recentExperience}</p>
                            {cvData.otherExperience && (
                              <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed pt-2 mt-2 border-t border-dashed border-[#E5E5EA]">
                                {cvData.otherExperience}
                              </p>
                            )}
                          </div>
                        )}

                        {cvData.projects && (
                          <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] border-b border-[#FFE0CC] pb-0.5 mb-1">
                              Projects &amp; Side Work
                            </h2>
                            <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.projects}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Template 2: Corporate SA (Classic Single Column) */}
                  {cvTemplate === 'corporate' && (
                    <div className="space-y-4">
                      <div className="border-b-2 border-[#1D1D1F] pb-3">
                        <h1 className="text-base font-bold uppercase tracking-tight text-[#1D1D1F]">
                          {cvData.fullName || 'YOUR FULL NAME'}
                        </h1>
                        {cvData.targetRole && (
                          <p className="text-xs font-semibold text-[#FF6B00] mt-0.5">{cvData.targetRole}</p>
                        )}
                        {cvData.contactInfo && (
                          <p className="text-[10px] text-[#6E6E73] mt-1">{cvData.contactInfo}</p>
                        )}
                      </div>

                      {cvData.summary && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1">
                            Professional Summary
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] leading-relaxed">{cvData.summary}</p>
                        </div>
                      )}

                      {cvData.skills && cvData.skills.length > 0 && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1">
                            Core Competencies &amp; Skills
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] leading-relaxed font-medium">
                            {cvData.skills.join(' • ')}
                          </p>
                        </div>
                      )}

                      {cvData.recentExperience && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1">
                            Work History
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.recentExperience}</p>
                          {cvData.otherExperience && (
                            <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed pt-2 mt-2 border-t border-dashed border-[#E5E5EA]">
                              {cvData.otherExperience}
                            </p>
                          )}
                        </div>
                      )}

                      {cvData.education && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1">
                            Education &amp; Qualifications
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.education}</p>
                        </div>
                      )}

                      {cvData.projects && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#1D1D1F] border-b border-[#E5E5EA] pb-0.5 mb-1">
                            Key Projects
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.projects}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template 3: Minimalist Creative */}
                  {cvTemplate === 'minimalist' && (
                    <div className="space-y-4">
                      <div className="bg-[#1D1D1F] text-white p-4 rounded-lg">
                        <h1 className="text-base font-bold tracking-wide uppercase">
                          {cvData.fullName || 'YOUR FULL NAME'}
                        </h1>
                        {cvData.targetRole && (
                          <p className="text-xs text-[#FF6B00] font-medium mt-0.5">{cvData.targetRole}</p>
                        )}
                        {cvData.contactInfo && (
                          <p className="text-[10px] text-[#AEAEB2] mt-1">{cvData.contactInfo}</p>
                        )}
                      </div>

                      {cvData.summary && (
                        <div className="pl-3 border-l-2 border-[#FF6B00]">
                          <p className="text-[11px] italic text-[#1D1D1F] leading-relaxed">{cvData.summary}</p>
                        </div>
                      )}

                      {cvData.skills && cvData.skills.length > 0 && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6E73] mb-1.5">
                            Skills
                          </h2>
                          <div className="flex flex-wrap gap-1.5">
                            {cvData.skills.map((skill, i) => (
                              <span key={i} className="text-[9px] bg-[#FFF3EB] text-[#CC5200] border border-[#FFE0CC] rounded-full px-2.5 py-0.5 font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {cvData.recentExperience && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6E73] mb-1">
                            Experience
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.recentExperience}</p>
                        </div>
                      )}

                      {cvData.education && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6E73] mb-1">
                            Education
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.education}</p>
                        </div>
                      )}

                      {cvData.projects && (
                        <div>
                          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6E73] mb-1">
                            Projects
                          </h2>
                          <p className="text-[11px] text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{cvData.projects}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Placeholder when empty */}
                  {!cvData.fullName && !cvData.recentExperience && !cvData.skills.length && (
                    <div className="text-center py-12 text-[#AEAEB2]">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Answer the AI interview questions to watch your CV preview update live.</p>
                    </div>
                  )}
                </>
              )}
              </div>

              {/* Watermark Footer on Every CV */}
              <div className="mt-8 pt-4 border-t border-[#E5E5EA] flex items-center justify-between text-[10px] text-[#6E6E73] font-sans print:flex">
                <span className="flex items-center gap-1 font-medium">
                  ⚡ Powered by <strong className="text-[#FF6B00]">E-Job Finder</strong> AI CV Builder
                </span>
                <span>www.ejobfinder.co.za</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-[#E5E5EA] flex items-center justify-between">
            <span className="text-[11px] text-[#AEAEB2]">Print format ready</span>
            <Button
              onClick={handleDownloadPdf}
              variant="outline"
              className="text-xs rounded-full border-[#D2D2D7] text-[#1D1D1F] hover:bg-[#F5F5F7] flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Preview PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFallbackCvText(data: CvData): string {
  let text = `${(data.fullName || 'FULL NAME').toUpperCase()}\n`;
  if (data.targetRole) text += `${data.targetRole}\n`;
  if (data.contactInfo) text += `Contact: ${data.contactInfo}\n`;
  text += `\n========================================\n\n`;

  if (data.summary) {
    text += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
  }
  if (data.skills && data.skills.length > 0) {
    text += `TECHNICAL SKILLS\n${data.skills.join(', ')}\n\n`;
  }
  if (data.recentExperience) {
    text += `WORK EXPERIENCE\n${data.recentExperience}\n\n`;
    if (data.otherExperience) text += `${data.otherExperience}\n\n`;
  }
  if (data.education) {
    text += `EDUCATION & QUALIFICATIONS\n${data.education}\n\n`;
  }
  if (data.projects) {
    text += `PROJECTS\n${data.projects}\n\n`;
  }
  return text;
}
