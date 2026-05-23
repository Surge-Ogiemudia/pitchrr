import { streamText, tool, zodSchema } from 'ai';
import { streamWithFallback } from './models';
import { z } from 'zod';
import { dbConnect, dbConnectShared } from '@/lib/db';
import { getStartupProfileModel, TRACKED_PROFILE_FIELDS } from '@/models/StartupProfile';
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
When the user asks you to "save", "populate", "update the field", "use that", or similar — call the save_draft tool with the clean answer text only (no strategy section, no headings).
If the question asks for factual info (email, phone, name, startup name, website, location, stage, industry) — ALSO call update_profile_field to store it in the master profile.`;
  }

  // Shared profile field update tool — used in both profile and drafting modes
  const updateProfileFieldTool = tool({
    description: `Updates ANY field in the master founder or startup profile. Use this for:
- Founder fields: founderName, founderEmail, founderPhone, founderLocation, founderLinkedIn, founderBio
- Startup fields: startupName, website, stage, industry, oneLiner, problem, solution, businessModel, marketSize, uniqueness, mission, useOfFunds
- Any custom fact: use a descriptive key (e.g. "awards", "incorporation_date", "co_founder_email")
IMPORTANT: Call this immediately whenever the founder shares ANY personal or business information.`,
    inputSchema: zodSchema(z.object({
      field: z.string().describe('The profile field name to update'),
      value: z.string().describe('The new value'),
    })),
    execute: async ({ field, value }) => {
      const doc = await StartupProfile.findOne();
      if (!doc) return 'Profile not found.';

      if (TRACKED_PROFILE_FIELDS.has(field)) {
        (doc as any)[field] = { value, source: 'pitchrr_ai', updatedAt: new Date() };
      } else {
        const existingIdx = (doc.dynamicFields as any[]).findIndex((f: any) => f.key === field);
        if (existingIdx >= 0) {
          (doc.dynamicFields as any[])[existingIdx].value = value;
          (doc.dynamicFields as any[])[existingIdx].source = 'pitchrr_ai';
        } else {
          (doc.dynamicFields as any[]).push({ key: field, value, source: 'pitchrr_ai', confidence: 1, addedAt: new Date() });
        }
      }
      await doc.save();
      return `Saved: ${field} = "${value}"`;
    }
  });

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
          const existingIdx = (opp.draftedAnswers as any[]).findIndex((a: any) => a.questionIndex === qIdx);
          if (existingIdx >= 0) {
            (opp.draftedAnswers as any[])[existingIdx].content = content;
            (opp.draftedAnswers as any[])[existingIdx].status = 'draft';
          } else {
            (opp.draftedAnswers as any[]).push({ questionIndex: qIdx, content, status: 'draft', updatedAt: new Date() });
          }
          await opp.save();
          return 'Field saved.';
        }
      }),
      update_profile_field: updateProfileFieldTool,
    };
  } else if (input.mode === 'profile') {
    tools = {
      update_profile_field: updateProfileFieldTool,
      update_team: tool({
        description: 'Overwrites the entire Founder & Team array. Use this to add, remove, or consolidate team members. Each member needs name, role, and background.',
        inputSchema: zodSchema(z.object({
          team: z.array(z.object({
            name: z.string(),
            role: z.string().describe('e.g., Founder, CTO, Technical Contributor'),
            background: z.string().describe('Short background info'),
          }))
        })),
        execute: async ({ team }) => {
          const doc = await StartupProfile.findOne();
          if (!doc) return 'Profile not found.';
          (doc as any).team = team.map((t: any) => ({ ...t, source: 'pitchrr_ai', addedAt: new Date() }));
          await doc.save();
          return `Team updated: ${team.length} member(s) saved.`;
        }
      }),
      update_traction: tool({
        description: 'Overwrites the Traction array. Use this to clean up, add, or remove traction signals.',
        inputSchema: zodSchema(z.object({
          traction: z.array(z.object({
            description: z.string(),
            type: z.enum(['revenue', 'users', 'partnerships', 'wordOfMouth', 'milestone', 'other']),
          }))
        })),
        execute: async ({ traction }) => {
          const doc = await StartupProfile.findOne();
          if (!doc) return 'Profile not found.';
          (doc as any).traction = traction.map((t: any) => ({ ...t, source: 'pitchrr_ai', addedAt: new Date() }));
          await doc.save();
          return `Traction updated: ${traction.length} signal(s) saved.`;
        }
      }),
      save_story: tool({
        description: `Saves a personal story or anecdote to the founder's permanent profile. Call this whenever the founder shares a specific story — why they started, a human moment that proves the problem is real, a customer experience, a co-founder story, a turning point, or anything that explains who they are and why they are credible. These stories are used directly in application answers. Capture the story exactly as they told it — do not summarise or paraphrase.`,
        inputSchema: zodSchema(z.object({
          title: z.string().describe('Short title, e.g. "Why I Started" or "The Susan Moment"'),
          content: z.string().describe('The full story text as the founder shared it — verbatim where possible'),
          theme: z.enum(['origin', 'impact', 'credibility', 'customer', 'turning-point', 'team', 'other']).describe('What type of story this is'),
        })),
        execute: async ({ title, content, theme }) => {
          const doc = await StartupProfile.findOne();
          if (!doc) return 'Profile not found.';
          (doc as any).stories = [...((doc as any).stories || []), { title, content, theme, addedAt: new Date() }];
          await doc.save();
          return `Story saved: "${title}" (${theme})`;
        }
      }),
      delete_story: tool({
        description: 'Removes a story from the profile by its exact title. Use when the founder asks to remove or replace a story.',
        inputSchema: zodSchema(z.object({
          title: z.string().describe('The exact title of the story to delete'),
        })),
        execute: async ({ title }) => {
          const doc = await StartupProfile.findOne();
          if (!doc) return 'Profile not found.';
          (doc as any).stories = ((doc as any).stories || []).filter((s: any) => s.title !== title);
          await doc.save();
          return `Story removed: "${title}"`;
        }
      }),
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

  const result = streamWithFallback({
    system: systemPrompt,
    messages: aiMessages,
    ...(Object.keys(tools).length > 0 ? { tools } : {}),
    maxOutputTokens: 4096,
    temperature: 0.7,
  } as any);

  return result;
}
