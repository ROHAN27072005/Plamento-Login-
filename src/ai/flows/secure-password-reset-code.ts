
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

const generateResetCodeFlow = ai.defineFlow(
  {
    name: 'generateResetCodeFlow',
    inputSchema: ResetCodeInputSchema,
    outputSchema: ResetCodeOutputSchema,
  },
  async () => {
    // Generate a 6-digit code programmatically.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }
);
