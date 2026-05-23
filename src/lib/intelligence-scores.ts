export function computeIntelligenceScores(opportunity: any) {
  const dnaUserMessages = (opportunity.opportunityDnaLog || []).filter((m: any) => m.role === 'user').length;
  const opportunityDna = Math.min(100, dnaUserMessages * 12);

  const winnerUserMessages = (opportunity.winnersDnaLog || []).filter((m: any) => m.role === 'user').length;
  const winnerProfiles = (opportunity.winnerProfiles || []).length;
  const winnersDna = Math.min(100, winnerUserMessages * 8 + winnerProfiles * 15);

  const evaluationFramework = opportunity.evaluationFramework?.generatedAt ? 80 : 0;

  const alignMap = opportunity.alignmentEvidenceMap || [];
  const alignmentMap = alignMap.length > 0
    ? Math.round((alignMap.filter((a: any) => !a.hasGap).length / alignMap.length) * 100)
    : 0;

  const redFlags = (opportunity.redFlags || []).length > 0 ? 80 : 0;
  const programmeVibe = opportunity.programmeVibe?.generatedAt ? 80 : 0;
  const reviewerPersona = opportunity.reviewerPersona?.generatedAt ? 80 : 0;
  const competitiveIntel = (opportunity.competitiveIntel?.likelyCompetitors || []).length > 0 ? 75 : 0;
  const socialCapital = (opportunity.socialCapital || []).length > 0 ? 75 : 0;
  const unfairAdvantages = Math.min(100, (opportunity.unfairAdvantages || []).length * 25);
  const timingContext = opportunity.timingContext?.generatedAt ? 75 : 0;

  const askCalibration = opportunity.askCalibration?.recommendedAsk ? 80 : 0;

  const scores = [opportunityDna, winnersDna, evaluationFramework, alignmentMap, redFlags, programmeVibe, reviewerPersona, competitiveIntel, socialCapital, unfairAdvantages, timingContext, askCalibration];
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return { opportunityDna, winnersDna, evaluationFramework, alignmentMap, redFlags, programmeVibe, reviewerPersona, competitiveIntel, socialCapital, unfairAdvantages, timingContext, askCalibration, overall };
}
