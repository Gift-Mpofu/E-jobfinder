'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const email = searchParams.get('email') ?? '';

  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'No email address found to resend confirmation.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast({
        title: 'Email resent successfully',
        description: 'Please check your inbox.',
      });
      setCooldown(60);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12"
      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
    >
      {/* Back button */}
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-[#6E6E73] hover:text-[#1D1D1F] mb-6 transition-colors self-start max-w-[420px] w-full mx-auto"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-white border border-[#E5E5EA] rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
        {/* Envelope Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[#FFF5EE] rounded-full">
            <Mail className="h-[64px] w-[64px] text-[#FF6B00]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-[26px] font-bold text-[#1D1D1F] mb-3 tracking-tight">
          Check your email
        </h1>

        {/* Body */}
        <p className="text-[15px] text-[#6E6E73] leading-relaxed mb-4">
          We sent a confirmation link to your email. Click it to activate your account and get matched to jobs.
        </p>

        {/* Email shown in bold orange below style */}
        {email && (
          <p className="font-bold text-[#FF6B00] text-[16px] mb-6 break-all">
            {email}
          </p>
        )}

        {/* Divider line */}
        <div className="border-t border-[#E5E5EA] my-6" />

        {/* Didn't receive it? section */}
        <div className="text-left space-y-4">
          <h2 className="text-[14px] font-semibold text-[#1D1D1F]">
            Didn&apos;t receive it?
          </h2>
          <ul className="text-[13px] text-[#6E6E73] list-disc list-inside space-y-1">
            <li>Check your spam folder</li>
          </ul>

          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading || cooldown > 0}
            className="w-full bg-[#FF6B00] hover:bg-[#E55F00] text-white font-semibold py-[12px] rounded-full text-[14px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
          </button>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/signup"
            className="text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            Wrong email? Sign up again
          </Link>
        </div>
      </div>

      <p className="mt-8 text-[12px] text-[#AEAEB2]">Built in South Africa by ACreative LLC</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
