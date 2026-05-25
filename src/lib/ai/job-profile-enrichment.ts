import { dbConnectShared } from '@/lib/db';
import { getCandidateProfileModel, TRACKED_CANDIDATE_FIELDS } from '@/models/CandidateProfile';

const FIELD_PATTERNS: [RegExp, string][] = [
  [/\b(email address|your email|contact email)\b/i, 'email'],
  [/\b(phone|mobile|contact number|telephone|tel)\b/i, 'phone'],
  [/\blinkedin\b/i, 'linkedIn'],
  [/\b(portfolio|personal (website|site)|personal url)\b/i, 'portfolio'],
  [/\b(full name|your name|legal name|first and last name)\b/i, 'fullName'],
  [/\b(location|city|country|where (are you|do you) (based|live)|based in)\b/i, 'location'],
  [/\b(current (role|job title|position|title)|job title|position title)\b/i, 'currentRole'],
  [/\b(current (company|employer|organisation|organization)|where (do you|are you) (work|employed))\b/i, 'currentCompany'],
  [/\b(years? of (experience|exp)|how (long|many years) have you (worked|been))\b/i, 'yearsOfExperience'],
  [/\b(industry|sector|field|vertical|domain)\b/i, 'industry'],
  [/\b(desired role|ideal role|target role|role you('re| are) (looking|applying) for)\b/i, 'desiredRole'],
  [/\b(desired salary|expected (salary|compensation|pay)|salary expectation|compensation expectation)\b/i, 'desiredSalary'],
  [/\b(notice period|when can you start|availability|start date|earliest start)\b/i, 'availability'],
  [/\b(work (authorization|authorisation|permit|visa)|right to work|visa (status|type))\b/i, 'workAuthorization'],
];

export async function maybeEnrichCandidateProfile(question: string, answer: string): Promise<void> {
  try {
    const q = question.trim();
    const a = answer.trim();
    if (!q || !a || a.length > 300) return;

    let matchedField: string | null = null;
    for (const [pattern, field] of FIELD_PATTERNS) {
      if (pattern.test(q)) {
        matchedField = field;
        break;
      }
    }
    if (!matchedField) return;

    const conn = await dbConnectShared();
    const CandidateProfile = getCandidateProfileModel(conn);
    const doc = await CandidateProfile.findOne();
    if (!doc) return;

    if (TRACKED_CANDIDATE_FIELDS.has(matchedField)) {
      (doc as any)[matchedField] = { value: a, source: 'autodraft', updatedAt: new Date() };
      await doc.save();
    }
  } catch {
    // Non-fatal — profile enrichment is best-effort
  }
}
