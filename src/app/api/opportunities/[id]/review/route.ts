import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { generateApplicationReview } from '@/lib/ai/intelligence-generator';

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
      Opportunity.findOne({ _id: id, userId: session.user.id }).lean(),
      StartupProfile.findOne({ userId: session.user.id }).lean(),
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
