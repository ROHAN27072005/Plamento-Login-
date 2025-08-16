'use server';
/**
 * @fileOverview Implements a secure password reset code generation flow using GenAI.
 *
 * - generateSecurePasswordResetCode - Generates a secure 6-digit reset code.
 * - GenerateSecurePasswordResetCodeInput -  The input type.
 * - GenerateSecurePasswordResetCodeOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSecurePasswordResetCodeInputSchema = z.object({
  email: z.string().email().describe('The user email to send reset code to.'),
});
export type GenerateSecurePasswordResetCodeInput = z.infer<typeof GenerateSecurePasswordResetCodeInputSchema>;

const GenerateSecurePasswordResetCodeOutputSchema = z.object({
  resetCode: z.string().length(6).describe('A secure 6-digit reset code.'),
});
export type GenerateSecurePasswordResetCodeOutput = z.infer<typeof GenerateSecurePasswordResetCodeOutputSchema>;

export async function generateSecurePasswordResetCode(
  input: GenerateSecurePasswordResetCodeInput
): Promise<GenerateSecurePasswordResetCodeOutput> {
  return generateSecurePasswordResetCodeFlow(input);
}

const generateSecurePasswordResetCodePrompt = ai.definePrompt({
  name: 'generateSecurePasswordResetCodePrompt',
  input: {schema: GenerateSecurePasswordResetCodeInputSchema},
  output: {schema: GenerateSecurePasswordResetCodeOutputSchema},
  prompt: `You are a security expert who can generate a secure 6-digit reset code for the user's email {{{email}}}. The reset code should be a string of 6 digits.`,
});

const generateSecurePasswordResetCodeFlow = ai.defineFlow(
  {
    name: 'generateSecurePasswordResetCodeFlow',
    inputSchema: GenerateSecurePasswordResetCodeInputSchema,
    outputSchema: GenerateSecurePasswordResetCodeOutputSchema,
  },
  async input => {
    const {output} = await generateSecurePasswordResetCodePrompt(input);
    return output!;
  }
);
