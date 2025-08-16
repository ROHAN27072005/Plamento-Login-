
'use server';
/**
 * @fileOverview A flow for generating a secure 6-digit password reset code.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ResetCodeInputSchema = z.object({});
export type ResetCodeInput = z.infer<typeof ResetCodeInputSchema>;

const ResetCodeOutputSchema = z.string().length(6).regex(/^\d+$/);
export type ResetCodeOutput = z.infer<typeof ResetCodeOutputSchema>;


export async function generateResetCode(): Promise<ResetCodeOutput> {
  return generateResetCodeFlow({});
}

const prompt = ai.definePrompt({
  name: 'passwordResetCodePrompt',
  input: { schema: ResetCodeInputSchema },
  output: { schema: ResetCodeOutputSchema },
  prompt: `Generate a secure, random 6-digit numerical code for a password reset. The code must be exactly 6 digits long and contain only numbers.`,
});

const generateResetCodeFlow = ai.defineFlow(
  {
    name: 'generateResetCodeFlow',
    inputSchema: ResetCodeInputSchema,
    outputSchema: ResetCodeOutputSchema,
  },
  async () => {
    const { output } = await prompt({});
    return output!;
  }
);
