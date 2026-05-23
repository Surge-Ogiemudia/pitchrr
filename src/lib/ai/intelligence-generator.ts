import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { IStartupProfile } from '@/models/StartupProfile';
import { IOpportunity } from '@/models/Opportunity';

const BASE_IDENTITY = `You are Pitchrr, a world-class strategic application intelligence engine.
You are brutally honest, highly analytical, and deeply strategic.
NEVER use the em dash symbol. NEVER use generic AI filler words like "delve", "testament", "tapestry".
Always be specific, grounded, and actionable.`;

function buildProfileSummary(profile: IStartupProfile | null): string {
  if (!profile) return 'No founder profile available.';
  const p = profile as any;
  const stories = (p.stories || []).map((s: any) => `  [${s.theme.toUpperCase()}] "${s.title}": ${s.content}`).join('\n');
  return `
FOUNDER: ${p.founderName?.value || 'Unknown'} | ${p.founderLocation?.value || ''} | ${p.founderLinkedIn?.value || ''}
EMAIL: ${p.founderEmail?.value || 'Not set'}
BIO: ${p.founderBio?.value || 'Not set'}
STARTUP: ${p.startupName?.value || 'Unknown'} | Website: ${p.website?.value || 'Not set'} | Stage: ${p.stage?.value || 'Unknown'} | Industry: ${p.industry?.value || 'Unknown'}
ONE LINER: ${p.oneLiner?.value || 'Not set'}
PROBLEM: ${p.problem?.value || 'Not set'}
SOLUTION: ${p.solution?.value || 'Not set'}
BUSINESS MODEL: ${p.businessModel?.value || 'Not set'}
MARKET SIZE: ${p.marketSize?.value || 'Not set'}
UNIQUENESS: ${p.uniqueness?.value || 'Not set'}
MISSION: ${p.mission?.value || 'Not set'}
USE OF FUNDS: ${p.useOfFunds?.value || 'Not set'}
TRACTION: ${profile.traction?.map((t: any) => `[${t.type}] ${t.description}`).join(' | ') || 'None'}
TEAM: ${profile.team?.map((t: any) => `${t.name} (${t.role}): ${t.background}`).join(' | ') || 'None'}
WRITING VOICE: ${p.writingVoice?.value || 'Not set'}
STORIES:
${stories || '  None saved yet'}
ADDITIONAL FACTS: ${p.dynamicFields?.map((f: any) => `${f.key}: ${f.value}`).join(' | ') || 'None'}`.trim();
}

function buildOpportunitySummary(opportunity: IOpportunity): string {
  const opp = opportunity as any;
  const dnaConversation = opp.opportunityDnaLog?.length > 0
    ? `\nORGANISATION DNA (from research conversation):\n${opp.opportunityDnaLog.map((m: any) => `${m.role === 'user' ? 'Founder' : 'Analysis'}: ${m.content}`).join('\n')}`
    : '';
  const winnersConversation = opp.winnersDnaLog?.length > 0
    ? `\nWINNERS DNA (from research conversation):\n${opp.winnersDnaLog.map((m: any) => `${m.role === 'user' ? 'Founder' : 'Analysis'}: ${m.content}`).join('\n')}`
    : '';
  return `
PROGRAMME: ${opportunity.programmeName} by ${opportunity.organisation}
PRIZE/FUNDING: ${opportunity.prizeAmount}
ELIGIBILITY: ${opportunity.eligibilityCriteria}
EVALUATION CRITERIA: ${opportunity.evaluationCriteria}
APPLICATION QUESTIONS: ${opportunity.scrapedQuestions?.map((q, i) => `Q${i + 1}: ${q.question}`).join(' | ') || 'None'}
${dnaConversation}
${winnersConversation}`.trim();
}

export async function generateEvaluationFramework(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.object({
    summary: z.string(),
    weights: z.array(z.object({
      category: z.string(),
      weight: z.number(),
      rationale: z.string(),
    })),
    dealbreakers: z.array(z.string()),
    keySignals: z.array(z.string()),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Decode the evaluation framework for this programme. Based on their stated criteria, language patterns, past selections (if known), and organisational DNA, determine HOW they actually score applications.

Provide: a plain-language summary of how they score, a breakdown of the implicit weighting by category (percentages summing to 100), absolute dealbreakers, and the key signals they respond to most strongly.

Also list 2-4 specific improvement tasks: things the founder should find or do to give this analysis more accuracy.`,
    schema,
  });

  return object;
}

export async function generateAlignmentMap(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.array(z.object({
    criterion: z.string(),
    proofPoint: z.string(),
    hasGap: z.boolean(),
    improvementQuestion: z.string(),
  }));

  const evalFramework = (opportunity as any).evaluationFramework;
  const frameworkContext = evalFramework?.weights?.length > 0
    ? `\nEVALUATION FRAMEWORK (already decoded):\n${evalFramework.weights.map((w: any) => `${w.category} (${w.weight}%): ${w.rationale}`).join('\n')}`
    : '';

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}${frameworkContext}`,
    prompt: `Build a complete alignment evidence map for this application.

For every evaluation criterion this programme uses (explicit and implicit), identify: the specific proof point from the founder's profile that addresses it, whether there is a gap (nothing in the profile adequately addresses this criterion), and if there is a gap, the single most important question the founder should answer to fill it.

Be specific and honest. A weak proof point is still a gap. Do not claim strength where there is only surface-level coverage.`,
    schema,
  });

  return object;
}

export async function generateRedFlags(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.array(z.object({
    concern: z.string(),
    reframe: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
  }));

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Identify every red flag a reviewer at this programme would see in this founder's application.

A red flag is anything that could cause hesitation, doubt, or disqualification: missing traction, wrong stage, geography mismatch, lack of co-founder, legal status, registration, specific eligibility gaps, narrative weaknesses, or anything that does not match the winner pattern for this programme type.

For each red flag, provide: the specific concern a reviewer would have, a concrete reframe strategy (how to address or neutralise it in the application), and a severity rating (high = could disqualify, medium = notable weakness, low = minor concern).

Be brutally honest. Do not soften real problems.`,
    schema,
  });

  return object;
}

export async function generateProgrammeVibe(opportunity: IOpportunity) {
  const schema = z.object({
    tone: z.string(),
    energy: z.string(),
    positioningGuidance: z.string(),
    languageToUse: z.array(z.string()),
    languageToAvoid: z.array(z.string()),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Decode the cultural vibe of this programme and what type of founder they consistently select.

Every programme has an implicit personality: some reward polish and investor-readiness, others want raw mission-driven founders, some want technical depth, others want community-first builders. Decode this programme's vibe.

Provide: the overall tone they respond to, the energy level they prefer (data-heavy vs. story-first vs. balanced), specific positioning guidance for how to frame this founder's identity to feel like "one of theirs", language they use and reward (use these), and language to avoid (these will feel off-brand).`,
    schema,
  });

  return object;
}

export async function generateReviewerPersona(opportunity: IOpportunity) {
  const schema = z.object({
    name: z.string(),
    background: z.string(),
    previousFunds: z.array(z.string()),
    values: z.array(z.string()),
    languageGuidance: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Build a reviewer persona for this programme based on everything known about the organisation and their selection committee.

If a specific person is known (from the DNA research), profile them directly. If not, build an archetype based on the organisation type, their mission, and past selections.

Provide: the reviewer's name or archetype title, their background and how it shapes their bias, what types of founders they have backed or selected before, what they personally value most in applicants, and specific language guidance for writing an application that resonates with this specific human.

List improvement tasks: things the founder could find (LinkedIn, talks, articles) to make this persona more accurate.`,
    schema,
  });

  return object;
}

export async function generateCompetitiveIntel(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.object({
    likelyCompetitors: z.array(z.string()),
    differentiators: z.array(z.string()),
    competitiveAdvantage: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Analyse the competitive field for this specific application.

Who else is likely applying for this programme? Given the sector, geography, stage, and type of programme, describe the archetypes of competing applicants, not generic market competitors.

Then identify: the founder's genuine differentiators against that specific applicant pool (not generic strengths but real edges in this context), and the single most compelling competitive advantage the founder has that most other applicants will not have.

Be realistic. Do not inflate weak differentiation. If the competitive position is weak, say so and explain why.`,
    schema,
  });

  return object;
}

export async function generateSocialCapital(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.array(z.object({
    connection: z.string(),
    relationship: z.string(),
    actionSuggested: z.string(),
    messageDraft: z.string(),
  }));

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Identify social capital opportunities for this application.

Based on the founder's background, network signals (WHO, pharmacist community, health sector), and the programme's ecosystem, suggest: who in the founder's likely network could be connected to this programme (alumni, advisors, shared investors, sector peers), what type of warm introduction or signal would be most valuable, and a draft outreach message for each connection type.

If no direct connections are obvious, suggest the types of people to actively find and connect with before submitting, and how.`,
    schema,
  });

  return object;
}

export async function generateUnfairAdvantages(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.object({
    advantages: z.array(z.string()),
    primaryAdvantage: z.string(),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Surface the founder's unfair advantages for this specific application.

An unfair advantage is something about this founder and this startup that most other applicants will not have for this specific programme. It is not a generic strength. It must be specific to the intersection of who this founder is and what this programme values.

List every unfair advantage you can identify, from most powerful to least powerful. Then identify the single primary unfair advantage that should be made visible in the opening of the application and woven throughout every answer.`,
    schema,
  });

  return object;
}

export async function generateTimingContext(opportunity: IOpportunity, currentDate: string) {
  const schema = z.object({
    currentEvents: z.array(z.string()),
    relevanceNote: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}\n\nCurrent Date: ${currentDate}`,
    prompt: `Identify current events, trends, reports, or policy changes (as of ${currentDate}) that make this founder's solution more urgent and relevant RIGHT NOW.

Focus on: recent reports or studies published in the last 6 months that validate the problem, recent policy announcements or government actions that create urgency, sector-wide momentum or events that show this is the right moment, anything a reviewer reading this application today would immediately recognise as current and important.

Provide: a list of specific current events or reports (with approximate dates where known), and a note on how to weave this timing context into the application to show the founder is current and contextually aware.

List improvement tasks for finding the most current and credible sources.`,
    schema,
  });

  return object;
}

export async function generateAskCalibration(profile: IStartupProfile, opportunity: IOpportunity) {
  const schema = z.object({
    typicalRange: z.string(),
    recommendedAsk: z.string(),
    rationale: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nFOUNDER PROFILE:\n${buildProfileSummary(profile)}\n\nOPPORTUNITY:\n${buildOpportunitySummary(opportunity)}`,
    prompt: `Calibrate the funding ask for this specific application.

Based on the programme's prize amount, their typical cohort stage, the founder's current traction and stage, and any patterns from past winners: what is the typical range awarded, what should this founder specifically ask for, and why?

If this is a fixed prize (no variable ask), say so explicitly and explain how the founder should frame their use of funds to signal they will use it well.

Be precise. A vague "it depends" answer is useless. Give a specific number or range with a concrete rationale tied to the founder's actual situation and this programme's known behaviour.`,
    schema,
  });

  return object;
}

export async function generateApplicationReview(
  profile: IStartupProfile | null,
  opportunity: IOpportunity,
  draftedAnswers: { questionIndex: number; content: string }[]
) {
  const questions = (opportunity as any).scrapedQuestions || [];
  const draftsText = draftedAnswers
    .sort((a, b) => a.questionIndex - b.questionIndex)
    .map(a => {
      const q = questions[a.questionIndex];
      return `Q${a.questionIndex + 1}: ${q?.question || 'Unknown question'}${q?.wordLimit ? ` [${q.wordLimit} word limit]` : ''}\n${a.content}`;
    })
    .join('\n\n---\n\n');

  const redFlagsCtx = (opportunity as any).redFlags?.length > 0
    ? `\nIDENTIFIED RED FLAGS:\n${(opportunity as any).redFlags.map((f: any) => `[${f.severity.toUpperCase()}] ${f.concern} | Reframe: ${f.reframe}`).join('\n')}`
    : '';

  const alignmentCtx = (opportunity as any).alignmentEvidenceMap?.length > 0
    ? `\nEVALUATION CRITERIA:\n${(opportunity as any).alignmentEvidenceMap.map((a: any) => `${a.criterion}${a.hasGap ? ' [KNOWN GAP]' : ''}`).join('\n')}`
    : '';

  const schema = z.object({
    overallScore: z.number().min(0).max(100),
    verdict: z.string(),
    priorityFixes: z.array(z.object({
      fix: z.string(),
      impact: z.enum(['high', 'medium', 'low']),
      questionIndex: z.number().nullable(),
    })),
    narrativeIssues: z.array(z.object({
      issue: z.string(),
      questionIndices: z.array(z.number()),
      fix: z.string(),
    })),
    redFlagCoverage: z.array(z.object({
      concern: z.string(),
      severity: z.string(),
      addressed: z.boolean(),
      evidence: z.string(),
      suggestedAddition: z.string().optional(),
    })),
    alignmentCoverage: z.array(z.object({
      criterion: z.string(),
      strength: z.enum(['strong', 'partial', 'missing']),
      note: z.string(),
    })),
    strengths: z.array(z.string()),
  });

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}

FOUNDER PROFILE:
${buildProfileSummary(profile)}

OPPORTUNITY:
${buildOpportunitySummary(opportunity)}${redFlagsCtx}${alignmentCtx}`,
    prompt: `Review this complete set of drafted application answers as a brutal but constructive senior advisor reading the full submission for the first time.

DRAFTED ANSWERS:
${draftsText}

Assess:
1. Overall score (0-100) and a single verdict sentence. A 70 means there are real problems. Do not inflate.
2. Priority fixes in order of impact — specific, actionable, with question number where relevant. Null questionIndex means it applies across answers.
3. Narrative issues — contradictions between answers, missing story thread, key message not landing, unfair advantage not visible.
4. Red flag coverage — for each identified red flag, whether the drafts actually deployed the reframe strategy, with evidence. If not addressed, what to add.
5. Alignment coverage — for each evaluation criterion, whether the drafts prove it (strong/partial/missing) with a short note.
6. What genuinely reads well — specific praise tied to specific answers, not generic.

Be direct. The founder is about to submit this. They need truth, not comfort.`,
    schema,
  });

  return object;
}

export async function extractWinnersFromLog(opportunity: IOpportunity) {
  const log = (opportunity as any).winnersDnaLog || [];
  if (log.length === 0) return { winnerProfiles: [], winnerArchetype: null };

  const schema = z.object({
    winnerProfiles: z.array(z.object({
      name: z.string(),
      source: z.string(),
      patterns: z.string(),
    })),
    winnerArchetype: z.object({
      commonTraits: z.array(z.string()),
      typicalStage: z.string(),
      alignmentSignals: z.array(z.string()),
    }),
  });

  const conversationText = log.map((m: any) => `${m.role === 'user' ? 'Founder' : 'Analysis'}: ${m.content}`).join('\n');

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    system: `${BASE_IDENTITY}\n\nOPPORTUNITY: ${opportunity.programmeName} by ${opportunity.organisation}`,
    prompt: `From the following research conversation, extract all past winners or selectees that were discussed and build a winner archetype.

RESEARCH CONVERSATION:
${conversationText}

For each winner mentioned, extract: their name/company, where the data came from, and a concise pattern summary of what made them stand out.

Then build a winner archetype: the common traits across all winners, their typical stage at selection, and the key alignment signals (what they all had that earned their selection).`,
    schema,
  });

  return object;
}

