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
  full_name?: string;
  username?: string;
  bio?: string;
  email_notifications?: boolean;
  job_alerts?: boolean;
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

      const userEmail = user.email || '';
      const userFullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const userPhoto = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

      let updatedData = data ? { ...data } : null;

      if (!data) {
        // Create profile row if it doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: userEmail,
            full_name: userFullName || undefined,
            photo_url: userPhoto || undefined,
            last_active: new Date().toISOString(),
          })
          .select('*')
          .single();
        if (!insertError && newProfile) {
          updatedData = newProfile;
        }
      } else {
        // Auto-fill missing profile details from auth.users metadata
        const updates: Record<string, any> = {};
        if (!data.email && userEmail) updates.email = userEmail;
        if (!data.full_name && userFullName) updates.full_name = userFullName;
        if (!data.photo_url && userPhoto) updates.photo_url = userPhoto;

        if (Object.keys(updates).length > 0) {
          const { data: patched } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select('*')
            .single();
          if (patched) updatedData = patched;
        }
      }

      if (mounted) {
        if (updatedData) {
          setProfile(updatedData as UserProfile);
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
