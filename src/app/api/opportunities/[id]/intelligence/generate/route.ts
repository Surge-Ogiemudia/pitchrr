import { NextResponse } from 'next/server';
import { dbConnect, dbConnectShared } from '@/lib/db';
import { getStartupProfileModel } from '@/models/StartupProfile';
import Opportunity from '@/models/Opportunity';
import {
  generateEvaluationFramework,
  generateAlignmentMap,
  generateRedFlags,
  generateProgrammeVibe,
  generateReviewerPersona,
  generateCompetitiveIntel,
  generateSocialCapital,
  generateUnfairAdvantages,
  generateTimingContext,
  generateAskCalibration,
  extractWinnersFromLog,
} from '@/lib/ai/intelligence-generator';

export const maxDuration = 60;

function saveTasks(opportunity: any, section: string, tasks: { task: string; type: string }[]) {
  const existing = (opportunity.improvementTasks || []).filter((t: any) => t.section !== section);
  const incoming = tasks.map((t: any) => ({ section, task: t.task, type: t.type, completed: false }));
  opportunity.set('improvementTasks', [...existing, ...incoming]);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { section } = await req.json();

    await dbConnect();
    const sharedConn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(sharedConn);

    const [profile, opportunity] = await Promise.all([
      StartupProfile.findOne().lean(),
      Opportunity.findById(id),
    ]);

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    switch (section) {
      case 'evaluation-framework': {
        const result = await generateEvaluationFramework(profile as any, opportunity as any);
        opportunity.set('evaluationFramework', {
          summary: result.summary,
          weights: result.weights,
          dealbreakers: result.dealbreakers,
          keySignals: result.keySignals,
          generatedAt: new Date(),
        });
        saveTasks(opportunity, 'evaluation-framework', result.improvementTasks || []);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'alignment-map': {
        const result = await generateAlignmentMap(profile as any, opportunity as any);
        opportunity.set('alignmentEvidenceMap', result);
        const gapTasks = result
          .filter((item: any) => item.hasGap && item.improvementQuestion)
          .map((item: any) => ({ task: item.improvementQuestion, type: 'question' }));
        saveTasks(opportunity, 'alignment-map', gapTasks);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'red-flags': {
        const result = await generateRedFlags(profile as any, opportunity as any);
        opportunity.set('redFlags', result);
        const flagTasks = result
          .filter((f: any) => f.severity === 'high' || f.severity === 'medium')
          .map((f: any) => ({ task: `Address: ${f.concern} — ${f.reframe}`, type: 'action' }));
        saveTasks(opportunity, 'red-flags', flagTasks);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'programme-vibe': {
        const result = await generateProgrammeVibe(opportunity as any);
        opportunity.set('programmeVibe', {
          tone: result.tone,
          energy: result.energy,
          positioningGuidance: result.positioningGuidance,
          languageToUse: result.languageToUse,
          languageToAvoid: result.languageToAvoid,
          generatedAt: new Date(),
        });
        saveTasks(opportunity, 'programme-vibe', result.improvementTasks || []);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'reviewer-persona': {
        const result = await generateReviewerPersona(opportunity as any);
        opportunity.set('reviewerPersona', {
          name: result.name,
          background: result.background,
          previousFunds: result.previousFunds,
          values: result.values,
          languageGuidance: result.languageGuidance,
          generatedAt: new Date(),
        });
        saveTasks(opportunity, 'reviewer-persona', result.improvementTasks || []);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'competitive-intel': {
        const result = await generateCompetitiveIntel(profile as any, opportunity as any);
        opportunity.set('competitiveIntel', {
          likelyCompetitors: result.likelyCompetitors,
          differentiators: result.differentiators,
          competitiveAdvantage: result.competitiveAdvantage,
        });
        saveTasks(opportunity, 'competitive-intel', result.improvementTasks || []);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'social-capital': {
        const result = await generateSocialCapital(profile as any, opportunity as any);
        opportunity.set('socialCapital', result.map((r: any) => ({ ...r, status: 'pending' })));
        const socialTasks = result.map((sc: any) => ({ task: `${sc.connection}: ${sc.actionSuggested}`, type: 'action' }));
        saveTasks(opportunity, 'social-capital', socialTasks);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'unfair-advantages': {
        const result = await generateUnfairAdvantages(profile as any, opportunity as any);
        opportunity.set('unfairAdvantages', result.advantages);
        const advTasks = [{ task: `Lead with this in every answer: ${result.primaryAdvantage}`, type: 'action' }];
        saveTasks(opportunity, 'unfair-advantages', advTasks);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'timing-context': {
        const result = await generateTimingContext(opportunity as any, currentDate);
        opportunity.set('timingContext', {
          currentEvents: result.currentEvents,
          relevanceNote: result.relevanceNote,
          generatedAt: new Date(),
        });
        saveTasks(opportunity, 'timing-context', result.improvementTasks || []);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'ask-calibration': {
        const result = await generateAskCalibration(profile as any, opportunity as any);
        opportunity.set('askCalibration', {
          typicalRange: result.typicalRange,
          recommendedAsk: result.recommendedAsk,
          rationale: result.rationale,
        });
        saveTasks(opportunity, 'ask-calibration', result.improvementTasks || []);
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      case 'winners': {
        const result = await extractWinnersFromLog(opportunity as any);
        if (result.winnerProfiles.length > 0) {
          opportunity.set('winnerProfiles', result.winnerProfiles);
        }
        if (result.winnerArchetype) {
          opportunity.set('winnerArchetype', result.winnerArchetype);
        }
        await opportunity.save();
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
    }
  } catch (error) {
    console.error('Intelligence generate error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
