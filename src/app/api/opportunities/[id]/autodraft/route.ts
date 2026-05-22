import { NextResponse } from 'next/server';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { maybeEnrichProfile } from '@/lib/ai/profile-enrichment';

export const maxDuration = 60; // Allow more time for batch drafting

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const [opportunity, profile] = await Promise.all([
      Opportunity.findById(id),
      StartupProfile.findOne().lean()
    ]);

    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!opportunity.scrapedQuestions || opportunity.scrapedQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions to draft' }, { status: 400 });
    }

    // Find missing drafts
    const missingIndices: number[] = [];
    for (let idx = 0; idx < opportunity.scrapedQuestions.length; idx++) {
      if (!opportunity.draftedAnswers?.some((a: any) => a.questionIndex === idx)) {
        missingIndices.push(idx);
      }
    }

    if (missingIndices.length === 0) {
      return NextResponse.json({ message: 'All questions drafted' });
    }

    const basePrompt = buildSystemPrompt({ mode: 'drafting', profile: profile as any, opportunity: opportunity as any });

    // We generate drafts sequentially to avoid extreme rate limits
    for (const idx of missingIndices) {
      const q = opportunity.scrapedQuestions[idx];
      
      const systemPrompt = `${basePrompt}

--- DRAFTING TASK ---
Question: ${q.question}
Word Limit: ${q.wordLimit ? `${q.wordLimit} words` : 'None'}

Output ONLY the final draft answer text. No headers, no "DRAFT" labels, no strategy explanations, no commentary. Just the ready-to-submit answer.`;

      const { text } = await generateText({
        model: anthropic('claude-sonnet-4-6'),
        system: systemPrompt,
        prompt: 'Please draft the best possible answer for this question using my profile context.',
        maxRetries: 2,
        temperature: 0.7,
      });

      opportunity.draftedAnswers.push({
        questionIndex: idx,
        content: text,
        status: 'draft',
      });

      // Save after each one just in case of timeout
      await opportunity.save();

      // Best-effort profile enrichment from this answer
      maybeEnrichProfile(q.question, text).catch(() => {});
    }

    return NextResponse.json({ success: true, count: missingIndices.length });
  } catch (error) {
    console.error('Batch draft error:', error);
    return NextResponse.json({ error: 'Batch draft failed' }, { status: 500 });
  }
}
