import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText, generateObject, streamText } from 'ai';

export const primaryModel = () => anthropic('claude-sonnet-4-6');
export const fallbackModel = () => google('gemma-4-26b-a4b-it');

type GenerateTextParams = Parameters<typeof generateText>[0];
type GenerateObjectParams = Parameters<typeof generateObject>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

export async function withFallback<T>(
  fn: (model: ReturnType<typeof primaryModel>) => Promise<T>
): Promise<T> {
  try {
    return await fn(primaryModel());
  } catch (err) {
    console.warn('[AI] Claude failed, retrying with Gemini:', err instanceof Error ? err.message : err);
    return await fn(fallbackModel() as any);
  }
}

export function streamWithFallback(params: Omit<StreamTextParams, 'model'>): ReturnType<typeof streamText> {
  try {
    return streamText({ ...params, model: primaryModel() } as StreamTextParams);
  } catch (err) {
    console.warn('[AI] Claude stream failed, retrying with Gemini:', err instanceof Error ? err.message : err);
    return streamText({ ...params, model: fallbackModel() as any } as StreamTextParams);
  }
}
