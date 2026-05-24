import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject, streamText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodSchema } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type StreamTextParams = Parameters<typeof streamText>[0];

function schemaHint(schema: ZodSchema<any>): string {
  try {
    const shape = (schema as any)._def?.shape?.();
    if (shape) {
      const keys = Object.keys(shape);
      return `\n\nReturn a JSON object with EXACTLY these keys: ${keys.map(k => `"${k}"`).join(', ')}. No extra keys, no wrapper object.`;
    }
    // Array schema
    const inner = (schema as any)._def?.type;
    if (inner) {
      const innerShape = inner._def?.shape?.();
      if (innerShape) {
        const keys = Object.keys(innerShape);
        return `\n\nReturn a JSON array of objects, each with EXACTLY these keys: ${keys.map(k => `"${k}"`).join(', ')}.`;
      }
    }
  } catch {}
  return '';
}

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
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
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
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json', temperature: params.temperature ?? 0.3 },
    });
    const hint = schemaHint(params.schema);
    const fullPrompt = params.system
      ? `${params.system}\n\n---\n\n${params.prompt}${hint}`
      : `${params.prompt}${hint}`;
    const result = await geminiModel.generateContent(fullPrompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    // Try direct parse, then try one level of unwrapping if the model wrapped the result
    const direct = params.schema.safeParse(parsed);
    if (direct.success) return direct.data;
    for (const key of Object.keys(parsed)) {
      const unwrapped = params.schema.safeParse(parsed[key]);
      if (unwrapped.success) return unwrapped.data;
    }
    return params.schema.parse(parsed); // throws with a real error if still wrong
  }
}

export function streamWithFallback(params: Omit<StreamTextParams, 'model'>): ReturnType<typeof streamText> {
  return streamText({ ...params, model: anthropic('claude-sonnet-4-6') } as StreamTextParams);
}
