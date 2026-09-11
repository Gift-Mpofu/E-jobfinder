import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUser } from './provider';

export type UserProfile = {
  id: string;
  email?: string;
  scans_used?: number;
  last_scan_reset?: string | null;
  photo_url?: string;
  last_active?: string | null;
  target_role?: string;
  experience_level?: string;
  location?: string;
  skills?: string[];
  career_goals?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
};

export function useProfile() {
  const { user, isUserLoading } = useUser();
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function fetchProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile', error);
      }

      if (mounted) {
        if (data) {
          setProfile(data as UserProfile);
        }
        setIsLoading(false);
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [user, isUserLoading]);

  return { profile, isLoading };
}
