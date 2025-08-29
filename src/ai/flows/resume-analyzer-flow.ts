
'use server';
/**
 * @fileOverview A resume analysis AI agent.
 * This flow will analyze a user's resume against a specified job description
 * to provide feedback on missing keywords, skill gaps, and overall suitability.
 * 
 * - analyzeResume - A function that handles the resume analysis process.
 * - AnalyzeResumeInput - The input type for the analyzeResume function.
 * - AnalyzeResumeOutput - The return type for the analyzeResume function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeResumeInputSchema = z.object({
  resumeText: z.string().describe("The full text content of the user's resume."),
  jobDescription: z.string().describe("The job description the user is targeting."),
});
export type AnalyzeResumeInput = z.infer<typeof AnalyzeResumeInputSchema>;

const AnalyzeResumeOutputSchema = z.object({
  score: z.number().describe("A score from 0 to 100 representing the resume's match to the job description."),
  summary: z.string().describe("A brief summary of the analysis, highlighting strengths and key weaknesses."),
  missingSkills: z.array(z.string()).describe("A list of key skills or qualifications mentioned in the job description but missing from the resume."),
  suggestions: z.array(z.string()).describe("Actionable suggestions for improving the resume to better match the job description."),
});
export type AnalyzeResumeOutput = z.infer<typeof AnalyzeResumeOutputSchema>;


export async function analyzeResume(input: AnalyzeResumeInput): Promise<AnalyzeResumeOutput> {
  return resumeAnalysisFlow(input);
}

const resumeAnalysisFlow = ai.defineFlow(
  {
    name: 'resumeAnalysisFlow',
    inputSchema: AnalyzeResumeInputSchema,
    outputSchema: AnalyzeResumeOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
        name: 'resumeAnalysisPrompt',
        input: { schema: AnalyzeResumeInputSchema },
        output: { schema: AnalyzeResumeOutputSchema },
        prompt: `You are an expert career coach and professional resume analyst. Your task is to analyze the provided resume text against the given job description and provide a detailed evaluation.

        Job Description:
        {{{jobDescription}}}
        
        Resume Text:
        {{{resumeText}}}

        Based on your analysis, please perform the following actions:
        1.  Provide a score from 0 to 100 representing how well the resume matches the job description. A higher score indicates a better match.
        2.  Write a brief summary of the analysis, highlighting the candidate's strengths and their most significant weaknesses regarding this specific job.
        3.  Identify key skills, technologies, or qualifications that are explicitly mentioned in the job description but are missing from the resume. List them clearly.
        4.  Provide actionable, specific suggestions for how the user can improve their resume to be a stronger candidate for this role. For example, instead of "add skills", suggest "Incorporate terms like 'agile methodologies' and 'JIRA' which are mentioned in the job description."
        `,
    });
    
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The resume analysis flow failed to produce an output.");
    }
    return output;
  }
);
