import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { streamWithFallback } from '@/lib/ai/models';

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id } = await params;
    const { questionIndex } = await req.json();

    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const [opportunity, profile] = await Promise.all([
      Opportunity.findOne({ _id: id, userId: session.user.id }).lean(),
      StartupProfile.findOne({ userId: session.user.id }).lean(),
    ]);

    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const q = (opportunity as any).scrapedQuestions?.[questionIndex];
    if (!q) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const systemPrompt = `${buildSystemPrompt({ mode: 'drafting', profile: profile as any, opportunity: opportunity as any , persona: session.user.persona as any })}

--- STREAM OVERRIDE ---
Ignore the STRATEGY instruction above. Output ONLY the final draft answer text. No headers, no "DRAFT" label, no strategy section, no commentary. Just the answer as it would appear in the submission form.`;

    const lengthHint = q.wordLimit
      ? `Word limit: ${q.wordLimit} words — stay within it, aim for 85–95% of the limit.`
      : `No word limit stated — infer the correct length from the question type. Personal/factual fields (name, email, phone, age, date, ID): one value only. Short-answer fields (stage, industry, availability): one phrase or sentence. Only write multiple paragraphs if the question explicitly asks for description or explanation.`;

    const result = streamWithFallback({
      system: systemPrompt,
      prompt: `Question: ${q.question}\n${lengthHint}\n\nOutput ONLY the answer text. No headers, no strategy.`,
      temperature: 0.7,
      maxOutputTokens: 1024,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Draft stream error:', error);
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
