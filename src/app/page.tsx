"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, type FC } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, BrainCircuit, Star, Target, Zap, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";


type Feature = {
  icon: FC<React.ComponentProps<'svg'>>;
  title: string;
  description: string;
  image: ImagePlaceholder | undefined;
};

type Testimonial = {
  name: string;
  title: string;
  quote: string;
  avatar: ImagePlaceholder | undefined;
  avatarFallback: string;
};

export default function LandingPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [images, setImages] = useState<Record<string, ImagePlaceholder | undefined>>({});
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    setYear(new Date().getFullYear());

    const imageMap: Record<string, ImagePlaceholder | undefined> = {
        hero: PlaceHolderImages.find(p => p.id === 'hero-landing'),
        analysis: PlaceHolderImages.find(p => p.id === 'feature-analysis'),
        keywords: PlaceHolderImages.find(p => p.id === 'feature-keywords'),
        feedback: PlaceHolderImages.find(p => p.id === 'feature-feedback'),
        testimonial1: PlaceHolderImages.find(p => p.id === 'testimonial-1'),
        testimonial2: PlaceHolderImages.find(p => p.id === 'testimonial-2'),
        testimonial3: PlaceHolderImages.find(p => p.id === 'testimonial-3'),
    };
    setImages(imageMap);

    setTestimonials([
      {
        name: "Sarah L.",
        title: "Software Engineer",
        quote: "Angine was a game-changer. The AI analysis helped me tailor my CV for the exact roles I wanted, and I landed my dream job at a FAANG company within a month!",
        avatar: imageMap.testimonial1,
        avatarFallback: "SL"
      },
      {
        name: "Michael B.",
        title: "Product Manager",
        quote: "I was struggling to get past the initial screening. This tool showed me exactly which keywords were missing. My interview requests shot up by 300%!",
        avatar: imageMap.testimonial2,
        avatarFallback: "MB"
      },
      {
        name: "Jessica P.",
        title: "UX Designer",
        quote: "The interface is so intuitive, and the feedback is incredibly detailed. It's like having a personal career coach. I recommend it to all my friends.",
        avatar: imageMap.testimonial3,
        avatarFallback: "JP"
      }
    ]);
  }, []);

  const features: Feature[] = [
      {
          icon: BrainCircuit,
          title: "AI-Powered Analysis",
          description: "Go beyond simple keyword matching with deep semantic analysis of your CV and job descriptions.",
          image: images.analysis
      },
      {
          icon: Target,
          title: "Targeted Keyword Optimization",
          description: "Identify critical keywords you're missing to beat applicant tracking systems (ATS).",
          image: images.keywords
      },
      {
          icon: Zap,
          title: "Instant Feedback Loop",
          description: "Get your score and improvement tips in seconds. Iterate and improve on the fly.",
          image: images.feedback
      }
  ];

  const chartData = [
    { metric: 'Interview Callback Rate', without: 15, with: 65 },
    { metric: 'CV Match Score', without: 30, with: 85 },
  ];

  const chartConfig = {
    without: {
      label: 'Without Angine',
      color: 'hsl(var(--muted-foreground))',
    },
    with: {
      label: 'With Angine',
      color: 'hsl(var(--primary))',
    },
  } as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-sm z-50 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-primary font-headline tracking-tighter">Angine</h1>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter max-w-4xl mx-auto">
              The AI engine for your job search.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
              Stop guessing. Angine analyzes your CV against any job description to give you an unfair advantage.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {images.hero && (
            <section className="container mx-auto px-4">
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden border">
                    <Image
                        src={images.hero.imageUrl}
                        alt={images.hero.description}
                        fill
                        className="object-cover"
                        data-ai-hint={images.hero.imageHint}
                        priority
                    />
                </div>
            </section>
        )}

        <section className="py-24 md:py-40 bg-secondary/30 dark:bg-secondary/10 mt-24 md:mt-32">
           <div className="container mx-auto">
            <div className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">How it works</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                  In three simple steps, gain clarity and confidence in your job applications.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-6 border-2 border-primary/20">
                      <span className="text-3xl font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-semibold">Provide Your CV</h3>
                  <p className="mt-2 text-muted-foreground">Upload or paste the content of your CV.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-6 border-2 border-primary/20">
                      <span className="text-3xl font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-semibold">Add Job Description</h3>
                  <p className="mt-2 text-muted-foreground">Paste the job description you're targeting.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-6 border-2 border-primary/20">
                      <span className="text-3xl font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-semibold">Get Instant Analysis</h3>
                  <p className="mt-2 text-muted-foreground">Receive a match score and actionable feedback.</p>
              </div>
            </div>
           </div>
        </section>

        <section className="py-24 md:py-40">
          <div className="container mx-auto">
            <div className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">The Angine Difference</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Stop guessing. Start improving. See how Angine transforms your job hunt.
              </p>
            </div>
            <Card className="shadow-lg border-border/50 max-w-4xl mx-auto bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Application Success: Before & After</CardTitle>
                <CardDescription>Angine's AI analysis dramatically improves your key job search metrics.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full text-xs">
                  <BarChart data={chartData} accessibilityLayer margin={{ left: 10, top: 10, right: 10 }}>
                    <CartesianGrid vertical={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <XAxis
                      dataKey="metric"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      className="text-xs"
                    />
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Legend />
                    <Bar dataKey="without" fill="var(--color-without)" radius={8} />
                    <Bar dataKey="with" fill="var(--color-with)" radius={8} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </section>
        
        <section className="py-24 md:py-40">
            <div className="container mx-auto space-y-24 md:space-y-40">
                {features.map((feature, index) => (
                    <div key={feature.title} className={`grid md:grid-cols-2 gap-12 md:gap-24 items-center ${index % 2 !== 0 ? 'md:grid-flow-col-dense' : ''}`}>
                        <div className={`text-center md:text-left ${index % 2 !== 0 ? 'md:col-start-2' : ''}`}>
                            <feature.icon className="h-10 w-10 text-primary mb-4 inline-block"/>
                            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">{feature.title}</h3>
                            <p className="mt-4 text-lg text-muted-foreground">{feature.description}</p>
                        </div>
                        {feature.image &&
                            <div className={`relative aspect-square rounded-lg overflow-hidden border ${index % 2 !== 0 ? 'md:col-start-1' : ''}`}>
                                <Image
                                    src={feature.image.imageUrl}
                                    alt={feature.image.description}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    data-ai-hint={feature.image.imageHint}
                                />
                            </div>
                        }
                    </div>
                ))}
            </div>
        </section>

        <section className="py-24 md:py-40 bg-secondary/30 dark:bg-secondary/10">
            <div className="container mx-auto">
                <div className="text-center mb-16 md:mb-24">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Loved by Job Seekers</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Don't just take our word for it. Here's what our users are saying.
                    </p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial) => (
                        <Card key={testimonial.name} className="flex flex-col justify-between border-none bg-transparent shadow-none">
                            <CardContent className="p-0">
                                <div className="flex mb-4">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className="h-5 w-5 text-primary fill-primary" />
                                    ))}
                                </div>
                                <blockquote className="mt-2 text-lg text-foreground italic">"{testimonial.quote}"</blockquote>
                            </CardContent>
                            <div className="flex items-center gap-4 mt-6">
                                <Avatar>
                                    <AvatarImage src={testimonial.avatar?.imageUrl} alt={testimonial.name} data-ai-hint="person avatar" />
                                    <AvatarFallback>{testimonial.avatarFallback}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{testimonial.name}</p>
                                    <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        <section className="py-24 md:py-32 text-center">
            <div className="container mx-auto">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">
                    Ready to land your dream job?
                </h2>
                <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
                    Join thousands of successful job seekers. Get started for free and see the difference.
                </p>
                <div className="mt-10 flex justify-center">
                    <Button asChild size="lg" className="text-lg py-7 px-10">
                        <Link href="/signup">
                            Analyze Your CV <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      
      <footer className="py-8 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>&copy; {year} Angine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
