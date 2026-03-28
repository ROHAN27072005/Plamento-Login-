import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseServiceRoleKey === 'placeholder') {
    console.warn('Warning: Missing dynamic Supabase URL or Service Role Key in environment.');
}

export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
