
'use server';

import { supabaseServerClient } from '@/lib/supabase-server-client';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const ConfirmSignupInputSchema = z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
});

type ConfirmSignupInput = z.infer<typeof ConfirmSignupInputSchema>;

async function sendWelcomeEmail(email: string): Promise<{ success: boolean; error?: string }> {
     const {
        EMAIL_SERVER_USER,
        EMAIL_SERVER_PASSWORD,
        EMAIL_FROM
    } = process.env;

    if (!EMAIL_SERVER_USER || !EMAIL_SERVER_PASSWORD || !EMAIL_FROM) {
        console.error('Missing email server environment variables for welcome email.');
        // Don't block user flow if welcome email fails
        return { success: false, error: 'Server configuration error for welcome email.' };
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_SERVER_USER,
            pass: EMAIL_SERVER_PASSWORD,
        },
    });
    
    const mailOptions = {
        from: `Plamento <${EMAIL_FROM}>`,
        to: email,
        subject: 'Welcome to Plamento!',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Welcome aboard!</h2>
                <p>Hello,</p>
                <p>Thank you for confirming your account. We're thrilled to have you with us.</p>
                <p>You can now sign in to your account and start exploring.</p>
                <p>Thanks,<br/>The Plamento Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error: 'Failed to send welcome email.' };
    }
}


export async function confirmSignup(input: ConfirmSignupInput) {
    const parsed = ConfirmSignupInputSchema.safeParse(input);
    if (!parsed.success) {
        return { error: 'Invalid input.' };
    }
    
    const { userId, email } = parsed.data;

    // Mark the user's email as confirmed in Supabase
    const { error: updateUserError } = await supabaseServerClient.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
    );

    if (updateUserError) {
        return { error: `Failed to confirm account: ${updateUserError.message}` };
    }

    // Clean up the used token
    const { error: deleteTokenError } = await supabaseServerClient
        .from('signup_verification_tokens')
        .delete()
        .eq('user_id', userId);

    if (deleteTokenError){
        // Log this error but don't block the user
        console.error('Failed to delete signup token:', deleteTokenError.message);
    }

    // Send a welcome email (optional, can be commented out)
    await sendWelcomeEmail(email);
    
    return { success: true };
}
