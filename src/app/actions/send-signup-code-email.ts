
'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';

const SendEmailInputSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendSignupCodeEmail(input: SendEmailInput): Promise<{ success: boolean; error?: string }> {
    const parsed = SendEmailInputSchema.safeParse(input);

    if (!parsed.success) {
        return { success: false, error: 'Invalid input.' };
    }

    const { email, code } = parsed.data;

    const {
        EMAIL_SERVER_USER,
        EMAIL_SERVER_PASSWORD,
        EMAIL_FROM
    } = process.env;

    if (!EMAIL_SERVER_USER || !EMAIL_SERVER_PASSWORD || !EMAIL_FROM) {
        console.error('Missing email server environment variables.');
        return { success: false, error: 'Server configuration error.' };
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
        subject: 'Your Plamento Account Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to Plamento!</h2>
                <p>Hello,</p>
                <p>Thank you for signing up. Please use the 6-digit code below to verify your email address and activate your account.</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; text-align: center;">
                    ${code}
                </p>
                <p>This code will expire in 15 minutes.</p>
                <p>If you did not sign up for an account, please ignore this email.</p>
                <p>Thanks,<br/>The Plamento Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return { success: false, error: 'Failed to send verification email.' };
    }
}
