'use server';

import { supabaseServerClient } from '@/lib/supabase-server-client';
import { z } from 'zod';

const UpdatePasswordInputSchema = z.object({
    userId: z.string().uuid(),
    password: z.string(),
});

export async function updatePassword(input: z.infer<typeof UpdatePasswordInputSchema>) {
    const parsed = UpdatePasswordInputSchema.safeParse(input);

    if (!parsed.success) {
        return { error: 'Invalid input.' };
    }
    
    const { userId, password } = parsed.data;

    const { error: updateUserError } = await supabaseServerClient.auth.admin.updateUserById(
        userId,
        { password: password }
    );

    if (updateUserError) {
        return { error: `Failed to reset password: ${updateUserError.message}` };
    }

    // Clean up the used token
    const { error: deleteTokenError } = await supabaseServerClient
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', userId);

    if (deleteTokenError){
        // Log this error but don't block the user
        console.error('Failed to delete reset token:', deleteTokenError.message);
    }
    
    return { success: true };
}
