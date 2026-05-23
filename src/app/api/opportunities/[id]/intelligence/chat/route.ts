import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { dbConnect, dbConnectShared } from '@/lib/db';
import { getStartupProfileModel } from '@/models/StartupProfile';
import Opportunity from '@/models/Opportunity';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { streamWithFallback } from '@/lib/ai/models';

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { mode, messages } = await req.json();

    if (mode !== 'opportunity-dna' && mode !== 'winners-dna') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const [profile, opportunity] = await Promise.all([
      StartupProfile.findOne().lean(),
      Opportunity.findById(id).lean(),
    ]);

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const systemPrompt = buildSystemPrompt({
      mode,
      profile: profile as any,
      opportunity: opportunity as any,
    });

    const getContent = (m: any): string => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.parts)) return m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
      return '';
    };

    const aiMessages = messages
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: getContent(m) }))
      .filter((m: any) => m.content.trim() !== '');

    const result = streamWithFallback({
      system: systemPrompt,
      messages: aiMessages,
      maxOutputTokens: 2048,
      temperature: 0.7,
    });

    return new Response(result.textStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Intelligence chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
