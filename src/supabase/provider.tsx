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
            console.warn('Supabase getSession warning:', error.message);
          }
          setSession(session);
          setUser(session?.user ?? null);
          setIsUserLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.warn('Supabase getSession network error:', err);
        if (mounted) {
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
