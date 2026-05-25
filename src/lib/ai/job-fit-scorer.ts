import { z } from 'zod';
import { buildCandidateSystemPrompt } from './job-prompts';
import { generateObjectWithFallback } from './models';
import { ICandidateProfile } from '@/models/CandidateProfile';
import { IJobApplication } from '@/models/JobApplication';

export const JobFitScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  breakdown: z.array(
    z.object({
      category: z.string(),
      score: z.number(),
      maxScore: z.number(),
      explanation: z.string(),
    })
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingInformation: z.array(z.string()),
});

export type JobFitScoreResult = z.infer<typeof JobFitScoreSchema>;

export async function scoreJobFit(
  profile: ICandidateProfile,
  job: IJobApplication
): Promise<JobFitScoreResult> {
  const systemPrompt = buildCandidateSystemPrompt({ mode: 'analysis', profile, job });

  const object = await generateObjectWithFallback({
    system: systemPrompt,
    prompt: `Based on the provided Candidate Profile and Job Context, perform a deep analysis of the fit.
Score the fit from 0 to 100. Provide a breakdown of the score by these categories: Skills Match, Experience Level, Industry Fit, Location and Logistics, Culture Alignment.
Identify genuine strengths, real weaknesses (do not soften gaps), and any missing information in the profile that would help make a better assessment.`,
    schema: JobFitScoreSchema,
  });

  return object;
}
