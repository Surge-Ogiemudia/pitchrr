const fs = require('fs');

const libFiles = [
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\lib\\ai\\scraper.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\lib\\ai\\fit-scorer.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\lib\\ai\\pitchrr-orchestrator.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\lib\\ai\\intelligence-generator.ts"
];

for (const file of libFiles) {
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, 'utf8');
  
  // Add persona to function arguments
  if (file.includes('scraper.ts')) {
    text = text.replace(/scrapeAndExtractOpportunity\(url: string, rawText: string\)/, "scrapeAndExtractOpportunity(url: string, rawText: string, persona: 'startup' | 'career' = 'startup')");
    text = text.replace(/buildSystemPrompt\({ mode: 'intake' }\)/, "buildSystemPrompt({ mode: 'intake', persona })");
  }
  if (file.includes('fit-scorer.ts')) {
    text = text.replace(/scoreOpportunityFit\(profile: IStartupProfile, opportunity: IOpportunity\)/, "scoreOpportunityFit(profile: IStartupProfile, opportunity: IOpportunity, persona: 'startup' | 'career' = 'startup')");
    text = text.replace(/buildSystemPrompt\({ mode: 'analysis', profile, opportunity }\)/, "buildSystemPrompt({ mode: 'analysis', profile, opportunity, persona })");
  }

  fs.writeFileSync(file, text);
}

const apiRoutes = [
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\intake\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\assets\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\autodraft\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\draft-stream\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\intelligence\\chat\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\intelligence\\generate\\route.ts"
];

for (const route of apiRoutes) {
  if (!fs.existsSync(route)) continue;
  let text = fs.readFileSync(route, 'utf8');

  // Inject persona into scraper calls
  text = text.replace(/scrapeAndExtractOpportunity\(finalUrl, finalRawText\)/, "scrapeAndExtractOpportunity(finalUrl, finalRawText, session.user.persona as any)");
  text = text.replace(/scoreOpportunityFit\(profile as any, intakeResult as any\)/, "scoreOpportunityFit(profile as any, intakeResult as any, session.user.persona as any)");

  // Inject persona into buildSystemPrompt
  text = text.replace(/buildSystemPrompt\({([\s\S]*?)}\)/g, (match, p1) => {
    if (p1.includes('persona')) return match;
    return `buildSystemPrompt({${p1}, persona: session.user.persona as any })`;
  });

  fs.writeFileSync(route, text);
}
