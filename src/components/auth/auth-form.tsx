'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useSupabase, useUser } from '@/supabase/provider';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Mode = 'login' | 'signup';
const ADMIN_EMAIL = 'giftmpofud@gmail.com';

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useSupabase();
  const { user } = useUser();

  const isEmailAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (user) {
      router.replace(user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? '/dashboard/admin' : '/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const isAdmin = data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        toast({ title: isAdmin ? 'Master Key Accepted' : 'Welcome back!', description: isAdmin ? 'System access granted.' : `Signed in as ${data.user?.email}` });
        router.replace(isAdmin ? '/dashboard/admin' : '/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: 'Account created!', description: 'Welcome to E-Job Finder. Check your email to verify your account.' });
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      if (isEmailAdmin && error.message.includes('Invalid login credentials')) {
        toast({ title: 'Admin Setup', description: 'Use Sign Up to register the master account first.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: 'Google Sign-In Error', description: error.message, variant: 'destructive' });
    }
  };

  const inputClass = `
    w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-[10px]
    px-4 py-3 text-[15px] text-[#1D1D1F] placeholder-[#AEAEB2]
    outline-none transition-all duration-150
    focus:border-[#FF6B00] focus:shadow-[0_0_0_3px_rgba(255,107,0,0.12)]
  `;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] px-4 py-12"
      style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>

      {/* Back link */}
      <Link href="/" className="flex items-center gap-1.5 text-sm text-[#6E6E73] hover:text-[#1D1D1F] mb-6 transition-colors self-start max-w-[420px] w-full mx-auto">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      {/* Logo */}
      <div className="mb-6 text-center">
        <span className="font-bold text-[20px] text-[#1D1D1F]">
          <span className="text-[#FF6B00]">E</span>
          <span className="text-[#FF6B00] text-[9px] align-middle mx-[1px]">●</span>
          Job Finder
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[20px] p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        <h1 className="text-[26px] font-bold text-[#1D1D1F] mb-1 tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-[14px] text-[#6E6E73] mb-7">
          {mode === 'login' ? 'Sign in to your account' : 'Sign up to start your AI job search'}
        </p>

        {isEmailAdmin && (
          <div className="mb-5 bg-[#FFF3EB] border border-[#FF6B00]/20 rounded-xl px-4 py-3 text-sm text-[#FF6B00] font-medium text-center">
            Admin Master Key Detected
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6E6E73] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FF6B00] hover:bg-[#E55F00] text-white font-semibold py-[13px] rounded-full text-[15px] transition-colors duration-150 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-[#E5E5EA]" />
          <span className="text-[11px] font-medium text-[#AEAEB2] tracking-widest uppercase">Or continue with</span>
          <div className="flex-1 border-t border-[#E5E5EA]" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#D2D2D7] rounded-full py-3 text-[14px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors duration-150 disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        {/* Switch mode */}
        <p className="text-center text-[13px] text-[#6E6E73] mt-6">
          {mode === 'login' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => router.push('/signup')} className="text-[#FF6B00] font-semibold hover:underline">Sign Up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => router.push('/login')} className="text-[#FF6B00] font-semibold hover:underline">Log In</button>
            </>
          )}
        </p>
      </div>

      <p className="mt-8 text-[12px] text-[#AEAEB2]">Built in South Africa by ACreative LLC</p>
    </div>
  );
}