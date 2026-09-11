'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from '@/supabase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Briefcase, Star, Award, Target, Rocket, MapPin, UploadCloud, BrainCircuit, LineChart, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState({
    targetRole: '',
    experienceLevel: '',
    skills: '',
    location: '',
    careerGoals: ''
  });

  const totalSteps = 4;
  const progress = ((step) / (totalSteps - 1)) * 100;

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const updateData = (field: keyof typeof data, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFinish = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save your profile.",
      });
      router.push('/login');
      return;
    }

    setIsSaving(true);
    const profileData = {
      id: user.id, // Included for upsert!
      target_role: data.targetRole,
      experience_level: data.experienceLevel,
      location: data.location,
      skills: data.skills ? data.skills.split(',').map((s) => s.trim()) : [],
      career_goals: data.careerGoals,
    };
    
    try {
      // Changed from update() to upsert() to fix infinite onboarding loop on new signups
      const { error } = await supabase.from('profiles').upsert(profileData);
      
      if (error) throw error;
      
      toast({
        title: "Profile Configured!",
        description: "Welcome to the future of AI job matching.",
      });
      
      // CRITICAL: Next.js router.push() preserves the layout.tsx state. Because Supabase 
      // Realtime is off for profiles, layout.tsx still thinks profile is null and bounces back.
      // A hard window reload forces layout.tsx to remount and fetch the new profile from the db!
      window.location.href = '/dashboard';
    } catch(error: any) {
        console.error("Failed to save onboarding data:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Could not save your profile. Please try again.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return router.push('/login');
    setIsSaving(true);
    try {
      // Upsert a minimal profile so the layout knows onboarding is technically "complete"
      await supabase.from('profiles').upsert({ id: user.id });
      window.location.href = '/dashboard';
    } catch (e) {
      console.error(e);
      window.location.href = '/dashboard';
    }
  };

  const currentStepIsValid = () => {
    if (step === 1) return data.targetRole.length > 2 && data.experienceLevel.length > 2;
    if (step === 2) return data.skills.length > 2;
    if (step === 3) return data.location.length > 2 && data.careerGoals.length > 2;
    return true; // Step 0 explainer
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-xl border-t-4 border-t-primary relative overflow-hidden">
        
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="relative z-10 pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold tracking-tight text-center">Customize Your Engine</CardTitle>
          </div>
          <CardDescription className="text-center text-md">Set up your profile to optimize AI matching.</CardDescription>
          <div className="pt-6 px-12">
            <Progress value={progress} className="h-2 transition-all duration-500 ease-in-out" />
          </div>
        </CardHeader>
        
        <CardContent className="min-h-[300px] flex items-center justify-center p-6 relative z-10">
          <AnimatePresence mode="wait">
            
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col items-center justify-center space-y-8"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold opacity-90">How E-Job Finder Works</h3>
                  <p className="text-muted-foreground">It only takes three simple steps to land your dream job.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                  <div className="bg-muted/40 p-6 rounded-xl flex flex-col items-center text-center gap-3 border shadow-sm">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <UploadCloud className="h-8 w-8" />
                    </div>
                    <h4 className="font-semibold">1. Connect CV</h4>
                    <p className="text-xs text-muted-foreground w-40">Upload or paste your resume into our system.</p>
                  </div>
                  
                  <div className="bg-muted/40 p-6 rounded-xl flex flex-col items-center text-center gap-3 border shadow-sm">
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                      <BrainCircuit className="h-8 w-8" />
                    </div>
                    <h4 className="font-semibold">2. AI Analysis</h4>
                    <p className="text-xs text-muted-foreground w-40">Paste a job requirement and trigger our engine.</p>
                  </div>

                  <div className="bg-muted/40 p-6 rounded-xl flex flex-col items-center text-center gap-3 border shadow-sm">
                    <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                      <LineChart className="h-8 w-8" />
                    </div>
                    <h4 className="font-semibold">3. Get Insights</h4>
                    <p className="text-xs text-muted-foreground w-40">Discover matching keyword gaps & rewrite suggestions.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-sm space-y-6"
              >
                <div className="text-center mb-6">
                  <Briefcase className="h-10 w-10 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-semibold">Your Foundation</h3>
                  <p className="text-sm text-muted-foreground">Help us filter the noise by identifying your level.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">What is your Target Role?</label>
                        <Input 
                            autoFocus
                            placeholder="e.g. Senior Software Engineer" 
                            className="bg-muted/20 text-base"
                            value={data.targetRole}
                            onChange={(e) => updateData('targetRole', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Current Experience Level</label>
                        <Input 
                            placeholder="e.g. Mid-Level, Junior, Lead" 
                            className="bg-muted/20 text-base"
                            value={data.experienceLevel}
                            onChange={(e) => updateData('experienceLevel', e.target.value)}
                        />
                    </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-lg space-y-6"
              >
                <div className="bg-primary/5 p-4 rounded-lg flex items-start gap-4 border border-primary/20 mb-6">
                    <BrainCircuit className="h-8 w-8 text-primary shrink-0 mt-1" />
                    <div>
                        <h4 className="font-semibold text-primary">AI Calibration</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Our engine cross-references your core skills against massive datasets of job descriptions to find keyword overlap. Let's seed the engine.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Star className="h-4 w-4" /> 
                        Top 3-5 Professional Skills
                    </label>
                    <Textarea 
                        autoFocus
                        placeholder="e.g. Python, React, Next.js, Strategic Planning, Analytics" 
                        className="bg-muted/20 min-h-[100px] text-base resize-none"
                        value={data.skills}
                        onChange={(e) => updateData('skills', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">Separate with commas</p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-sm space-y-6"
              >
                <div className="text-center mb-6">
                  <Target className="h-10 w-10 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-semibold">The Final Touch</h3>
                  <p className="text-sm text-muted-foreground">Just a bit more context for accurate localized matching.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4"/> Where are you based?</label>
                        <Input 
                            autoFocus
                            placeholder="e.g. Remote, or London, UK" 
                            className="bg-muted/20 text-base"
                            value={data.location}
                            onChange={(e) => updateData('location', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Rocket className="h-4 w-4"/> What's the main goal?</label>
                        <Input 
                            placeholder="e.g. Break into Startups" 
                            className="bg-muted/20 text-base"
                            value={data.careerGoals}
                            onChange={(e) => updateData('careerGoals', e.target.value)}
                        />
                    </div>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </CardContent>
        
        <CardFooter className="bg-muted/20 border-t p-6 flex justify-between relative z-10">
            <Button
                variant="ghost" 
                onClick={step === 0 ? handleSkip : handleBack}
                disabled={isSaving}
                className={step === 0 ? "text-muted-foreground" : ""}
            >
                {step === 0 ? "Skip for now" : "Back"}
            </Button>
            
            <Button
                onClick={step === totalSteps - 1 ? handleFinish : handleNext}
                disabled={!currentStepIsValid() || isSaving}
                size="lg"
                className="font-semibold tracking-wide min-w-[140px] shadow-md hover:shadow-lg transition-all"
            >
                {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : step === totalSteps - 1 ? (
                    <><Rocket className="mr-2 h-4 w-4" /> Go to Dashboard</>
                ) : (
                    <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
