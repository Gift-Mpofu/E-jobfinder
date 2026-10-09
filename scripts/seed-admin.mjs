// Creates (or updates) a test admin and, optionally, a normal test user.
// Credentials come from .env.local, never from source:
//   ADMIN_EMAIL, ADMIN_PASSWORD            -> account with profiles.role = 'admin'
//   TEST_USER_EMAIL, TEST_USER_PASSWORD    -> optional plain user
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
//
// Usage: npm run seed:admin
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || serviceKey.startsWith('YOUR_')) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and a real SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (found || data.users.length < 1000) return found ?? null;
  }
}

async function upsertAccount(email, password, role) {
  let user = await findUserByEmail(email);
  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email, role, status: 'active' }, { onConflict: 'id' });
  if (error) throw error;

  console.log(`${role === 'admin' ? 'Admin' : 'User'} ready: ${email}`);
}

const { ADMIN_EMAIL, ADMIN_PASSWORD, TEST_USER_EMAIL, TEST_USER_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local.');
  process.exit(1);
}

try {
  await upsertAccount(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  if (TEST_USER_EMAIL && TEST_USER_PASSWORD) {
    await upsertAccount(TEST_USER_EMAIL, TEST_USER_PASSWORD, 'user');
  }
} catch (err) {
  console.error('Seeding failed:', err.message || err);
  process.exit(1);
}
