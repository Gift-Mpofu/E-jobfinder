import { createClient } from '@/supabase/server';

/** Throws unless the request carries a signed-in Supabase session. */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to use this feature.');
  const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).single();
  if (profile?.status === 'suspended') throw new Error('Your account is suspended.');
  return user;
}
