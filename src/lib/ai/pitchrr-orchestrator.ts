import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool, zodSchema } from 'ai';
import { z } from 'zod';
import { dbConnect, dbConnectShared } from '@/lib/db';
import { getStartupProfileModel } from '@/models/StartupProfile';
import Opportunity from '@/models/Opportunity';
import { buildSystemPrompt, AIMode } from '@/lib/ai/prompts';

interface OrchestratorInput {
  opportunityId?: string;
  mode: AIMode;
  messages: { role: 'user' | 'assistant'; content: string }[];
  draftingContext?: {
    question: string;
    wordLimit: number | null;
    questionIndex?: number;
  };
}

export async function runPitchrrOrchestrator(input: OrchestratorInput) {
  await dbConnect();
  const sharedConn = await dbConnectShared();
  const StartupProfile = getStartupProfileModel(sharedConn);

  const [profile, opportunity] = await Promise.all([
    StartupProfile.findOne().lean(),
    input.opportunityId ? Opportunity.findById(input.opportunityId).lean() : null,
  ]);

  let systemPrompt = buildSystemPrompt({
    mode: input.mode,
    profile: profile as any,
    opportunity: opportunity as any,
  });

  if (input.mode === 'drafting' && input.draftingContext) {
    const existingDraft = input.draftingContext.questionIndex !== undefined
      ? (opportunity as any)?.draftedAnswers?.find((a: any) => a.questionIndex === input.draftingContext!.questionIndex)
      : null;

    systemPrompt += `\n\n--- DRAFTING TASK ---
Question: ${input.draftingContext.question}
Word Limit: ${input.draftingContext.wordLimit ? `${input.draftingContext.wordLimit} words` : 'None'}
${existingDraft ? `\nCurrently Saved Draft:\n${existingDraft.content}\n` : ''}
Draft the perfect response for this specific question. Explain your framing strategy afterwards.
When the user asks you to "save", "populate", "update the field", "use that", or similar — call the save_draft tool with the clean answer text only (no strategy section, no headings).`;
  }

  let tools: any = {};
  if (input.mode === 'drafting' && input.opportunityId && input.draftingContext?.questionIndex !== undefined) {
    const qIdx = input.draftingContext.questionIndex;
    tools = {
      save_draft: tool({
        description: 'Saves or replaces the draft for this specific application field. Call this when the user asks to save, populate, update, or finalize the field content. Provide only the clean answer text — no headings, no strategy section.',
        inputSchema: zodSchema(z.object({
          content: z.string().describe('The clean draft answer text to save to the field'),
        })),
        execute: async ({ content }) => {
          const opp = await Opportunity.findById(input.opportunityId);
          if (!opp) return 'Opportunity not found.';
          const existingIdx = opp.draftedAnswers.findIndex((a: any) => a.questionIndex === qIdx);
          if (existingIdx >= 0) {
            opp.draftedAnswers[existingIdx].content = content;
            opp.draftedAnswers[existingIdx].status = 'draft';
          } else {
            opp.draftedAnswers.push({ questionIndex: qIdx, content, status: 'draft', updatedAt: new Date() });
          }
          await opp.save();
          return `Field saved.`;
        }
      })
    };
  } else if (input.mode === 'profile') {
    systemPrompt += `\n\n--- GOD MODE: PROFILE MUTATOR ---
You have the ability to permanently edit the user's Startup Profile and Founder Profile in the database.
If the user tells you that their data is messy, duplicate, or incorrect, you MUST use your tools to rewrite and clean up their profile.
For example, if they say "remove duplicates from my team", use the update_team tool with a consolidated list.
If they say "update my one liner", use update_startup_field.
Always confirm to the user what you changed after using a tool.`;

    // profile tools below
    tools = {
      update_team: tool({
        description: 'Overwrites the Founder & Team array. Use this to remove duplicates and consolidate team members.',
        inputSchema: zodSchema(z.object({
          team: z.array(z.object({
            name: z.string(),
            role: z.string().describe('e.g., Founder, CTO, Technical Contributor'),
            background: z.string().describe('Short background info'),
            source: z.string().default('pitchrr_ai'),
          }))
        })),
        execute: async ({ team }) => {
          const doc = await StartupProfile.findOne();
          if (doc) {
            doc.team = team.map((t: any) => ({ ...t, addedAt: new Date() }));
            await doc.save();
            return `Successfully updated team to have ${team.length} members.`;
          }
          return 'Profile not found.';
        }
      }),
      update_startup_field: tool({
        description: 'Updates a specific string field in the startup profile (e.g., oneLiner, problem, solution, businessModel, marketSize, uniqueness, mission).',
        inputSchema: zodSchema(z.object({
          field: z.enum(['oneLiner', 'problem', 'solution', 'businessModel', 'marketSize', 'uniqueness', 'mission']),
          value: z.string()
        })),
        execute: async ({ field, value }) => {
          const doc = await StartupProfile.findOne();
          if (doc) {
            doc[field] = { value, source: 'pitchrr_ai', updatedAt: new Date() };
            await doc.save();
            return `Successfully updated ${field}.`;
          }
          return 'Profile not found.';
        }
      }),
      update_traction: tool({
        description: 'Overwrites the Traction array. Use this to clean up messy or duplicate traction signals.',
        inputSchema: zodSchema(z.object({
          traction: z.array(z.object({
            description: z.string(),
            type: z.enum(['revenue', 'users', 'partnerships', 'wordOfMouth', 'milestone', 'other']),
            source: z.string().default('pitchrr_ai'),
          }))
        })),
        execute: async ({ traction }) => {
          const doc = await StartupProfile.findOne();
          if (doc) {
            doc.traction = traction.map((t: any) => ({ ...t, addedAt: new Date() }));
            await doc.save();
            return `Successfully updated traction to have ${traction.length} signals.`;
          }
          return 'Profile not found.';
        }
      })
    };
  }

  const getContent = (m: any): string => {
    if (m.content) return m.content;
    if (Array.isArray(m.parts)) {
      return (m.parts as any[])
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text as string)
        .join('');
    }
    return '';
  };

  const aiMessages = input.messages
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: getContent(m) }))
    .filter((m: any) => m.content.trim() !== '');

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages: aiMessages,
    ...(Object.keys(tools).length > 0 ? { tools } : {}),
    maxSteps: input.mode === 'profile' ? 5 : 1,
    maxOutputTokens: 4096,
    temperature: 0.7,
  });

  return result;
}
