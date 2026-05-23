import { generateObject } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from './prompts';
import { withFallback } from './models';
import { IStartupProfile } from '@/models/StartupProfile';
import { IOpportunity } from '@/models/Opportunity';

export const FitScoreSchema = z.object({
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

export type FitScoreResult = z.infer<typeof FitScoreSchema>;

export async function scoreOpportunityFit(profile: IStartupProfile, opportunity: IOpportunity): Promise<FitScoreResult> {
  const systemPrompt = buildSystemPrompt({ mode: 'analysis', profile, opportunity });

  const { object } = await withFallback(model => generateObject({
    model,
    system: systemPrompt,
    prompt: `Based on the provided Founder Profile and Opportunity Context, perform a deep analysis of the fit.
Score the fit from 0 to 100. Provide a breakdown of the score by categories (e.g., Traction, Problem/Solution fit, Stage alignment).
Identify strengths, weaknesses, and any missing information in the profile that would help make a better assessment or a stronger application.`,
    schema: FitScoreSchema,
  }));

  return object;
}
