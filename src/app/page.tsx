"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, Briefcase, TrendingUp, Star, Zap, Target, BrainCircuit, Quote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const chartData = [
  { month: "January", interviews: 45 },
  { month: "February", interviews: 60 },
  { month: "March", interviews: 85 },
  { month: "April", interviews: 110 },
  { month: "May", interviews: 150 },
  { month: "June", interviews: 190 },
];

const chartConfig = {
  interviews: {
    label: "Interviews",
    color: "hsl(var(--primary))",
  },
};

export default function LandingPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [heroImage, setHeroImage] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    setYear(new Date().getFullYear());
    setHeroImage(PlaceHolderImages.find(p => p.id === 'hero-landing'));

    const testimonialAvatars = {
        'Sarah L.': PlaceHolderImages.find(p => p.id === 'testimonial-1'),
        'Michael B.': PlaceHolderImages.find(p => p.id === 'testimonial-2'),
        'Jessica P.': PlaceHolderImages.find(p => p.id === 'testimonial-3')
    };

    setTestimonials([
      {
        name: "Sarah L.",
        title: "Software Engineer",
        quote: "E-Jobfinder Pro was a game-changer. The AI analysis helped me tailor my CV for the exact roles I wanted, and I landed my dream job at a FAANG company within a month!",
        avatar: testimonialAvatars['Sarah L.'],
        avatarFallback: "SL"
      },
      {
        name: "Michael B.",
        title: "Product Manager",
        quote: "I was struggling to get past the initial screening. This tool showed me exactly which keywords were missing. My interview requests shot up by 300%!",
        avatar: testimonialAvatars['Michael B.'],
        avatarFallback: "MB"
      },
      {
        name: "Jessica P.",
        title: "UX Designer",
        quote: "The interface is so intuitive, and the feedback is incredibly detailed. It's like having a personal career coach. I recommend it to all my friends.",
        avatar: testimonialAvatars['Jessica P.'],
        avatarFallback: "JP"
      }
    ]);
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

      <main>
        <section className="py-24 sm:py-32">
          <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-foreground">
                Stop Guessing. <span className="text-primary">Start Landing Interviews.</span>
              </h2>
              <p className="mt-6 max-w-xl mx-auto md:mx-0 text-lg text-muted-foreground">
                Our AI-powered platform analyzes your CV against any job description, providing a detailed compatibility score and actionable feedback to help you secure your dream job.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
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
            </div>
            <div className="hidden md:block px-8">
              {heroImage && 
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={600}
                    height={400}
                    className="rounded-lg shadow-2xl"
                    data-ai-hint={heroImage.imageHint}
                />
              }
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32 bg-muted/20">
           <div className="container mx-auto">
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
           </div>
        </section>

        <section className="py-24 sm:py-32">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h3 className="text-3xl md:text-4xl font-bold">An Unfair Advantage in Your Job Search</h3>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Our platform is packed with features designed to get you hired faster.
                    </p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md border">
                        <BrainCircuit className="h-12 w-12 text-primary mb-4" />
                        <h4 className="text-xl font-semibold">AI-Powered Analysis</h4>
                        <p className="mt-2 text-muted-foreground">Go beyond simple keyword matching with deep semantic analysis of your CV and job descriptions.</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md border">
                        <Target className="h-12 w-12 text-primary mb-4" />
                        <h4 className="text-xl font-semibold">Targeted Keyword Optimization</h4>
                        <p className="mt-2 text-muted-foreground">Identify critical keywords you're missing to beat applicant tracking systems (ATS).</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md border">
                        <Zap className="h-12 w-12 text-primary mb-4" />
                        <h4 className="text-xl font-semibold">Instant Feedback Loop</h4>
                        <p className="mt-2 text-muted-foreground">Get your score and improvement tips in seconds. Iterate and improve on the fly.</p>
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 sm:py-32 bg-muted/20">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h3 className="text-3xl md:text-4xl font-bold">Proven Results</h3>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Our users see a significant increase in interview requests after using E-Jobfinder Pro.
                    </p>
                </div>
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="text-primary"/>
                            Interview Requests Growth
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <BarChart accessibilityLayer data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <YAxis />
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                <Bar dataKey="interviews" fill="var(--color-interviews)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>

        <section className="py-24 sm:py-32">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h3 className="text-3xl md:text-4xl font-bold">Loved by Job Seekers Worldwide</h3>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Don't just take our word for it. Here's what our users are saying.
                    </p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <Card key={index} className="flex flex-col justify-between shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={testimonial.avatar?.imageUrl} alt={testimonial.name} data-ai-hint="person avatar" />
                                        <AvatarFallback>{testimonial.avatarFallback}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex mb-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className="h-5 w-5 text-primary fill-primary" />
                                    ))}
                                </div>
                                <Quote className="text-primary/20 mt-4 -mb-2" />
                                <p className="mt-2 text-muted-foreground italic relative pl-2">"{testimonial.quote}"</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        <section className="py-24 sm:py-32 text-center bg-muted/20">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-foreground">
                Ready to Land Your Dream Job?
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
                Join thousands of successful job seekers. Get started for free and see the difference.
            </p>
            <div className="mt-10 flex justify-center">
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/signup">
                        Get Started for Free
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
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
