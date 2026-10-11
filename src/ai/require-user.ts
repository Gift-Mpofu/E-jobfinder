import { createClient as createAdminClient } from '@supabase/supabase-js';
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

export const WEEKLY_SCAN_LIMIT = 20;

/**
 * Counts one CV scan against the signed-in user's weekly allowance in the
 * database (see consume_scan in the migrations). Returns the new count, or
 * throws when the allowance is used up.
 */
export async function consumeScan(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('consume_scan');
  if (error) throw new Error(`Could not check your scan allowance: ${error.message}`);
  if (!data?.allowed) {
    throw new Error(`You've used all ${WEEKLY_SCAN_LIMIT} free scans this week. They reset on Monday.`);
  }
  return data.scans_used as number;
}

/** Gives back a scan whose AI call failed. Uses the service role, since users cannot edit their own counter. */
export async function refundScan(userId: string) {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await admin.from('profiles').select('scans_used').eq('id', userId).single();
  if (data?.scans_used) {
    await admin.from('profiles').update({ scans_used: data.scans_used - 1 }).eq('id', userId);
  }
}
