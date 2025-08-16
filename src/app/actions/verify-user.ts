'use server';

import { supabaseServerClient } from '@/lib/supabase-server-client';
import { z } from 'zod';

const verifyUserInputSchema = z.object({
  email: z.string().email(),
});

export async function verifyUser(input: z.infer<typeof verifyUserInputSchema>) {
  const parsed = verifyUserInputSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input.' };
  }

  const { email } = parsed.data;

  const { data: { users }, error: listUsersError } = await supabaseServerClient.auth.admin.listUsers();
  
  if (listUsersError) {
    return { error: `Failed to verify user: ${listUsersError.message}` };
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    return { error: 'Email was not registered.' };
  }

  return { success: true, userId: user.id };
}
