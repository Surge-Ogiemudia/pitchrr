const fs = require('fs');
const path = require('path');

const routesToUpdate = [
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\intake\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\assets\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\autodraft\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\draft-stream\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\draft\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\intelligence\\chat\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\intelligence\\generate\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\questions\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\review\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\[id]\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\opportunities\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\profile\\drafting-rules\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\profile\\resources\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\profile\\route.ts",
  "c:\\Users\\HP\\Desktop\\preparr\\pitchrr\\src\\app\\api\\profile\\stories\\route.ts"
];

for (const filePath of routesToUpdate) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports if missing
  if (!content.includes("getServerSession")) {
    const importStatement = `import { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/auth';\n`;
    content = content.replace(/(import .*;\n)/, `$1${importStatement}`);
  }

  // Inject session check at the start of exported functions
  const sessionCheckNextResponse = `
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  `;
  const sessionCheckResponse = `
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }
  `;

  // We will just do a simple replacement for try {
  if (content.includes('NextResponse.json')) {
    content = content.replace(/try\s*{/, `try {${sessionCheckNextResponse}`);
  } else {
    content = content.replace(/try\s*{/, `try {${sessionCheckResponse}`);
  }

  // Replace queries
  content = content.replace(/StartupProfile\.findOne\(\)/g, "StartupProfile.findOne({ userId: session.user.id })");
  content = content.replace(/StartupProfile\.findOneAndUpdate\({}/g, "StartupProfile.findOneAndUpdate({ userId: session.user.id }");
  content = content.replace(/Opportunity\.findById\(params\.id\)/g, "Opportunity.findOne({ _id: params.id, userId: session.user.id })");
  content = content.replace(/Opportunity\.findById\(id\)/g, "Opportunity.findOne({ _id: id, userId: session.user.id })");
  content = content.replace(/Opportunity\.find\(\)/g, "Opportunity.find({ userId: session.user.id })");
  
  // Intake route inserts new Opportunity
  if (filePath.includes('intake')) {
    content = content.replace(/new Opportunity\(\{/, "new Opportunity({ userId: session.user.id, ");
  }

  // Profile route inserts new Profile if none
  if (filePath.includes('profile')) {
    content = content.replace(/new StartupProfile\(\{/, "new StartupProfile({ userId: session.user.id, ");
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${path.basename(path.dirname(filePath))}/${path.basename(filePath)}`);
}
