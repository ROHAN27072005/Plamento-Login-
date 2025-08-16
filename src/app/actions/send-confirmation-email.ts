
'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';

const SendConfirmationEmailInputSchema = z.object({
    email: z.string().email(),
    token: z.string(),
});

type SendConfirmationEmailInput = z.infer<typeof SendConfirmationEmailInputSchema>;

export async function sendConfirmationEmail(input: SendConfirmationEmailInput): Promise<{ success: boolean; error?: string }> {
    const parsed = SendConfirmationEmailInputSchema.safeParse(input);

    if (!parsed.success) {
        return { success: false, error: 'Invalid input.' };
    }

    const { email, token } = parsed.data;

    const {
        EMAIL_SERVER_USER,
        EMAIL_SERVER_PASSWORD,
        EMAIL_FROM,
        NEXT_PUBLIC_SITE_URL
    } = process.env;

    if (!EMAIL_SERVER_USER || !EMAIL_SERVER_PASSWORD || !EMAIL_FROM || !NEXT_PUBLIC_SITE_URL) {
        console.error('Missing email server or site URL environment variables.');
        return { success: false, error: 'Server configuration error.' };
    }
    
    // This is a simplified confirmation link for demonstration.
    // In a real app, you would likely use the secure flow provided by Supabase Auth.
    const confirmationLink = `${NEXT_PUBLIC_SITE_URL}/api/auth/callback?token=${token}&type=signup`;

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
        subject: 'Confirm Your Plamento Account',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to Plamento!</h2>
                <p>Hello,</p>
                <p>Thank you for signing up. Please click the button below to confirm your email address and activate your account.</p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="${confirmationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Confirm Your Email
                    </a>
                </p>
                <p>If you did not sign up for an account, please ignore this email.</p>
                <p>Thanks,<br/>The Plamento Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
        return { success: false, error: 'Failed to send confirmation email.' };
    }
}
