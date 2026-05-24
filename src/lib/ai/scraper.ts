import { z } from 'zod';
import { buildSystemPrompt } from './prompts';
import { generateObjectWithFallback } from './models';

export const OpportunityIntakeSchema = z.object({
  programmeName: z.string(),
  organisation: z.string(),
  deadline: z.string().nullable(),
  prizeAmount: z.string(),
  eligibilityCriteria: z.string(),
  evaluationCriteria: z.string(),
  scrapedQuestions: z.array(
    z.object({
      question: z.string(),
      wordLimit: z.number().nullable(),
      section: z.string(),
    })
  ),
});

export type OpportunityIntakeResult = z.infer<typeof OpportunityIntakeSchema>;

export async function scrapeAndExtractOpportunity(url: string, rawText: string, persona: 'startup' | 'career' = 'startup'): Promise<OpportunityIntakeResult> {
  const systemPrompt = buildSystemPrompt({ mode: 'intake', persona });

  const object = await generateObjectWithFallback({
    system: systemPrompt,
    prompt: `Extract the opportunity details from the following raw text scraped from ${url}:\n\n${rawText}`,
    schema: OpportunityIntakeSchema,
  });

  return object;
}

export const QuestionExtractionSchema = z.object({
  scrapedQuestions: z.array(
    z.object({
      question: z.string(),
      wordLimit: z.number().nullable(),
      section: z.string().default('General'),
    })
  ),
});

export async function extractQuestionsFromText(rawText: string) {
  const systemPrompt = buildSystemPrompt({ mode: 'extract_questions' });

  const object = await generateObjectWithFallback({
    system: systemPrompt,
    prompt: `Extract the questions from this text:\n\n${rawText}`,
    schema: QuestionExtractionSchema,
  });

  return object.scrapedQuestions;
}
