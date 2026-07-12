import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#6E6E73] mb-8">Last updated: July 2026</p>

        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 space-y-6 text-[#1D1D1F]">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              When you use E-Job Finder, we collect information you provide directly — including your email address,
              profile details, CV content, job preferences, and scan history. We also collect usage data such as pages
              visited and features used to improve the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              Your data is used to match you with relevant job listings, power AI-driven CV analysis, personalise your
              dashboard, and communicate account-related updates. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. AI Processing</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              CV content and job descriptions you submit may be processed by Google Gemini via our AI infrastructure
              to generate match scores and career advice. This processing is performed solely to deliver the features
              you request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Storage &amp; Security</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              Your data is stored securely in Supabase (PostgreSQL) with row-level security policies. Profile photos
              are stored in Supabase Storage. We use industry-standard encryption in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Your Rights</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              You may request access to, correction of, or deletion of your personal data at any time by contacting us.
              You can delete your account and associated data from your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Contact</h2>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              For privacy-related enquiries, contact ACreative LLC at{' '}
              <a href="mailto:privacy@e-jobfinder.co.za" className="text-[#FF6B00] hover:underline">
                privacy@e-jobfinder.co.za
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
