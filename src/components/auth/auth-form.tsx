'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import InputWithLabel from '@/components/ui/input-with-label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';

type Mode = 'login' | 'signup';
const ADMIN_EMAIL = 'Giftmpofud@gmail.com';

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      if (user.email === ADMIN_EMAIL) {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user.email === ADMIN_EMAIL) {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        router.push('/dashboard/onboarding');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGoogle = async () => {
    try {
      const googleProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email === ADMIN_EMAIL) {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
          {mode === 'login' ? 'Log In to E-Job Finder' : 'Create your Account'}
        </h2>
        {email === ADMIN_EMAIL && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-md text-xs text-primary font-medium text-center">
            Admin/Developer Mode detected
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <InputWithLabel
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <InputWithLabel
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <Button type="submit" className="w-full">
            {mode === 'login' ? 'Log In' : 'Sign Up'}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
        >
          Google
        </Button>
      </div>
    </div>
  );
}