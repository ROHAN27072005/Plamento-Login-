
'use server';

import { z } from 'zod';

const SendEmailInputSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendResetEmail(input: SendEmailInput): Promise<{ success: boolean; error?: string }> {
    const parsed = SendEmailInputSchema.safeParse(input);

    if (!parsed.success) {
        return { success: false, error: 'Invalid input.' };
    }

    const { email, code } = parsed.data;

    // TODO: Replace this with your actual email sending logic.
    // This is a placeholder and does not actually send an email.
    // You can use a service like Resend, SendGrid, or Nodemailer.
    // Example using Resend:
    /*
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        await resend.emails.send({
            from: 'contact.plamento@gmail.com',
            to: email,
            subject: 'Your Plamento Password Reset Code',
            html: `<p>Your password reset code is: <strong>${code}</strong></p>
                   <p>This code will expire in 15 minutes.</p>`
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error: 'Failed to send verification email.' };
    }
    */
    
    // For now, we'll just log it to the server console for debugging.
    console.log(`Password reset code for ${email}: ${code}`);
    
    // Simulate a successful email send for the prototype.
    return { success: true };
}
