import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { streamWithFallback } from '@/lib/ai/models';
import { buildSystemPrompt } from '@/lib/ai/prompts';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id } = await params;
    const { type, prompt } = await req.json();

    if (!type || !prompt) {
      return NextResponse.json({ error: 'Missing type or prompt' }, { status: 400 });
    }

    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const opportunity = await Opportunity.findOne({ _id: id, userId: session.user.id }).lean();
    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

    const profile = await StartupProfile.findOne({ userId: session.user.id }).lean();

    const systemPrompt = buildSystemPrompt({ mode: 'asset_generation', profile, opportunity , persona: session.user.persona as any });

    const stream = streamWithFallback({
      system: systemPrompt,
      prompt: `Generate a tailored ${type} based on the following instructions: ${prompt}`,
      temperature: 0.7,
    });

    return stream.toTextStreamResponse();
  } catch (error) {
    console.error('Failed to generate asset:', error);
    return NextResponse.json({ error: 'Failed to generate asset' }, { status: 500 });
  }
}
