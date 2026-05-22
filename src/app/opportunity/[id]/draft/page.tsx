'use client';

import { use, useState, useEffect, useRef, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Opportunity {
  _id: string;
  programmeName: string;
  scrapedQuestions: { question: string; wordLimit: number | null; section: string }[];
  draftedAnswers: { questionIndex: number; content: string; status: string }[];
}

const getMessageText = (m: any) =>
  (m.parts as any[])
    ?.filter((p: any) => p.type === 'text')
    .map((p: any) => p.text as string)
    .join('') ?? '';

// Extracts only the draft content, stripping any STRATEGY section
function extractDraftSection(text: string): string {
  let content = text;

  // Split off everything from STRATEGY marker onwards
  const strategyStart = content.search(/\n#{1,3}\s*STRATEGY|\n\*\*STRATEGY\*\*|\n---\s*\n[\s\S]*?STRATEGY/im);
  if (strategyStart !== -1) content = content.substring(0, strategyStart);

  // Strip leading DRAFT heading/label
  content = content.replace(/^#{1,3}\s*DRAFT[^\n]*\n+/im, '').replace(/^\*\*DRAFT\*\*[^\n]*\n+/im, '').trim();

  // If nothing extracted cleanly, just return the full trimmed text
  return content || text.trim();
}

export default function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionIdx = parseInt(searchParams.get('q') || '0', 10);

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);
  const lastInitedQRef = useRef<number | null>(null);

  const updateLocalDraft = (content: string) => {
    setOpportunity(prev => {
      if (!prev) return prev;
      const existing = prev.draftedAnswers.findIndex(a => a.questionIndex === questionIdx);
      const newDraft = { questionIndex: questionIdx, content, status: 'draft' };
      return {
        ...prev,
        draftedAnswers: existing >= 0
          ? prev.draftedAnswers.map((a, i) => i === existing ? newDraft : a)
          : [...prev.draftedAnswers, newDraft],
      };
    });
  };

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { mode: 'drafting', opportunityId: id },
    }),
    onError: (err) => alert('Chat Error: ' + err.message),
  });

  const handleSaveMessage = async (msgId: string, text: string) => {
    const content = extractDraftSection(text);
    try {
      await fetch(`/api/opportunities/${id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIndex: questionIdx, content, status: 'draft' }),
      });
      updateLocalDraft(content);
      setSavedMsgId(msgId);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const isActive = status === 'submitted' || status === 'streaming';

  // Fetch opportunity once on mount
  useEffect(() => {
    const fetchOpp = async () => {
      try {
        const res = await fetch(`/api/opportunities/${id}`);
        if (res.ok) setOpportunity(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOpp();
  }, [id]); // eslint-disable-line

  // Initialise chat whenever the active question changes — no auto-send, no token waste
  useEffect(() => {
    if (!opportunity) return;
    if (lastInitedQRef.current === questionIdx) return; // already set up for this question
    lastInitedQRef.current = questionIdx;
    setInputValue('');

    const existingDraft = opportunity.draftedAnswers?.find(a => a.questionIndex === questionIdx);
    const currentQ = opportunity.scrapedQuestions[questionIdx];

    if (existingDraft) {
      setMessages([{
        id: `q${questionIdx}-existing`,
        role: 'assistant',
        parts: [{ type: 'text', text: `This field already has a draft:\n\n---\n\n${existingDraft.content}\n\n---\n\nTell me what to change, or say "rewrite it" for a completely fresh attempt. I can also update the field directly when you're happy.` }],
      }]);
    } else if (currentQ) {
      setMessages([{
        id: `q${questionIdx}-ready`,
        role: 'assistant',
        parts: [{ type: 'text', text: `What would you like to do with **${currentQ.question}**${currentQ.wordLimit ? ` (${currentQ.wordLimit} words)` : ''}?\n\nSay "draft it" and I'll write the strongest possible answer using your profile — or give me a specific angle first.` }],
      }]);
    }
  }, [opportunity, questionIdx]); // eslint-disable-line

  if (loading) return <div className="min-h-screen pt-24 text-center">Loading...</div>;
  if (!opportunity) return <div className="min-h-screen pt-24 text-center text-danger">Not found</div>;

  const currentQ = opportunity.scrapedQuestions[questionIdx];
  const savedDraft = opportunity.draftedAnswers?.find(a => a.questionIndex === questionIdx);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isActive) return;
    setInputValue('');
    sendMessage(
      { text: trimmed },
      {
        body: {
          draftingContext: currentQ
            ? { question: currentQ.question, wordLimit: currentQ.wordLimit, questionIndex: questionIdx }
            : undefined,
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-6 overflow-hidden">
        {/* Left Column */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 pb-8">
          <Link href={`/opportunity/${id}`} className="text-sm text-primary hover:underline">
            ← Back to {opportunity.programmeName}
          </Link>

          {/* Current Question */}
          <div className="glass-card p-5 mt-2">
            <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Current Question</h3>
            <p className="text-foreground font-medium mb-3">{currentQ?.question}</p>
            {currentQ?.wordLimit && (
              <span className="text-xs font-semibold bg-elevated px-2 py-1 rounded text-muted">
                Limit: {currentQ.wordLimit} words
              </span>
            )}
          </div>

          {/* Saved Draft */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Saved Draft</h3>
              {savedDraft && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded text-primary bg-primary/10 uppercase">
                  {savedDraft.status}
                </span>
              )}
            </div>
            {savedDraft ? (
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{savedDraft.content}</p>
            ) : (
              <p className="text-muted text-xs italic">Not saved yet. Chat to draft, then say "save it to the field".</p>
            )}
          </div>

          {/* All Questions */}
          <div className="glass-card p-5 flex-1">
            <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wide">All Questions</h3>
            <div className="space-y-3">
              {opportunity.scrapedQuestions.map((q, idx) => {
                const draftEntry = opportunity.draftedAnswers?.find(a => a.questionIndex === idx);
                const isDrafted = !!draftEntry;
                return (
                  <div
                    key={idx}
                    onClick={() => router.push(`/opportunity/${id}/draft?q=${idx}`)}
                    className={`p-3 rounded-lg text-sm cursor-pointer border transition-colors ${idx === questionIdx ? 'bg-primary/10 border-primary text-primary-light' : 'bg-elevated border-border text-muted hover:text-foreground'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 flex-none w-1.5 h-1.5 rounded-full ${isDrafted ? 'bg-success' : 'bg-border'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1">{q.question}</p>
                        {draftEntry && (
                          <p className="mt-1 text-xs line-clamp-2 text-success/80 leading-relaxed">
                            {draftEntry.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Chat */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((m) => {
              const text = getMessageText(m);
              const isSaved = savedMsgId === m.id;
              const isWelcome = /^q\d+-(ready|existing)$/.test(m.id);
              const saveable = m.role === 'assistant' && !isActive && !isWelcome && text.trim().length > 80;
              return (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-5 py-4 ${m.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#0A0A0F] prose-pre:border prose-pre:border-border">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                    {saveable && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
                        <button
                          onClick={() => handleSaveMessage(m.id, text)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            isSaved
                              ? 'bg-success/20 text-success border-success/50 cursor-default'
                              : 'bg-success/10 text-success/70 border-success/20 hover:bg-success/20 hover:text-success hover:border-success/50'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Saved to field
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                              Save to field
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="chat-message-assistant px-5 py-4 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-surface">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Refine the draft, or say "save it to the field"…'
                disabled={isActive}
                className="flex-1 bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isActive || !inputValue.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActive ? 'Writing...' : 'Send'}
              </button>
            </form>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-muted">
                {isActive ? 'Drafting...' : savedMsgId ? '✓ Field updated — left panel refreshed.' : 'Click "Save to field" on any AI message to save it.'}
              </span>
              <button
                onClick={() => router.push(`/opportunity/${id}`)}
                className="text-xs font-semibold text-primary border border-primary px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
              >
                Done & Go Back
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
