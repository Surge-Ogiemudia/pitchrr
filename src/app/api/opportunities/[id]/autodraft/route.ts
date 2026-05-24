import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { maybeEnrichProfile } from '@/lib/ai/profile-enrichment';
import { generateTextWithFallback } from '@/lib/ai/models';

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id } = await params;
    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const [opportunity, profile] = await Promise.all([
      Opportunity.findOne({ _id: id, userId: session.user.id }),
      StartupProfile.findOne({ userId: session.user.id }).lean()
    ]);

    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!opportunity.scrapedQuestions || opportunity.scrapedQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions to draft' }, { status: 400 });
    }

    // Find the first missing draft only — one per call to stay within timeout
    const missingIndices: number[] = [];
    for (let idx = 0; idx < opportunity.scrapedQuestions.length; idx++) {
      if (!opportunity.draftedAnswers?.some((a: any) => a.questionIndex === idx)) {
        missingIndices.push(idx);
      }
    }

    if (missingIndices.length === 0) {
      return NextResponse.json({ success: true, count: 0, remaining: 0 });
    }

    const idx = missingIndices[0];
    const q = opportunity.scrapedQuestions[idx];
    const basePrompt = buildSystemPrompt({ mode: 'drafting', profile: profile as any, opportunity: opportunity as any , persona: session.user.persona as any });

    const systemPrompt = `${basePrompt}

--- DRAFTING TASK ---
Question: ${q.question}
Word Limit: ${q.wordLimit ? `${q.wordLimit} words` : 'None'}

Output ONLY the final draft answer text. No headers, no "DRAFT" labels, no strategy explanations, no commentary. Just the ready-to-submit answer.
ABSOLUTE RULE: Never use the em dash character (—) anywhere. Use a comma, period, or short sentence break instead.`;

    const text = await generateTextWithFallback({
      system: systemPrompt,
      prompt: 'Please draft the best possible answer for this question using my profile context.',
      temperature: 0.7,
    });

    opportunity.draftedAnswers.push({ questionIndex: idx, content: text, status: 'draft' });
    await opportunity.save();

    maybeEnrichProfile(q.question, text).catch(() => {});

    const remaining = missingIndices.length - 1;
    return NextResponse.json({ success: true, count: 1, remaining });
  } catch (error) {
    console.error('Draft error:', error);
    return NextResponse.json({ error: 'Drafting failed' }, { status: 500 });
  }
}
