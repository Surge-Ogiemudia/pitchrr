import { z } from 'zod';
import { ICandidateProfile } from '@/models/CandidateProfile';
import { IJobApplication } from '@/models/JobApplication';
import { generateObjectWithFallback } from './models';

const BASE_IDENTITY = `You are Pitchrr, a world-class strategic career intelligence engine.
You are brutally honest, highly analytical, and deeply strategic.
NEVER use the em dash symbol. NEVER use generic AI filler words like "delve", "testament", "tapestry".
Always be specific, grounded, and actionable.`;

function buildCandidateSummary(profile: ICandidateProfile | null): string {
  if (!profile) return 'No candidate profile available.';
  const p = profile as any;

  const workLines = (profile.workHistory || [])
    .map((w: any) => `${w.role} at ${w.company}${w.isCurrent ? ' (current)' : ''}: ${(w.achievements || []).join(' | ')}`)
    .join('\n  ') || 'None';

  const skillLines = (profile.skills || [])
    .map((s: any) => `${s.name} (${s.category})`)
    .join(', ') || 'None';

  const educationLines = (profile.education || [])
    .map((e: any) => `${e.degree}, ${e.institution}${e.year ? ` (${e.year})` : ''}`)
    .join(' | ') || 'Not set';

  const certificationLines = (profile.certifications || [])
    .map((c: any) => `${c.name}${c.issuer ? ` (${c.issuer})` : ''}${c.year ? ` — ${c.year}` : ''}`)
    .join(' | ') || 'None';

  const stories = (p.stories || [])
    .map((s: any) => `  [${s.theme.toUpperCase()}] "${s.title}": ${s.content}`)
    .join('\n');

  const socialLinkLines = (profile.socialLinks || [])
    .map((l: any) => `${l.platform}: ${l.url}`)
    .join(' | ') || 'None';

  const targetCompanyLines = (profile.targetCompanies || []).join(', ') || 'None';

  return `
CANDIDATE: ${p.fullName?.value || 'Unknown'} | ${p.location?.value || ''} | ${p.linkedIn?.value || ''}
EMAIL: ${p.email?.value || 'Not set'}
HEADLINE: ${p.headline?.value || 'Not set'}
BIO: ${p.bio?.value || 'Not set'}
CURRENT: ${p.currentRole?.value || 'Not set'} at ${p.currentCompany?.value || 'Not set'}
YEARS OF EXPERIENCE: ${p.yearsOfExperience?.value || 'Not set'}
INDUSTRY: ${p.industry?.value || 'Not set'}
DESIRED ROLE: ${p.desiredRole?.value || 'Not set'}
DESIRED SALARY: ${p.desiredSalary?.value || 'Not set'}
AVAILABILITY: ${p.availability?.value || 'Not set'}
WORK AUTHORIZATION: ${p.workAuthorization?.value || 'Not set'}
SKILLS: ${skillLines}
CERTIFICATIONS: ${certificationLines}
EDUCATION: ${educationLines}
WORK HISTORY:
  ${workLines}
PROJECTS: ${(profile.projects || []).map((pr: any) => `${pr.name}: ${pr.description}${pr.impact ? ` (${pr.impact})` : ''}`).join(' | ') || 'None'}
SOCIAL LINKS: ${socialLinkLines}
TARGET COMPANIES: ${targetCompanyLines}
WRITING VOICE: ${p.writingVoice?.value || 'Not set'}
STORIES:
${stories || '  None saved yet'}
ADDITIONAL FACTS: ${(p.dynamicFields || []).map((f: any) => `${f.key}: ${f.value}`).join(' | ') || 'None'}`.trim();
}

function buildJobSummary(job: IJobApplication): string {
  const j = job as any;
  const dnaConversation = j.companyDnaLog?.length > 0
    ? `\nCOMPANY DNA (from research conversation):\n${j.companyDnaLog.map((m: any) => `${m.role === 'user' ? 'Candidate' : 'Analysis'}: ${m.content}`).join('\n')}`
    : '';
  const pastHiresConversation = j.pastHiresDnaLog?.length > 0
    ? `\nPAST HIRES DNA (from research conversation):\n${j.pastHiresDnaLog.map((m: any) => `${m.role === 'user' ? 'Candidate' : 'Analysis'}: ${m.content}`).join('\n')}`
    : '';
  return `
JOB: ${job.jobTitle} at ${job.company}
SALARY RANGE: ${job.salaryRange || 'Not specified'}
LOCATION: ${job.location || 'Not specified'}
EMPLOYMENT TYPE: ${job.employmentType || 'Not specified'}
REQUIRED QUALIFICATIONS: ${job.requiredQualifications}
PREFERRED QUALIFICATIONS: ${job.preferredQualifications || 'None listed'}
RESPONSIBILITIES: ${job.responsibilities}
APPLICATION QUESTIONS: ${job.applicationQuestions?.map((q, i) => `Q${i + 1}: ${q.question}`).join(' | ') || 'None'}
${dnaConversation}
${pastHiresConversation}`.trim();
}

export async function generateJobEvaluationFramework(profile: ICandidateProfile, job: IJobApplication) {
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

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Decode the real hiring framework behind this job posting. Based on the stated requirements, the job description language, the company's known culture, and any past hire patterns, determine HOW they actually evaluate candidates.

Provide: a plain-language summary of how they really score candidates (beyond what the JD says), a breakdown of implicit weighting by category (percentages summing to 100), absolute dealbreakers that would immediately disqualify, and the key signals they respond to most strongly in interviews and applications.

Also list 2-4 specific improvement tasks: things the candidate should research or prepare to give this analysis more accuracy.`,
    schema,
  });
}

export async function generateJobAlignmentMap(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.array(z.object({
    criterion: z.string(),
    proofPoint: z.string(),
    hasGap: z.boolean(),
    improvementQuestion: z.string(),
  }));

  const evalFramework = (job as any).evaluationFramework;
  const frameworkContext = evalFramework?.weights?.length > 0
    ? `\nEVALUATION FRAMEWORK (already decoded):\n${evalFramework.weights.map((w: any) => `${w.category} (${w.weight}%): ${w.rationale}`).join('\n')}`
    : '';

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}${frameworkContext}`,
    prompt: `Build a complete alignment evidence map for this application.

For every requirement this job uses (explicit and implicit), identify: the specific proof point from the candidate's profile that addresses it, whether there is a gap (nothing in the profile adequately addresses this requirement), and if there is a gap, the single most important question the candidate should answer to fill it.

Be specific and honest. A weak proof point is still a gap. Do not claim strength where there is only surface-level coverage.`,
    schema,
  });
}

export async function generateJobRedFlags(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.array(z.object({
    concern: z.string(),
    reframe: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
  }));

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Identify every red flag a hiring manager or recruiter at this company would notice in this candidate's application.

A red flag is anything that could cause hesitation, doubt, or rejection: skills gaps, wrong industry background, career gaps, overqualification, underqualification, location mismatch, work authorization issues, missing qualifications, or any narrative weakness that does not match what this company typically hires.

For each red flag, provide: the specific concern a hiring manager would have, a concrete reframe strategy (how to address or neutralise it in the application or interview), and a severity rating (high = likely to disqualify, medium = notable weakness, low = minor concern).

Be brutally honest. Do not soften real problems.`,
    schema,
  });
}

export async function generateCompanyVibe(job: IJobApplication) {
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

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Decode the cultural vibe of this company and the tone they want from candidates for this role.

Every company has an implicit personality in how they hire: some reward polish and corporate precision, others want raw mission-driven energy, some prioritise technical depth, others want collaborative storytellers. Decode this company's vibe for this specific role.

Provide: the overall tone they respond to in applications, the energy level they prefer (data-heavy vs. story-first vs. balanced), specific positioning guidance for how the candidate should frame their identity to feel like "one of theirs", language they use and reward (use these in the application), and language to actively avoid (these will feel off-brand).

List improvement tasks for finding more evidence of their culture (Glassdoor reviews, LinkedIn posts, team interviews).`,
    schema,
  });
}

export async function generateInterviewerPersona(job: IJobApplication) {
  const schema = z.object({
    name: z.string(),
    background: z.string(),
    previouslyHiredFrom: z.array(z.string()),
    values: z.array(z.string()),
    languageGuidance: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Build an interviewer persona for this role based on everything known about the company and the likely hiring manager.

If a specific hiring manager is known (from the DNA research), profile them directly. If not, build an archetype based on the company type, team structure, and the seniority of the role.

Provide: the interviewer's name or archetype title, their background and how it shapes what they look for, companies or backgrounds they have previously hired from, what they personally value most in candidates for this role, and specific language guidance for writing an application that resonates with this specific human.

List improvement tasks: things the candidate could find (LinkedIn, team page, company blog, conference talks) to make this persona more accurate.`,
    schema,
  });
}

export async function generateCandidateCompetitiveIntel(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.object({
    typicalCandidates: z.array(z.string()),
    differentiators: z.array(z.string()),
    competitiveAdvantage: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Analyse the competitive field for this specific application.

Who else is likely applying for this role? Given the company size, sector, role seniority, and location, describe the archetypes of competing candidates — not generic market competitors but the actual types of people who would apply for and interview for this specific job.

Then identify: the candidate's genuine differentiators against that specific applicant pool (not generic strengths but real edges in this context), and the single most compelling competitive advantage the candidate has that most other applicants will not have.

Be realistic. Do not inflate weak differentiation. If the competitive position is weak, say so and explain why.`,
    schema,
  });
}

export async function generateCandidateSocialCapital(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.array(z.object({
    connection: z.string(),
    relationship: z.string(),
    actionSuggested: z.string(),
    messageDraft: z.string(),
  }));

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Identify social capital opportunities for this job application.

Based on the candidate's background, industry, and the company's network, suggest: who in the candidate's likely network could be connected to this company (alumni, former colleagues, shared connections, industry peers), what type of warm introduction or referral signal would be most valuable for this specific role, and a draft outreach message for each connection type.

If no direct connections are obvious, suggest the types of people to actively find and connect with before applying, and exactly how to approach them.`,
    schema,
  });
}

export async function generateCandidateUnfairAdvantages(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.object({
    advantages: z.array(z.string()),
    primaryAdvantage: z.string(),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Surface the candidate's unfair advantages for this specific application.

An unfair advantage is something about this candidate that most other applicants will not have for this specific role at this specific company. It is not a generic strength. It must be specific to the intersection of who this candidate is and what this company is hiring for right now.

List every unfair advantage you can identify, from most powerful to least powerful. Then identify the single primary unfair advantage that should be made visible in the opening of the cover letter and woven throughout every answer.`,
    schema,
  });
}

export async function generateJobTimingContext(job: IJobApplication, currentDate: string) {
  const schema = z.object({
    currentEvents: z.array(z.string()),
    relevanceNote: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nJOB:\n${buildJobSummary(job)}\n\nCurrent Date: ${currentDate}`,
    prompt: `Identify current events, company developments, industry trends, or news (as of ${currentDate}) that make this candidate more relevant and timely for this specific role right now.

Focus on: recent company announcements, funding rounds, or product launches that create urgency for this hire, industry-wide trends that validate the skills this role requires, sector developments a candidate who is truly current would reference in their application, or anything that shows the candidate understands why this role matters right now.

Provide: a list of specific current events or company developments (with approximate dates where known), and a note on how to weave this timing context into the cover letter or answers to show the candidate is genuinely current and contextually aware.

List improvement tasks for finding the most current and credible sources.`,
    schema,
  });
}

export async function generateSalaryCalibration(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.object({
    typicalRange: z.string(),
    recommendedAsk: z.string(),
    rationale: z.string(),
    improvementTasks: z.array(z.object({
      task: z.string(),
      type: z.enum(['question', 'file', 'resource', 'action']),
    })),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Calibrate the salary negotiation position for this specific application.

Based on the role's stated salary range (if any), the company's size and funding stage, the candidate's current compensation and experience level, and market rates for this role in this location: what is the realistic market range for this role, what should the candidate specifically ask for, and why?

Be precise. Give a specific number or range with a concrete rationale tied to the candidate's actual experience level and this company's known compensation behaviour. If the posted salary is below market, say so directly and explain the candidate's options.

List improvement tasks for verifying compensation data (Glassdoor, Levels.fyi, LinkedIn Salary, industry surveys).`,
    schema,
  });
}

export async function generateInterviewPrep(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.object({
    likelyQuestions: z.array(z.object({
      question: z.string(),
      category: z.enum(['behavioural', 'technical', 'situational', 'culture', 'case']),
      notes: z.string(),
    })),
    technicalTopics: z.array(z.string()),
    caseStudies: z.array(z.string()),
    questionsToAsk: z.array(z.object({
      question: z.string(),
      intent: z.string(),
      round: z.string(),
    })),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Build an interview preparation plan for this specific role.

Based on the job requirements, company culture, and the candidate's profile:
1. List the most likely interview questions across all categories (behavioural, technical, situational, culture-fit, case). For each, provide brief prep notes — what angle to take, which story from their profile to deploy, what to avoid.
2. List the specific technical topics they need to be ready to discuss or demonstrate (frameworks, tools, methodologies, domain knowledge this company uses).
3. List 2-3 case study scenarios they should prepare — real examples from their work history that demonstrate the core competencies this role demands.
4. List 8-12 sharp questions the candidate should ask across their interview rounds. For each question: the exact wording, the strategic intent behind asking it (what signal it sends, what information it surfaces), and which round it is most appropriate for (phone screen, technical, panel, final). Questions to ask are not a formality — they are part of the evaluation. A weak question signals disengagement. A sharp question signals preparation, seniority, and genuine interest.

Be specific to this role and company. Generic interview prep lists are useless.`,
    schema,
  });
}

export async function generateResumeTailoring(profile: ICandidateProfile, job: IJobApplication) {
  const schema = z.object({
    suggestions: z.array(z.string()),
    tailoredSummary: z.string(),
    atsKeywords: z.array(z.string()),
  });

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nCANDIDATE PROFILE:\n${buildCandidateSummary(profile)}\n\nJOB:\n${buildJobSummary(job)}`,
    prompt: `Generate resume tailoring guidance for this specific application.

Provide:
1. A list of specific, actionable suggestions for adjusting the candidate's resume for this role — which achievements to lead with, which skills to make more prominent, what language to mirror from the job description, what to cut or deprioritise.
2. A tailored professional summary (3-4 sentences) the candidate can use at the top of their resume specifically for this application. It should echo the job description's language, highlight the most relevant experience, and make the fit immediately obvious to a recruiter skimming in 6 seconds.
3. A list of ATS keywords extracted directly from the job description — the exact terms, phrases, and tool names that an applicant tracking system is likely scanning for. These must appear verbatim (or very close) in the resume. Pull every specific technology, methodology, certification, and role-specific term from the JD. Miss one and the resume may be filtered before a human sees it.

Be concrete. "Make your resume more relevant" is not a suggestion. "Move the Salesforce implementation bullet to the top of your current role and rewrite it to match their language 'revenue operations automation'" is a suggestion.`,
    schema,
  });
}

export async function generateJobApplicationReview(
  profile: ICandidateProfile | null,
  job: IJobApplication,
  draftedAnswers: { questionIndex: number; content: string }[],
  coverLetterContent?: string
) {
  const questions = (job as any).applicationQuestions || [];
  const draftsText = draftedAnswers
    .sort((a, b) => a.questionIndex - b.questionIndex)
    .map(a => {
      const q = questions[a.questionIndex];
      return `Q${a.questionIndex + 1}: ${q?.question || 'Unknown question'}${q?.wordLimit ? ` [${q.wordLimit} word limit]` : ''}\n${a.content}`;
    })
    .join('\n\n---\n\n');

  const coverLetterSection = coverLetterContent
    ? `\n\n--- COVER LETTER ---\n${coverLetterContent}`
    : '';

  const redFlagsCtx = (job as any).redFlags?.length > 0
    ? `\nIDENTIFIED RED FLAGS:\n${(job as any).redFlags.map((f: any) => `[${f.severity.toUpperCase()}] ${f.concern} | Reframe: ${f.reframe}`).join('\n')}`
    : '';

  const alignmentCtx = (job as any).alignmentEvidenceMap?.length > 0
    ? `\nREQUIREMENTS:\n${(job as any).alignmentEvidenceMap.map((a: any) => `${a.criterion}${a.hasGap ? ' [KNOWN GAP]' : ''}`).join('\n')}`
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

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}

CANDIDATE PROFILE:
${buildCandidateSummary(profile)}

JOB:
${buildJobSummary(job)}${redFlagsCtx}${alignmentCtx}`,
    prompt: `Review this complete set of drafted application materials as a brutal but constructive senior career advisor reading the full submission for the first time.

DRAFTED ANSWERS:
${draftsText}${coverLetterSection}

Assess:
1. Overall score (0-100) and a single verdict sentence. A 70 means there are real problems. Do not inflate.
2. Priority fixes in order of impact — specific, actionable, with question number where relevant. Null questionIndex means it applies across answers or to the cover letter.
3. Narrative issues — contradictions between answers, missing story thread, key message not landing, unfair advantage not visible.
4. Red flag coverage — for each identified red flag, whether the drafts actually deployed the reframe strategy. If not addressed, what to add.
5. Alignment coverage — for each job requirement, whether the drafts prove it (strong/partial/missing) with a short note.
6. What genuinely reads well — specific praise tied to specific answers, not generic.

Be direct. The candidate is about to submit this. They need truth, not comfort.`,
    schema,
  });
}

export async function extractPastHiresFromLog(job: IJobApplication) {
  const log = (job as any).pastHiresDnaLog || [];
  if (log.length === 0) return { pastHireProfiles: [], pastHireArchetype: null };

  const schema = z.object({
    pastHireProfiles: z.array(z.object({
      name: z.string(),
      source: z.string(),
      patterns: z.string(),
    })),
    pastHireArchetype: z.object({
      commonTraits: z.array(z.string()),
      typicalBackground: z.string(),
      alignmentSignals: z.array(z.string()),
    }),
  });

  const conversationText = log
    .map((m: any) => `${m.role === 'user' ? 'Candidate' : 'Analysis'}: ${m.content}`)
    .join('\n');

  return generateObjectWithFallback({
    system: `${BASE_IDENTITY}\n\nJOB: ${job.jobTitle} at ${job.company}`,
    prompt: `From the following research conversation, extract all past or current employees discussed and build a past hire archetype.

RESEARCH CONVERSATION:
${conversationText}

For each person mentioned, extract: their name or identifier, where the data came from, and a concise pattern summary of their background and what made them a fit for this type of role.

Then build a past hire archetype: the common traits across all people found, the typical background they came from, and the key alignment signals (what they all had that got them this type of role at this type of company).`,
    schema,
  });
}
