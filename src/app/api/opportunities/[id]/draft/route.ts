import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { maybeEnrichProfile } from '@/lib/ai/profile-enrichment';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { id } = await params;
    await dbConnect();
    const url = new URL(req.url);
    const questionIndex = url.searchParams.get('questionIndex');

    const opportunity = await Opportunity.findOne({ _id: id, userId: session.user.id });
    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (questionIndex !== null) {
      const idx = parseInt(questionIndex, 10);
      opportunity.draftedAnswers = opportunity.draftedAnswers.filter((a: any) => a.questionIndex !== idx);
    } else {
      opportunity.draftedAnswers = [];
    }

    await opportunity.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await dbConnect();
    const { questionIndex, content, status } = await req.json();

    const opportunity = await Opportunity.findOne({ _id: id, userId: session.user.id });
    if (!opportunity) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update or push the drafted answer
    const existingDraftIndex = opportunity.draftedAnswers.findIndex(
      (a: any) => a.questionIndex === questionIndex
    );

    if (existingDraftIndex >= 0) {
      opportunity.draftedAnswers[existingDraftIndex].content = content;
      opportunity.draftedAnswers[existingDraftIndex].status = status || 'draft';
      opportunity.draftedAnswers[existingDraftIndex].updatedAt = new Date();
    } else {
      opportunity.draftedAnswers.push({
        questionIndex,
        content,
        status: status || 'draft',
        updatedAt: new Date(),
      });
    }

    // Change status to drafting if it was analyzing
    if (opportunity.status === 'analyzing') {
      opportunity.status = 'drafting';
    }

    await opportunity.save();

    // Best-effort: learn from this answer and enrich the master profile
    const question = opportunity.scrapedQuestions?.[questionIndex]?.question;
    if (question && content) {
      maybeEnrichProfile(question, content).catch(() => {});
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Failed to save draft:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
