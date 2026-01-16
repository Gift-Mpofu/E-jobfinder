"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, Briefcase } from "lucide-react";

export default function LandingPage() {
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary font-headline">E-Jobfinder Pro</h1>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto">
        <section className="py-24 sm:py-32 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-foreground">
            Stop Guessing. <span className="text-primary">Start Matching.</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            E-Jobfinder Pro uses AI to analyze your CV against any job description, giving you a detailed compatibility score and actionable feedback to land your dream job.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/signup">
                Analyze Your CV Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
             <Button asChild size="lg" variant="outline">
              <Link href="/login">
                I have an account
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-24 sm:py-32">
           <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold">A Smarter Way to Job Hunt</h3>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                In three simple steps, gain an unfair advantage in your job search.
            </p>
           </div>
           <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
             <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-6 border border-primary/20">
                    <span className="text-2xl font-bold">1</span>
                </div>
                <h4 className="text-xl font-semibold">Provide Your CV</h4>
                <p className="mt-2 text-muted-foreground">Upload your CV as a PDF/DOCX or simply paste the text content.</p>
             </div>
             <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-6 border border-primary/20">
                    <span className="text-2xl font-bold">2</span>
                </div>
                <h4 className="text-xl font-semibold">Add Job Description</h4>
                <p className="mt-2 text-muted-foreground">Paste the entire job description you're targeting.</p>
             </div>
             <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-6 border border-primary/20">
                    <span className="text-2xl font-bold">3</span>
                </div>
                <h4 className="text-xl font-semibold">Get Instant Analysis</h4>
                <p className="mt-2 text-muted-foreground">Receive a match score, keyword analysis, and AI-powered suggestions.</p>
             </div>
           </div>
        </section>
      </main>
      
      <footer className="py-8 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
            <p>&copy; {year} E-Jobfinder Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
