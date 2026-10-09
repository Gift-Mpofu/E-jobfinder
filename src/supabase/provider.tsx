'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

type SupabaseContextType = {
  user: User | null;
  session: Session | null;
  isUserLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  isUserLoading: true,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    let mounted = true;

    const isInvalidTokenError = (err: any) => {
      if (!err) return false;
      const msg = (err.message || '').toLowerCase();
      const code = (err.code || '').toLowerCase();
      return (
        msg.includes('refresh token') ||
        msg.includes('invalid_grant') ||
        msg.includes('token not found') ||
        code.includes('refresh_token')
      );
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsUserLoading(false);
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }: { data: { session: Session | null }, error: any }) => {
        if (mounted) {
          if (error) {
            if (isInvalidTokenError(error)) {
              console.warn('Invalid refresh token detected. Clearing local auth session.');
              supabase.auth.signOut().catch(() => {});
              setSession(null);
              setUser(null);
            } else {
              console.warn('Supabase getSession warning:', error.message);
              setSession(session);
              setUser(session?.user ?? null);
            }
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
          setIsUserLoading(false);
        }
      })
      .catch((err: any) => {
        if (mounted) {
          if (isInvalidTokenError(err)) {
            console.warn('Invalid refresh token caught. Clearing local session.');
            supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
          } else {
            console.warn('Supabase getSession error:', err);
          }
          setIsUserLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ user, session, isUserLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useUser() {
  const context = useContext(SupabaseContext);
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: null
  };
}

export function useSupabase() {
  return getSupabaseClient();
}
