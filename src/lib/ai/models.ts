import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject, streamText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodSchema } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type StreamTextParams = Parameters<typeof streamText>[0];

// Build a template string from a Zod schema so Gemini knows exact structure
function zodToTemplate(schema: any, depth = 0): string {
  const def = schema?._def;
  if (!def) return '"<value>"';
  switch (def.typeName) {
    case 'ZodString': return '"<string>"';
    case 'ZodNumber': return '<number>';
    case 'ZodBoolean': return '<boolean>';
    case 'ZodNull': return 'null';
    case 'ZodNullable':
    case 'ZodOptional': return zodToTemplate(def.innerType, depth);
    case 'ZodEnum': return `"${def.values[0]}"`;
    case 'ZodArray': {
      const inner = zodToTemplate(def.type, depth + 1);
      return `[${inner}]`;
    }
    case 'ZodObject': {
      try {
        const shape = def.shape();
        const pad = '  '.repeat(depth + 1);
        const fields = Object.entries(shape)
          .map(([k, v]) => `${pad}"${k}": ${zodToTemplate(v as any, depth + 1)}`)
          .join(',\n');
        return `{\n${fields}\n${'  '.repeat(depth)}}`;
      } catch { return '{}'; }
    }
    default: return '"<value>"';
  }
}

function schemaHint(schema: ZodSchema<any>): string {
  try {
    const template = zodToTemplate(schema);
    return `\n\nCRITICAL: Return ONLY a single JSON object (NOT wrapped in an array). Use EXACTLY the camelCase key names shown below. String fields must be strings — if you would return an array, join it into one string instead.\n\n${template}`;
  } catch {
    return '';
  }
}

// Normalize Gemini's response: unwrap array, convert snake_case → camelCase, join array→string where needed
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [snakeToCamel(k), normalizeKeys(v)])
    );
  }
  return obj;
}

function coerceToSchema(parsed: any, schema: ZodSchema<any>): any {
  // Unwrap array wrapper
  const obj = Array.isArray(parsed) ? parsed[0] : parsed;
  // Normalize snake_case keys
  const normalized = normalizeKeys(obj);
  // Coerce array values to string for string fields
  const def = (schema as any)._def;
  if (def?.typeName === 'ZodObject') {
    const shape = def.shape?.();
    if (shape) {
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const fieldDef = (fieldSchema as any)?._def;
        const isString = fieldDef?.typeName === 'ZodString' ||
          (fieldDef?.typeName === 'ZodNullable' && fieldDef?.innerType?._def?.typeName === 'ZodString');
        if (isString && Array.isArray(normalized[key])) {
          normalized[key] = (normalized[key] as any[]).join('. ');
        }
      }
    }
  }
  return normalized;
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
    const raw = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    const coerced = coerceToSchema(raw, params.schema);
    return params.schema.parse(coerced);
  }
}

export function streamWithFallback(params: Omit<StreamTextParams, 'model'>): ReturnType<typeof streamText> {
  return streamText({ ...params, model: anthropic('claude-sonnet-4-6') } as StreamTextParams);
}
