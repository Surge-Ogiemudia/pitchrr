import { z } from 'zod';
import { buildCandidateSystemPrompt } from './job-prompts';
import { generateObjectWithFallback } from './models';

export const JobIntakeSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  deadline: z.string().nullable(),
  salaryRange: z.string(),
  location: z.string(),
  employmentType: z.string(),
  department: z.string(),
  requiredQualifications: z.string(),
  preferredQualifications: z.string(),
  responsibilities: z.string(),
  applicationPortalUrl: z.string().nullable(),
  applicationQuestions: z.array(
    z.object({
      question: z.string(),
      wordLimit: z.number().nullable(),
      section: z.string(),
    })
  ),
});

export type JobIntakeResult = z.infer<typeof JobIntakeSchema>;

export async function scrapeAndExtractJob(url: string, rawText: string): Promise<JobIntakeResult> {
  const systemPrompt = buildCandidateSystemPrompt({ mode: 'intake' });

  const object = await generateObjectWithFallback({
    system: systemPrompt,
    prompt: `Extract the job details from the following raw text scraped from ${url}:\n\n${rawText}`,
    schema: JobIntakeSchema,
  });

  return object;
}

export const JobQuestionExtractionSchema = z.object({
  applicationQuestions: z.array(
    z.object({
      question: z.string(),
      wordLimit: z.number().nullable(),
      section: z.string().default('General'),
    })
  ),
});

export async function extractJobQuestionsFromText(rawText: string) {
  const systemPrompt = buildCandidateSystemPrompt({ mode: 'extract_questions' });

  const object = await generateObjectWithFallback({
    system: systemPrompt,
    prompt: `Extract the application questions from this job posting text:\n\n${rawText}`,
    schema: JobQuestionExtractionSchema,
  });

  return object.applicationQuestions;
}
