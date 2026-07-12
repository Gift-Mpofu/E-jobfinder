import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div
      className="min-h-screen bg-[#F5F5F7]"
      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
    >
      <header className="bg-white border-b border-[#E5E5EA] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-bold text-[#1D1D1F]">
            <span className="text-[#FF6B00]">E</span> Job Finder
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#6E6E73] mb-8">Last updated: July 2026</p>

        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 space-y-6 text-[#1D1D1F]">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              By accessing or using E-Job Finder, you agree to be bound by these Terms of Service. If you do not agree,
              please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Service Description</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              E-Job Finder is an AI-powered job matching platform for South African job seekers. We provide CV analysis,
              job listings, match scoring, and career guidance tools. The platform is currently in public beta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. User Accounts</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate
              information during registration and keep your profile up to date. One account per person.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Acceptable Use</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              You may not use E-Job Finder to upload false information, scrape data, interfere with platform operations,
              or violate any applicable laws. Free accounts are limited to 3 CV scans per week.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. AI-Generated Content</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              Match scores, career advice, and other AI outputs are provided for guidance only and do not guarantee
              employment outcomes. You are responsible for verifying information before applying to jobs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Limitation of Liability</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              E-Job Finder is provided &quot;as is&quot; without warranties. ACreative LLC is not liable for any indirect,
              incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:legal@e-jobfinder.co.za" className="text-[#FF6B00] hover:underline">
                legal@e-jobfinder.co.za
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
