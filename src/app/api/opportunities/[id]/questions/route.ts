import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { extractQuestionsFromText } from '@/lib/ai/scraper';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id } = await params;
    const { rawText } = await req.json();

    if (!rawText) {
      return NextResponse.json({ error: 'Raw text is required' }, { status: 400 });
    }

    await dbConnect();

    // Find the opportunity
    const opportunity = await Opportunity.findOne({ _id: id, userId: session.user.id });
    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Extract questions using AI
    const extractedQuestions = await extractQuestionsFromText(rawText);

    if (!extractedQuestions || extractedQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found in text' }, { status: 400 });
    }

    // Append questions to the opportunity
    opportunity.scrapedQuestions = [
      ...opportunity.scrapedQuestions,
      ...extractedQuestions
    ];

    await opportunity.save();

    return NextResponse.json({ success: true, count: extractedQuestions.length });
  } catch (error) {
    console.error('Failed to extract questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
