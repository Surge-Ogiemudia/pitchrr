import { NextResponse } from 'next/server';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { generateApplicationReview } from '@/lib/ai/intelligence-generator';

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const [opportunity, profile] = await Promise.all([
      Opportunity.findById(id).lean(),
      StartupProfile.findOne().lean(),
    ]);

    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const draftedAnswers = (opportunity as any).draftedAnswers || [];
    if (draftedAnswers.length === 0) {
      return NextResponse.json({ error: 'No drafted answers to review' }, { status: 400 });
    }

    const result = await generateApplicationReview(profile as any, opportunity as any, draftedAnswers);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Review generation error:', error);
    return NextResponse.json({ error: 'Review failed' }, { status: 500 });
  }
}
