import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject, streamText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodSchema } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type StreamTextParams = Parameters<typeof streamText>[0];

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
    case 'ZodArray': return `[${zodToTemplate(def.type, depth + 1)}]`;
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
    return `\n\nSTRICT OUTPUT REQUIREMENT: Return ONLY a single JSON object (NOT an array). Use EXACTLY the camelCase key names below — no alternatives, no snake_case. String fields must be strings, not arrays.\n\n${template}`;
  } catch { return ''; }
}

// snake_case → camelCase
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

// Split camelCase into words for fuzzy matching
function camelWords(s: string): string[] {
  return s.replace(/([A-Z])/g, ' $1').toLowerCase().split(/\s+/).filter(w => w.length > 2);
}

// For any schema key still missing, find the Gemini key that shares the most words
function getShape(schema: ZodSchema<any>): Record<string, any> | null {
  try {
    const def = (schema as any)._def;
    if (!def) return null;
    if (def.typeName !== 'ZodObject') return null;
    // shape can be a function (Zod v3) or a plain object (some builds)
    const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
    return shape && typeof shape === 'object' ? shape : null;
  } catch { return null; }
}

function fuzzyRemap(obj: Record<string, any>, schema: ZodSchema<any>): Record<string, any> {
  const shape = getShape(schema);
  console.warn('[fuzzyRemap] schemaKeys:', shape ? Object.keys(shape) : 'NO SHAPE', '| geminiKeys:', Object.keys(obj));
  if (!shape) return obj;
  const result = { ...obj };
  const geminiKeys = Object.keys(obj);
  for (const schemaKey of Object.keys(shape)) {
    if (result[schemaKey] !== undefined) continue;
    const schemaWords = camelWords(schemaKey);
    let bestKey = '';
    let bestScore = 0;
    for (const gk of geminiKeys) {
      const gkWords = camelWords(gk);
      const score = schemaWords.filter(w => gkWords.some(gw => gw.includes(w) || w.includes(gw))).length;
      if (score > bestScore) { bestScore = score; bestKey = gk; }
    }
    console.warn('[fuzzyRemap]', schemaKey, '→', bestKey || 'NO MATCH', '(score', bestScore + ')');
    if (bestScore > 0 && bestKey) result[schemaKey] = result[bestKey];
  }
  return result;
}

function coerceToSchema(raw: any, schema: ZodSchema<any>): any {
  const obj = Array.isArray(raw) ? raw[0] : raw;
  let normalized = normalizeKeys(obj);
  normalized = fuzzyRemap(normalized, schema);
  // Coerce array → string for string fields
  const def = (schema as any)._def;
  if (def?.typeName === 'ZodObject') {
    const shape = def.shape?.();
    if (shape) {
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const fd = (fieldSchema as any)?._def;
        const isString = fd?.typeName === 'ZodString' ||
          (fd?.typeName === 'ZodNullable' && fd?.innerType?._def?.typeName === 'ZodString');
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
    // Put schema hint FIRST so Gemini sees it at highest priority
    const fullPrompt = hint
      ? `${hint}\n\n---\n\n${params.system ? params.system + '\n\n---\n\n' : ''}${params.prompt}`
      : (params.system ? `${params.system}\n\n---\n\n${params.prompt}` : params.prompt);
    const result = await geminiModel.generateContent(fullPrompt);
    const text = result.response.text();
    console.warn('[Gemini raw]', text.slice(0, 300));
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const raw = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    const coerced = coerceToSchema(raw, params.schema);
    return params.schema.parse(coerced);
  }
}

export function streamWithFallback(params: Omit<StreamTextParams, 'model'>): ReturnType<typeof streamText> {
  return streamText({ ...params, model: anthropic('claude-sonnet-4-6') } as StreamTextParams);
}
