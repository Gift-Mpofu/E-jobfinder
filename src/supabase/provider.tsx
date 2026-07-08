'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsUserLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsUserLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

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
  return createClient();
}
