"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function LandingPage() {
  const [year, setYear] = useState(2026);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setYear(new Date().getFullYear());
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="min-h-screen font-sans antialiased"
      style={{ backgroundColor: "#FFFFFF", color: "#0D0D0D", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
    >
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: scrolled ? "1px solid #E5E5EA" : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-0">
            <span className="font-bold text-xl tracking-tight" style={{ color: "#0D0D0D" }}>
              <span style={{ color: "#FF6B00" }}>E</span>
              <span style={{ color: "#FF6B00", fontSize: "0.55rem", verticalAlign: "middle", margin: "0 1px" }}>●</span>
              Job Finder
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-sm transition-colors duration-200 hover:opacity-60"
              style={{ color: "#6E6E73" }}
            >
              How it works
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-sm transition-colors duration-200 hover:opacity-60"
              style={{ color: "#6E6E73" }}
            >
              Pricing
            </button>
            <Link
              href="/login"
              className="text-sm transition-colors duration-200 hover:opacity-60"
              style={{ color: "#6E6E73" }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF6B00", color: "#FFFFFF" }}
            >
              Get started
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden px-6 pb-6 flex flex-col gap-5 border-t"
            style={{ borderColor: "#E5E5EA", backgroundColor: "#FFFFFF" }}
          >
            <button onClick={() => scrollTo("how-it-works")} className="text-left text-base font-medium" style={{ color: "#0D0D0D" }}>
              How it works
            </button>
            <button onClick={() => scrollTo("pricing")} className="text-left text-base font-medium" style={{ color: "#0D0D0D" }}>
              Pricing
            </button>
            <Link href="/login" className="text-base font-medium" style={{ color: "#0D0D0D" }}>
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-center text-base font-semibold px-5 py-3 rounded-full"
              style={{ backgroundColor: "#FF6B00", color: "#FFFFFF" }}
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ── SECTION 1: HERO ────────────────────────────────────────────── */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-6"
            style={{ color: "#FF6B00", letterSpacing: "0.18em" }}
          >
            AI-Powered Recruitment
          </p>

          <h1
            className="font-bold leading-none tracking-tighter"
            style={{ fontSize: "clamp(2.8rem, 8vw, 6.5rem)", lineHeight: 1.04, color: "#0D0D0D", maxWidth: "820px" }}
          >
            Your CV reads itself.
            <br />
            The right jobs
            <br />
            find you.
          </h1>

          <p
            className="mt-8 text-lg leading-relaxed"
            style={{ color: "#6E6E73", maxWidth: "520px" }}
          >
            E-Job Finder extracts your skills, ranks live job listings by
            compatibility, and applies on your behalf. Upload once. Let the
            agent work.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="font-semibold px-7 py-[14px] rounded-full transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF6B00", color: "#FFFFFF", borderRadius: "980px" }}
            >
              Get matched free
            </Link>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="font-semibold px-7 py-[14px] rounded-full border transition-all duration-200 hover:opacity-70"
              style={{ borderRadius: "980px", borderColor: "#FF6B00", color: "#FF6B00", backgroundColor: "transparent" }}
            >
              See how it works
            </button>
          </div>

          <p className="mt-8 text-[13px]" style={{ color: "#6E6E73" }}>
            200+ live SA jobs&nbsp;&nbsp;·&nbsp;&nbsp;AI-matched in seconds&nbsp;&nbsp;·&nbsp;&nbsp;Free to start
          </p>
        </section>

        {/* ── SECTION 2: SOCIAL PROOF BAR ─────────────────────────────── */}
        <section style={{ backgroundColor: "#F5F5F7", borderTop: "1px solid #E5E5EA", borderBottom: "1px solid #E5E5EA" }}>
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-center">
            <p
              className="text-[13px] text-center tracking-wide"
              style={{ color: "#6E6E73", letterSpacing: "0.04em" }}
            >
              Built for South Africa&apos;s 11 million job seekers&nbsp;&nbsp;·&nbsp;&nbsp;Powered by Google Gemini AI&nbsp;&nbsp;·&nbsp;&nbsp;Zero cost to get started
            </p>
          </div>
        </section>

        {/* ── SECTION 3: HOW IT WORKS ──────────────────────────────────── */}
        <section id="how-it-works" className="px-6 py-28 md:py-40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ color: "#FF6B00", letterSpacing: "0.18em" }}
              >
                The Process
              </p>
              <h2
                className="font-bold tracking-tighter"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "#0D0D0D", lineHeight: 1.08 }}
              >
                Three steps. Zero guesswork.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
              {[
                {
                  n: "01",
                  title: "Upload your CV",
                  body: "Our AI reads every line — skills, seniority, experience. No forms to fill. No manual entry.",
                },
                {
                  n: "02",
                  title: "Your profile is built",
                  body: "A structured skill profile is created automatically and stored securely. Updated every time you upload a new CV.",
                },
                {
                  n: "03",
                  title: "Jobs are ranked for you",
                  body: "Live listings from across South Africa are scored against your profile every 6 hours. Best matches rise to the top.",
                },
                {
                  n: "04",
                  title: "Agent applies for you",
                  body: "Our AI agent fills in application forms and submits on your behalf. You review, approve, and track everything in one dashboard.",
                },
              ].map((step) => (
                <div key={step.n} className="flex flex-col">
                  <span
                    className="font-thin leading-none mb-5 select-none"
                    style={{ fontSize: "4rem", color: "#FF6B00", fontWeight: 100 }}
                  >
                    {step.n}
                  </span>
                  <h3 className="font-bold text-lg mb-3" style={{ color: "#0D0D0D" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#6E6E73", lineHeight: 1.7 }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FEATURE SPLIT ─────────────────────────────────── */}
        <section className="px-6 py-28 md:py-40" style={{ backgroundColor: "#F5F5F7" }}>
          <div className="max-w-6xl mx-auto space-y-32">

            {/* Row 1: text left, CSS mockup right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-4"
                  style={{ color: "#FF6B00", letterSpacing: "0.18em" }}
                >
                  Match Score
                </p>
                <h2
                  className="font-bold tracking-tighter mb-5"
                  style={{ fontSize: "clamp(1.75rem, 4vw, 2.8rem)", color: "#0D0D0D", lineHeight: 1.1 }}
                >
                  Know your fit before you apply.
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "#6E6E73", lineHeight: 1.75 }}>
                  Every job gets a compatibility score based on your actual extracted
                  skills — not your job title, not your years of experience. A 91%
                  match means something real.
                </p>
              </div>

              {/* CSS Job Card Mockup */}
              <div className="flex justify-center">
                <div
                  className="w-full max-w-sm rounded-2xl p-8 shadow-lg"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E5EA" }}
                >
                  <div className="flex items-center gap-5 mb-6">
                    {/* Conic gradient score circle */}
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "conic-gradient(#FF6B00 0% 91%, #E5E5EA 91% 100%)",
                        padding: "3px",
                      }}
                    >
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#FFFFFF" }}
                      >
                        <span className="font-bold text-lg" style={{ color: "#FF6B00" }}>91%</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-base leading-tight" style={{ color: "#0D0D0D" }}>
                        Senior React Developer
                      </p>
                      <p className="text-sm mt-1" style={{ color: "#6E6E73" }}>Cape Town</p>
                      <p className="text-xs font-semibold mt-1" style={{ color: "#FF6B00" }}>91% match</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["React", "TypeScript", "Node.js"].map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium px-3 py-1 rounded-full"
                        style={{ backgroundColor: "#FFF3EB", color: "#FF6B00" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: CSS mockup left, text right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              {/* CSS Terminal/Activity Feed Mockup */}
              <div className="flex justify-center md:order-1 order-2">
                <div
                  className="w-full max-w-sm rounded-2xl p-6"
                  style={{ backgroundColor: "#1A1A1A" }}
                >
                  <div className="flex gap-1.5 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: "✓", text: "Applied — Junior Data Analyst, Johannesburg", done: true },
                      { icon: "✓", text: "Applied — Marketing Coordinator, Cape Town", done: true },
                      { icon: "✓", text: "Applied — Financial Analyst, Pretoria", done: true },
                      { icon: "⏳", text: "Applying — UX Designer, Remote...", done: false },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 text-xs rounded-lg px-4 py-3"
                        style={{
                          fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                          backgroundColor: "#242424",
                        }}
                      >
                        <span style={{ color: item.done ? "#30D158" : "#FF6B00", flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        <span style={{ color: item.done ? "#E5E5E5" : "#FF6B00" }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:order-2 order-1">
                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-4"
                  style={{ color: "#FF6B00", letterSpacing: "0.18em" }}
                >
                  Auto-Apply Agent
                </p>
                <h2
                  className="font-bold tracking-tighter mb-5"
                  style={{ fontSize: "clamp(1.75rem, 4vw, 2.8rem)", color: "#0D0D0D", lineHeight: 1.1 }}
                >
                  Apply to 25 jobs while you sleep.
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "#6E6E73", lineHeight: 1.75 }}>
                  The E-Job Finder agent reads each application form, pulls from your
                  profile, writes a tailored cover letter, and submits. You get a
                  notification. That&apos;s it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: PRICING ─────────────────────────────────────────── */}
        <section id="pricing" className="px-6 py-28 md:py-40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ color: "#FF6B00", letterSpacing: "0.18em" }}
              >
                Pricing
              </p>
              <h2
                className="font-bold tracking-tighter"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "#0D0D0D", lineHeight: 1.08 }}
              >
                Start free. Upgrade when you&apos;re ready.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {[
                {
                  name: "Free",
                  price: "R0",
                  period: "/month",
                  badge: null,
                  features: ["3 matches/week", "CV scan", "Job listings access", "Bubbl AI (5/day)"],
                  cta: "Start for free",
                  ctaHref: "/signup",
                  solid: false,
                  note: null,
                },
                {
                  name: "Student",
                  price: "R49",
                  period: "/month",
                  badge: "MOST POPULAR",
                  features: [
                    "Unlimited matches",
                    "Full AI analysis",
                    "Match reasoning",
                    "Bubbl AI unlimited",
                    "2 auto-apply credits/month",
                  ],
                  cta: "Get Student plan",
                  ctaHref: "/signup",
                  solid: true,
                  note: "Verified with .ac.za email",
                },
                {
                  name: "Pro",
                  price: "R199",
                  period: "/month",
                  badge: null,
                  features: [
                    "Everything in Student",
                    "Weekly alerts",
                    "Salary insights",
                    "Priority refresh every 2hrs",
                    "5 auto-apply credits/month",
                    "Application tracker",
                  ],
                  cta: "Go Pro",
                  ctaHref: "/signup",
                  solid: false,
                  note: null,
                },
                {
                  name: "Recruiter",
                  price: "R1,500",
                  period: "/month",
                  badge: null,
                  features: [
                    "Candidate pool access",
                    "Bulk CV scoring",
                    "Direct posting",
                    "Dedicated support",
                  ],
                  cta: "Contact us",
                  ctaHref: "/contact",
                  solid: false,
                  note: null,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className="relative flex flex-col rounded-[18px] p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E5EA" }}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-[3px] rounded-full tracking-wider"
                      style={{ backgroundColor: "#FF6B00", color: "#FFFFFF" }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <p className="font-semibold text-sm mb-3" style={{ color: "#6E6E73" }}>{plan.name}</p>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="font-bold" style={{ fontSize: "2.25rem", color: "#0D0D0D", lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span className="text-sm mb-1" style={{ color: "#6E6E73" }}>{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#0D0D0D" }}>
                        <span style={{ color: "#FF6B00", flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className="block text-center text-sm font-semibold px-5 py-3 rounded-full transition-all duration-200 hover:opacity-80"
                    style={
                      plan.solid
                        ? { backgroundColor: "#FF6B00", color: "#FFFFFF" }
                        : { border: "1px solid #FF6B00", color: "#FF6B00", backgroundColor: "transparent" }
                    }
                  >
                    {plan.cta}
                  </Link>

                  {plan.note && (
                    <p className="text-center text-xs mt-3" style={{ color: "#6E6E73" }}>{plan.note}</p>
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-sm mt-10 max-w-2xl mx-auto" style={{ color: "#6E6E73" }}>
              Apply Credits available separately — R49 for 5 applications, R89 for 12, R299/month unlimited.
              Auto-apply without a monthly plan.
            </p>
          </div>
        </section>

        {/* ── SECTION 6: FINAL CTA ─────────────────────────────────────── */}
        <section className="px-6 py-28 md:py-40 text-center" style={{ backgroundColor: "#0D0D0D" }}>
          <div className="max-w-3xl mx-auto">
            <h2
              className="font-bold tracking-tighter mb-5"
              style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", color: "#FFFFFF", lineHeight: 1.05 }}
            >
              Stop applying into the void.
            </h2>
            <p className="text-lg mb-10" style={{ color: "#6E6E73" }}>
              Upload your CV once. Let E-Job Finder do the rest.
            </p>
            <Link
              href="/signup"
              className="inline-block font-semibold px-8 py-4 rounded-full transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF6B00", color: "#FFFFFF", borderRadius: "980px" }}
            >
              Get matched free →
            </Link>
            <p className="mt-6 text-xs" style={{ color: "#444" }}>
              No credit card required · Cancel anytime · Built by ACreative LLC
            </p>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-8"
        style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #E5E5EA" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-3">
            <span className="font-bold text-sm" style={{ color: "#0D0D0D" }}>
              <span style={{ color: "#FF6B00" }}>E</span>
              <span style={{ color: "#FF6B00", fontSize: "0.45rem", verticalAlign: "middle", margin: "0 1px" }}>●</span>
              Job Finder
            </span>
            <span className="text-xs" style={{ color: "#6E6E73" }}>
              Built by ACreative LLC · Powered by Google Gemini
            </span>
            <div className="flex gap-5 text-xs" style={{ color: "#6E6E73" }}>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:underline">Terms</Link>
            </div>
          </div>
          <p className="text-center text-xs" style={{ color: "#6E6E73" }}>
            © {year} E-Job Finder. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
