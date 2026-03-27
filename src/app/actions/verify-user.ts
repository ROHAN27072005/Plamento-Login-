
'use server';

import { supabaseServerClient } from '@/lib/supabase-server-client';

export async function verifyUser(email: string): Promise<{ userId?: string; error?: string }> {
  if (!email) {
    return { error: 'Email is required.' };
  }

  const { data: users, error } = await supabaseServerClient.auth.admin.listUsers({ email });

  if (error) {
    console.error('Error verifying user:', error);
    return { error: 'An unexpected error occurred.' };
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    return { error: 'Email was not registered.' };
  }

  return { userId: user.id };
}
