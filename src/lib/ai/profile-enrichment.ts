import { dbConnectShared } from '@/lib/db';
import { getStartupProfileModel, TRACKED_PROFILE_FIELDS } from '@/models/StartupProfile';

const FIELD_PATTERNS: [RegExp, string][] = [
  [/\bemail\b/i, 'founderEmail'],
  [/\b(phone|mobile|contact number|telephone|tel)\b/i, 'founderPhone'],
  [/linkedin/i, 'founderLinkedIn'],
  [/\b(website|web address|url|homepage|online presence)\b/i, 'website'],
  [/\b(company name|startup name|business name|name of (your|the) (company|startup|business|organisation|organization|venture))\b/i, 'startupName'],
  [/\b(founder'?s? name|your (full )?name|applicant'?s? name|name of (founder|applicant))\b/i, 'founderName'],
  [/\b(location|city|country|where (are you|is your (company|startup|team))|based in|headquartered)\b/i, 'founderLocation'],
  [/\b(stage of|current stage|business stage|company stage|startup stage)\b/i, 'stage'],
  [/\b(industry|sector|field|vertical)\b/i, 'industry'],
  [/\b(linkedin|twitter|instagram|social media)\b/i, 'founderLinkedIn'],
];

export async function maybeEnrichProfile(question: string, answer: string): Promise<void> {
  try {
    const q = question.trim();
    const a = answer.trim();
    if (!q || !a || a.length > 300) return; // skip essays — only factual short answers

    let matchedField: string | null = null;
    for (const [pattern, field] of FIELD_PATTERNS) {
      if (pattern.test(q)) {
        matchedField = field;
        break;
      }
    }
    if (!matchedField) return;

    const conn = await dbConnectShared();
    const StartupProfile = getStartupProfileModel(conn);
    const doc = await StartupProfile.findOne();
    if (!doc) return;

    if (TRACKED_PROFILE_FIELDS.has(matchedField)) {
      (doc as any)[matchedField] = { value: a, source: 'autodraft', updatedAt: new Date() };
      await doc.save();
    }
  } catch {
    // Non-fatal — profile enrichment is best-effort
  }
}
