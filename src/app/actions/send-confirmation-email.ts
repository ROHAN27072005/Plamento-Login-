
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
    
    // In a real app, you would construct a verification link that your app can handle.
    // The token from Supabase is a JWT that can be used to verify the user.
    // For simplicity, we are creating a placeholder link.
    const confirmationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?access_token=${token}&type=signup`;

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
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
                        <h1 style="color: #483D8B; font-size: 28px;">Welcome to Plamento!</h1>
                    </div>
                    <div style="padding: 20px 0;">
                        <p>Hello,</p>
                        <p>Thank you for signing up. Please click the button below to confirm your email address and activate your account.</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${confirmationLink}" style="background-color: #483D8B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                Confirm Your Email
                            </a>
                        </p>
                        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; font-size: 12px;">${confirmationLink}</p>
                        <p>If you did not sign up for an account, please ignore this email.</p>
                    </div>
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888;">
                        <p>Thanks,<br/>The Plamento Team</p>
                    </div>
                </div>
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

