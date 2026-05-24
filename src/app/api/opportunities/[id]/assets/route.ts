import { NextResponse } from 'next/server';
import { dbConnectShared } from '@/lib/db';
import { getOpportunityModel } from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { streamWithFallback } from '@/lib/ai/models';
import { buildSystemPrompt } from '@/lib/ai/prompts';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { type, prompt } = await req.json();

    if (!type || !prompt) {
      return NextResponse.json({ error: 'Missing type or prompt' }, { status: 400 });
    }

    const sharedConn = await dbConnectShared();
    const Opportunity = getOpportunityModel(sharedConn);
    const StartupProfile = getStartupProfileModel(sharedConn);

    const opportunity = await Opportunity.findById(params.id).lean();
    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

    const profile = await StartupProfile.findOne().lean();

    const systemPrompt = buildSystemPrompt({ mode: 'asset_generation', profile, opportunity });

    const stream = streamWithFallback({
      system: systemPrompt,
      prompt: `Generate a tailored ${type} based on the following instructions: ${prompt}`,
      temperature: 0.7,
    });

    return stream.toDataStreamResponse();
  } catch (error) {
    console.error('Failed to generate asset:', error);
    return NextResponse.json({ error: 'Failed to generate asset' }, { status: 500 });
  }
}
