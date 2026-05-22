import { runPitchrrOrchestrator } from '@/lib/ai/pitchrr-orchestrator';
import { AIMode } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const { messages, mode, opportunityId, draftingContext } = await req.json();

    const result = await runPitchrrOrchestrator({
      mode: mode as AIMode,
      messages,
      opportunityId,
      draftingContext,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
