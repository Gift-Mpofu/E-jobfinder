'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Briefcase, Star, Award, Target, Rocket, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const questions = [
  {
    id: 'targetRole',
    icon: Briefcase,
    title: 'What is your target job role?',
    placeholder: 'e.g., Senior Software Engineer',
    type: 'text',
  },
  {
    id: 'experienceLevel',
    icon: Award,
    title: 'What is your experience level?',
    placeholder: 'e.g., Junior, Mid-level, Senior, Lead',
    type: 'text',
  },
    {
    id: 'location',
    icon: MapPin,
    title: 'Where are you based?',
    placeholder: 'e.g., London, UK or Remote',
    type: 'text',
  },
  {
    id: 'skills',
    icon: Star,
    title: 'What are your top 3-5 key skills?',
    placeholder: 'e.g., React, Node.js, TypeScript, SQL, AWS',
    type: 'textarea',
  },
  {
    id: 'achievements',
    icon: Rocket,
    title: 'What is a recent achievement you\'re proud of?',
    placeholder: 'e.g., Led a project that increased user engagement by 15%',
    type: 'textarea',
  },
  {
    id: 'careerGoals',
    icon: Target,
    title: 'What is your main career goal right now?',
    placeholder: 'e.g., Land a job in a fast-growing startup',
    type: 'text',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleNext = () => {
    const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer(answers[questions[currentQuestionIndex + 1].id] || '');
    } else {
      handleFinish(newAnswers);
    }
  };

  const handleFinish = (finalAnswers: Record<string, string>) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save your profile.",
      });
      router.push('/login');
      return;
    }

    // Prepare data for Firestore, converting skills to an array
    const profileData = {
      ...finalAnswers,
      id: user.uid,
      email: user.email,
      photoURL: user.photoURL,
      skills: finalAnswers.skills ? finalAnswers.skills.split(',').map(s => s.trim()) : [],
      scansUsed: 0,
      scanLimitReachedAt: null,
    };
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(userRef, profileData, { merge: true });
      
      toast({
        title: "Profile Saved!",
        description: "Your career profile has been updated.",
      });
      
      router.push('/dashboard');
    } catch(error: any) {
        console.error("Failed to save onboarding data:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Could not save your profile. Please try again.",
        });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center">Welcome to E-Job Finder!</CardTitle>
          <CardDescription className="text-center">Let's set up your career profile to get the best results.</CardDescription>
          <div className="pt-4">
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
        <CardContent className="min-h-[250px] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="text-center space-y-4">
                <div className="flex justify-center items-center gap-3">
                  <currentQuestion.icon className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold">{currentQuestion.title}</h2>
                </div>
                {currentQuestion.type === 'textarea' ? (
                  <Textarea
                    placeholder={currentQuestion.placeholder}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="min-h-[120px] text-base text-center"
                    autoFocus
                  />
                ) : (
                  <Input
                    type="text"
                    placeholder={currentQuestion.placeholder}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="text-base text-center"
                    autoFocus
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleNext}
            disabled={!currentAnswer}
            className="w-full"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish & Go to Dashboard'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
