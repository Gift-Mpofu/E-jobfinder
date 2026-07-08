import { useEffect, useState } from 'react';
import { useSupabase, useUser } from './provider';

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
  const supabase = useSupabase();
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
    
    // Realtime subscription
    const channel = supabase.channel(`profile-updates-${user.id}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => {
        const newData = payload.new as any;
        setProfile(newData as UserProfile);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, isUserLoading, supabase]);

  return { profile, isLoading };
}
