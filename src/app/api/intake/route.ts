import { NextResponse } from 'next/server';
import { dbConnect, dbConnectShared } from '@/lib/db';
import Opportunity from '@/models/Opportunity';
import { getStartupProfileModel } from '@/models/StartupProfile';
import { scrapeAndExtractOpportunity } from '@/lib/ai/scraper';
import { scoreOpportunityFit } from '@/lib/ai/fit-scorer';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  // Try Jina Reader first
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetchWithTimeout(jinaUrl, {
      headers: { 'Accept': 'text/plain, */*', 'X-Return-Format': 'markdown' },
    }, 20000);
    if (res.ok) {
      const text = await res.text();
      // Jina returns error strings even with 200 — check for meaningful content
      if (text && text.length > 200 && !text.startsWith('Error:') && !text.includes('Access to this page has been denied')) {
        return text;
      }
    }
  } catch {
    // Jina failed (timeout, network error) — fall through to direct fetch
  }

  // Fallback: direct fetch with browser-like headers
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, 15000);
    if (res.ok) {
      const html = await res.text();
      // Strip tags for a rough plaintext — good enough for the AI to parse
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (text.length > 200) return text;
    }
  } catch {
    // Direct fetch also failed
  }

  throw new Error('Could not retrieve content from that URL. Please paste the opportunity text directly instead.');
}

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
      finalRawText = await fetchUrlContent(url);
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
    const message = error instanceof Error ? error.message : 'Failed to process opportunity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
