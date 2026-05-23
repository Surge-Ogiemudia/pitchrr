import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject, streamText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodSchema } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

type StreamTextParams = Parameters<typeof streamText>[0];

export async function generateTextWithFallback(params: {
  system?: string;
  prompt: string;
  temperature?: number;
  maxRetries?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: params.system,
      prompt: params.prompt,
      temperature: params.temperature,
      maxRetries: params.maxRetries,
      maxOutputTokens: params.maxOutputTokens,
    });
    return text;
  } catch (err) {
    console.warn('[AI] Claude failed, retrying with Gemini:', err instanceof Error ? err.message : err);
    const geminiModel = genAI.getGenerativeModel({ model: 'gemma-4-26b-a4b-it' });
    const fullPrompt = params.system ? `${params.system}\n\n---\n\n${params.prompt}` : params.prompt;
    const result = await geminiModel.generateContent(fullPrompt);
    return result.response.text();
  }
}

export async function generateObjectWithFallback<T>(params: {
  system?: string;
  prompt: string;
  schema: ZodSchema<T>;
  temperature?: number;
  maxRetries?: number;
}): Promise<T> {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      system: params.system,
      prompt: params.prompt,
      schema: params.schema,
      temperature: params.temperature,
      maxRetries: params.maxRetries,
    });
    return object;
  } catch (err) {
    console.warn('[AI] Claude failed, retrying with Gemini:', err instanceof Error ? err.message : err);
    const geminiModel = genAI.getGenerativeModel({
      model: 'gemma-4-26b-a4b-it',
      generationConfig: { responseMimeType: 'application/json', temperature: params.temperature ?? 0.3 },
    });
    const fullPrompt = params.system ? `${params.system}\n\n---\n\n${params.prompt}` : params.prompt;
    const result = await geminiModel.generateContent(fullPrompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return params.schema.parse(parsed);
  }
}

export function streamWithFallback(params: Omit<StreamTextParams, 'model'>): ReturnType<typeof streamText> {
  return streamText({ ...params, model: anthropic('claude-sonnet-4-6') } as StreamTextParams);
}
