import { NextResponse } from 'next/server';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { scrapeAndExtractOpportunity } from '@/lib/ai/scraper';
import { scoreOpportunityFit } from '@/lib/ai/fit-scorer';

export async function POST(req: Request) {
  try {
    const { url, rawText: providedRawText } = await req.json();
    if (!url && !providedRawText) return NextResponse.json({ error: 'URL or Raw Text required' }, { status: 400 });

    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    // 1. Get text content
    let finalRawText = providedRawText || '';
    let finalUrl = url || 'https://pasted-text-opportunity.com';

    if (!providedRawText && url) {
      // Use Jina Reader to get clean Markdown, bypassing JS issues
      const jinaUrl = `https://r.jina.ai/${url}`;
      const res = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/event-stream, application/json, text/plain, */*',
        }
      });
      finalRawText = await res.text();
    }

    // 2. Extract opportunity via AI
    const intakeResult = await scrapeAndExtractOpportunity(finalUrl, finalRawText);

    // 3. Get Founder Profile
    const profile = await StartupProfile.findOne().lean();

    // 4. Score Fit
    let fitScoreResult = null;
    if (profile) {
      fitScoreResult = await scoreOpportunityFit(profile as any, intakeResult as any);
    }

    // 5. Save to database
    const newOpportunity = await Opportunity.create({
      programmeName: intakeResult.programmeName,
      organisation: intakeResult.organisation,
      url: finalUrl,
      deadline: intakeResult.deadline ? new Date(intakeResult.deadline) : null,
      prizeAmount: intakeResult.prizeAmount,
      eligibilityCriteria: intakeResult.eligibilityCriteria,
      evaluationCriteria: intakeResult.evaluationCriteria,
      scrapedQuestions: intakeResult.scrapedQuestions,
      fitScore: fitScoreResult ? {
        overall: fitScoreResult.overall,
        breakdown: fitScoreResult.breakdown,
      } : { overall: 0, breakdown: [] },
      status: 'analyzing',
    });

    return NextResponse.json(newOpportunity);
  } catch (error) {
    console.error('Intake failed:', error);
    return NextResponse.json({ error: 'Failed to process opportunity' }, { status: 500 });
  }
}
