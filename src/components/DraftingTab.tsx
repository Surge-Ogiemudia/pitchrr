'use client';

import { useRef, useState, useEffect, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';

interface Question { question: string; wordLimit: number | null; section: string; }
interface DraftedAnswer { questionIndex: number; content: string; status: string; }

interface Props {
  opportunity: {
    _id: string;
    scrapedQuestions: Question[];
    draftedAnswers: DraftedAnswer[];
  };
  onUpdate: (patch: { draftedAnswers?: DraftedAnswer[]; scrapedQuestions?: Question[] }) => void;
}

interface AutoDraftState {
  running: boolean; currentIdx: number | null; remaining: number[];
  stopped: boolean; done: boolean; streamText: string;
}

interface ChatQuestion { idx: number; question: string; wordLimit: number | null; }

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const TrashIcon = ({ size = 13 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const BoltIcon = ({ size = 13 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ChatIcon = ({ size = 13 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const CheckIcon = ({ size = 11 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const getMessageText = (m: any): string =>
  (m.parts as any[])?.filter((p: any) => p.type === 'text').map((p: any) => p.text as string).join('') ?? '';

function QuestionChatPanel({ opportunityId, questionIdx, question, wordLimit, currentDraft, onUpdate, onClose }: {
  opportunityId: string;
  questionIdx: number;
  question: string;
  wordLimit: number | null;
  currentDraft: string | null;
  onUpdate: (patch: any) => void;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initText = currentDraft
    ? `I have your current draft for this question. Want me to refine the angle, tighten the word count, make it more specific, or try a completely different approach?`
    : `Ready to draft. Tell me any specific angle you want, or just say "draft it" and I'll write the strongest version using the full intelligence context.`;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        mode: 'drafting',
        opportunityId,
        draftingContext: { question, wordLimit, questionIndex: questionIdx },
      },
    }),
    messages: [{ id: 'init', role: 'assistant', parts: [{ type: 'text', text: initText }] }],
    onFinish: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}`);
      if (res.ok) {
        const data = await res.json();
        onUpdate({ draftedAnswers: data.draftedAnswers });
      }
    },
    onError: (err) => alert('Chat error: ' + err.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isActive = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isActive) return;
    setInputValue('');
    sendMessage({ text: trimmed });
  };

  const wc = currentDraft ? countWords(currentDraft) : null;

  return (
    <div className="glass-card flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>
      <div className="px-4 py-3 border-b border-border flex-none">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Refining Q{questionIdx + 1}</span>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xs flex-none leading-none">✕</button>
        </div>
        <p className="text-xs text-muted leading-relaxed line-clamp-3">{question}</p>
        {wordLimit && <p className="text-[10px] text-muted mt-1">{wordLimit} word limit</p>}
      </div>

      {currentDraft && (
        <div className="px-4 py-2.5 border-b border-border bg-elevated/40 flex-none">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Current Draft</p>
            {wc !== null && wordLimit && (
              <span className={`text-[10px] font-medium ${wc > wordLimit ? 'text-danger' : wc >= wordLimit * 0.85 ? 'text-warning' : 'text-muted'}`}>
                {wc}/{wordLimit}w
              </span>
            )}
            {wc !== null && !wordLimit && (
              <span className="text-[10px] text-muted">{wc}w</span>
            )}
          </div>
          <p className="text-[11px] text-foreground/70 line-clamp-3 leading-relaxed">{currentDraft}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${(m.role as string) === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] px-3 py-2.5 ${(m.role as string) === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed text-sm">
                <ReactMarkdown>{getMessageText(m)}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {status === 'submitted' && (
          <div className="flex justify-start">
            <div className="chat-message-assistant px-3 py-2.5 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border flex-none">
        <div className="flex gap-2 mb-2 flex-wrap">
          {['Draft it', 'Tighten this', 'Different angle', 'Save that'].map((chip) => (
            <button
              key={chip}
              disabled={isActive}
              onClick={() => { setInputValue(''); sendMessage({ text: chip }); }}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border text-muted hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentDraft ? 'Shorten it / use story X / harder opening...' : 'Draft it / focus on the mission / lead with traction...'}
            disabled={isActive}
            className="flex-1 bg-elevated border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isActive || !inputValue.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-bold disabled:opacity-50 disabled:cursor-not-allowed text-xs whitespace-nowrap"
          >
            {isActive ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DraftingTab({ opportunity, onUpdate }: Props) {
  const id = opportunity._id;
  const [autoDraft, setAutoDraft] = useState<AutoDraftState>({ running: false, currentIdx: null, remaining: [], stopped: false, done: false, streamText: '' });
  const [correctionInput, setCorrectionInput] = useState('');
  const [savingRule, setSavingRule] = useState(false);
  const [singleDraft, setSingleDraft] = useState<{ idx: number; text: string } | null>(null);
  const [editMode, setEditMode] = useState<{ idx: number; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState<number | null>(null);
  const [fallbackText, setFallbackText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [chatQuestion, setChatQuestion] = useState<ChatQuestion | null>(null);
  const stopSignal = useRef(false);

  const isAnyDrafting = autoDraft.running || singleDraft !== null;
  const missingCount = opportunity.scrapedQuestions?.filter((_, idx) => !opportunity.draftedAnswers?.some(a => a.questionIndex === idx)).length ?? 0;

  const saveDraftLocal = async (idx: number, content: string, status = 'draft') => {
    await fetch(`/api/opportunities/${id}/draft`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: idx, content, status }),
    });
    const existing = opportunity.draftedAnswers.findIndex(a => a.questionIndex === idx);
    const newDraft = { questionIndex: idx, content, status };
    const updated = existing >= 0
      ? opportunity.draftedAnswers.map((a, j) => j === existing ? newDraft : a)
      : [...opportunity.draftedAnswers, newDraft];
    onUpdate({ draftedAnswers: updated });
  };

  const handleMarkFinal = (idx: number, content: string, currentStatus: string) => {
    saveDraftLocal(idx, content, currentStatus === 'final' ? 'draft' : 'final');
  };

  const startAutoDraft = async (queue: number[]) => {
    stopSignal.current = false;
    for (let i = 0; i < queue.length; i++) {
      if (stopSignal.current) {
        setAutoDraft(prev => ({ ...prev, running: false, stopped: true, remaining: queue.slice(i), streamText: '', currentIdx: null }));
        return;
      }
      const idx = queue[i];
      setAutoDraft(prev => ({ ...prev, currentIdx: idx, streamText: '' }));
      try {
        const res = await fetch(`/api/opportunities/${id}/draft-stream`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIndex: idx }),
        });
        if (!res.ok || !res.body) continue;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = ''; let aborted = false;
        while (true) {
          if (stopSignal.current) { reader.cancel(); aborted = true; break; }
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setAutoDraft(prev => ({ ...prev, streamText: fullText }));
        }
        if (aborted) { setAutoDraft(prev => ({ ...prev, running: false, stopped: true, remaining: queue.slice(i), streamText: '', currentIdx: null })); return; }
        await saveDraftLocal(idx, fullText);
      } catch (err) { console.error('Auto-draft error for question', idx, err); }
      setAutoDraft(prev => ({ ...prev, streamText: '', currentIdx: null }));
    }
    setAutoDraft({ running: false, currentIdx: null, remaining: [], stopped: false, done: true, streamText: '' });
    setTimeout(() => setAutoDraft(prev => ({ ...prev, done: false })), 5000);
  };

  const handleBeginAutoDraft = () => {
    const missing = opportunity.scrapedQuestions.map((_, idx) => idx).filter(idx => !opportunity.draftedAnswers?.some(a => a.questionIndex === idx));
    if (missing.length === 0) return;
    setAutoDraft({ running: true, currentIdx: null, remaining: missing, stopped: false, done: false, streamText: '' });
    startAutoDraft(missing);
  };

  const handleResume = async (saveRule: boolean) => {
    const remaining = autoDraft.remaining;
    if (saveRule && correctionInput.trim()) {
      setSavingRule(true);
      try { await fetch('/api/profile/drafting-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rule: correctionInput.trim() }) }); }
      finally { setSavingRule(false); }
    }
    setCorrectionInput('');
    setAutoDraft(prev => ({ ...prev, stopped: false, running: true }));
    startAutoDraft(remaining);
  };

  const handleSingleStream = async (idx: number) => {
    if (isAnyDrafting) return;
    setSingleDraft({ idx, text: '' }); setEditMode(null); setChatQuestion(null);
    try {
      const res = await fetch(`/api/opportunities/${id}/draft-stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIndex: idx }),
      });
      if (!res.ok || !res.body) { setSingleDraft(null); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setSingleDraft({ idx, text: fullText });
      }
      await saveDraftLocal(idx, fullText);
    } catch (err) { console.error('Single draft error', err); } finally { setSingleDraft(null); }
  };

  const handleOpenChat = (idx: number) => {
    setEditMode(null);
    setChatQuestion({ idx, question: opportunity.scrapedQuestions[idx].question, wordLimit: opportunity.scrapedQuestions[idx].wordLimit });
  };

  const handleSaveEdit = async () => {
    if (!editMode) return; setSavingEdit(true);
    try { await saveDraftLocal(editMode.idx, editMode.text); setEditMode(null); }
    finally { setSavingEdit(false); }
  };

  const handleClearAllDrafts = async () => {
    const res = await fetch(`/api/opportunities/${id}/draft`, { method: 'DELETE' });
    if (res.ok) onUpdate({ draftedAnswers: [] });
    setConfirmClearAll(false);
  };

  const handleDeleteDraft = async (questionIndex: number) => {
    const res = await fetch(`/api/opportunities/${id}/draft?questionIndex=${questionIndex}`, { method: 'DELETE' });
    if (res.ok) onUpdate({ draftedAnswers: opportunity.draftedAnswers.filter(a => a.questionIndex !== questionIndex) });
    setConfirmDeleteDraft(null);
  };

  const handleManualExtract = async () => {
    if (!fallbackText.trim()) return; setExtracting(true);
    try {
      const res = await fetch(`/api/opportunities/${id}/questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: fallbackText }),
      });
      if (res.ok) {
        const refreshRes = await fetch(`/api/opportunities/${id}`);
        if (refreshRes.ok) {
          const updated = await refreshRes.json();
          onUpdate({ scrapedQuestions: updated.scrapedQuestions });
        }
        setFallbackText(''); setShowFallback(false);
      }
    } finally { setExtracting(false); }
  };

  const draftCount = opportunity.draftedAnswers?.length || 0;
  const totalCount = opportunity.scrapedQuestions?.length || 0;
  const finalCount = opportunity.draftedAnswers?.filter(a => a.status === 'final').length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left — questions */}
      <div className="lg:col-span-2 space-y-8">
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="text-primary">⚡</span> Application Questions
            </h2>
            {opportunity.scrapedQuestions?.length > 0 && (
              <div className="flex items-center gap-2">
                {autoDraft.done ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-success px-3 py-1.5 bg-success/10 border border-success/30 rounded-lg">
                    <CheckIcon size={12} /> All Drafted!
                  </span>
                ) : autoDraft.running ? (
                  <button onClick={() => { stopSignal.current = true; }} className="px-4 py-2 text-xs font-bold bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 rounded-lg transition-colors flex items-center gap-2">
                    <span className="w-2 h-2 bg-warning rounded-sm" /> Stop
                  </button>
                ) : autoDraft.stopped ? (
                  <span className="text-xs font-semibold text-warning">{autoDraft.remaining.length} left</span>
                ) : (
                  <>
                    {confirmClearAll ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Clear all drafts?</span>
                        <button onClick={handleClearAllDrafts} className="px-3 py-1.5 text-xs font-bold bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 rounded-lg transition-colors">Clear</button>
                        <button onClick={() => setConfirmClearAll(false)} className="px-3 py-1.5 text-xs font-bold bg-elevated text-muted border border-border hover:text-foreground rounded-lg transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClearAll(true)} disabled={!opportunity.draftedAnswers?.length} title="Delete all drafts" className="p-2 text-muted hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <TrashIcon size={14} />
                      </button>
                    )}
                    <button onClick={handleBeginAutoDraft} disabled={missingCount === 0 || isAnyDrafting} className="px-4 py-2 text-xs font-bold bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                      <BoltIcon size={11} /> Auto-Draft All
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {autoDraft.stopped && (
            <div className="mb-6 p-4 bg-warning/5 border border-warning/20 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-warning">Paused — {autoDraft.remaining.length} question{autoDraft.remaining.length !== 1 ? 's' : ''} remaining</span>
                <div className="flex gap-2">
                  <button onClick={() => handleResume(false)} disabled={savingRule} className="px-3 py-1.5 text-xs font-bold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 rounded-lg transition-colors">Continue</button>
                  <button onClick={() => setAutoDraft({ running: false, currentIdx: null, remaining: [], stopped: false, done: false, streamText: '' })} className="px-3 py-1.5 text-xs font-bold bg-elevated text-muted border border-border hover:text-foreground rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
              <p className="text-xs text-muted mb-2">Add a correction rule <span className="text-warning/70">(saved permanently)</span></p>
              <div className="flex gap-2">
                <input value={correctionInput} onChange={e => setCorrectionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && correctionInput.trim() && handleResume(true)} placeholder="e.g. Don't mention Joy's story for technical questions" className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-warning transition-colors" />
                <button onClick={() => handleResume(true)} disabled={savingRule || !correctionInput.trim()} className="px-4 py-2 text-xs font-bold bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                  {savingRule ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {opportunity.scrapedQuestions?.length > 0 ? (
            <div className="space-y-6">
              {opportunity.scrapedQuestions.map((q, idx) => {
                const draft = opportunity.draftedAnswers?.find(a => a.questionIndex === idx);
                const isFullStreaming = autoDraft.currentIdx === idx;
                const isSingleStreaming = singleDraft?.idx === idx;
                const isEditing = editMode?.idx === idx;
                const isStreaming = isFullStreaming || isSingleStreaming;
                const isChatOpen = chatQuestion?.idx === idx;
                const streamingText = isFullStreaming ? autoDraft.streamText : (isSingleStreaming ? singleDraft!.text : '');
                const wc = draft ? countWords(draft.content) : null;
                const isOver = wc !== null && q.wordLimit !== null && wc > q.wordLimit;
                const isNear = wc !== null && q.wordLimit !== null && !isOver && wc >= q.wordLimit * 0.85;

                return (
                  <div key={idx} id={`question-${idx}`} className={`border-b border-border pb-6 last:border-0 last:pb-0`}>
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <h3 className={`font-medium text-sm leading-relaxed transition-colors ${isStreaming ? 'text-primary' : isChatOpen ? 'text-primary/80' : 'text-foreground'}`}>{q.question}</h3>
                      <div className="flex items-center gap-2 flex-none">
                        {q.wordLimit && <span className="text-xs text-muted whitespace-nowrap px-2 py-1 bg-elevated rounded-md">{q.wordLimit}w</span>}
                      </div>
                    </div>

                    {isStreaming ? (
                      <div className="mt-3 p-4 bg-elevated rounded-lg border border-primary/40">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Writing...</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{streamingText}<span className="inline-block w-px h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" /></p>
                      </div>
                    ) : isEditing ? (
                      <div className="mt-3">
                        <textarea value={editMode.text} onChange={e => setEditMode(prev => prev ? { ...prev, text: e.target.value } : null)} autoFocus rows={6} className="w-full bg-elevated border border-primary/40 rounded-lg p-4 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-y leading-relaxed" />
                        <div className="flex gap-2 justify-end mt-2">
                          <button onClick={() => setEditMode(null)} className="px-4 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors">Cancel</button>
                          <button onClick={handleSaveEdit} disabled={savingEdit} className="px-4 py-1.5 text-xs font-bold bg-primary text-[#0A0A0F] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5">
                            {savingEdit ? <><span className="w-2 h-2 rounded-full border-2 border-[#0A0A0F] border-t-transparent animate-spin" /> Saving...</> : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : draft ? (
                      <div className={`mt-3 p-4 bg-elevated rounded-lg border ${isChatOpen ? 'border-primary/30' : 'border-border'} transition-colors`}>
                        {confirmDeleteDraft === idx ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted flex-1">Delete this draft?</span>
                            <button onClick={() => handleDeleteDraft(idx)} className="px-3 py-1 text-xs font-bold bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 rounded-lg transition-colors">Delete</button>
                            <button onClick={() => setConfirmDeleteDraft(null)} className="px-3 py-1 text-xs font-bold bg-surface text-muted border border-border hover:text-foreground rounded-lg transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleMarkFinal(idx, draft.content, draft.status)}
                                  title={draft.status === 'final' ? 'Unmark as final' : 'Mark as final'}
                                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                                    draft.status === 'final'
                                      ? 'text-success bg-success/10 border border-success/30'
                                      : 'text-muted bg-elevated border border-border hover:text-success hover:border-success/30'
                                  }`}
                                >
                                  {draft.status === 'final' && <CheckIcon size={10} />}
                                  {draft.status === 'final' ? 'Final' : 'Draft'}
                                </button>
                                {wc !== null && (
                                  <span className={`text-[10px] font-medium ${isOver ? 'text-danger' : isNear ? 'text-warning' : 'text-muted'}`}>
                                    {wc}{q.wordLimit ? `/${q.wordLimit}w` : 'w'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  onClick={() => handleOpenChat(idx)}
                                  title="Refine with AI"
                                  className={`transition-colors ${isChatOpen ? 'text-primary' : 'text-muted hover:text-primary'}`}
                                >
                                  <ChatIcon />
                                </button>
                                <button onClick={() => setEditMode({ idx, text: draft.content })} title="Edit manually" className="text-muted hover:text-foreground transition-colors"><PencilIcon /></button>
                                <button onClick={() => handleSingleStream(idx)} disabled={isAnyDrafting} title="Re-draft with AI" className="text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><BoltIcon /></button>
                                <button onClick={() => setConfirmDeleteDraft(idx)} title="Delete draft" className="text-muted hover:text-danger transition-colors"><TrashIcon /></button>
                              </div>
                            </div>
                            <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{draft.content}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 mt-3">
                        <button onClick={() => handleSingleStream(idx)} disabled={isAnyDrafting} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          <BoltIcon size={12} /> Draft this
                        </button>
                        <button onClick={() => handleOpenChat(idx)} disabled={isAnyDrafting} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          <ChatIcon size={12} /> Chat draft
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No questions extracted yet. Paste the application form text below to extract them.</p>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            {!showFallback ? (
              <button onClick={() => setShowFallback(true)} className="text-sm font-semibold text-primary hover:text-primary-light transition-colors">+ Extract Missing Questions</button>
            ) : (
              <div className="bg-elevated p-4 rounded-xl border border-border">
                <h4 className="text-sm font-bold text-foreground mb-2">Paste Form Questions</h4>
                <p className="text-xs text-muted mb-4">Paste the raw text of the questions and Pitchrr will extract and structure them.</p>
                <textarea value={fallbackText} onChange={e => setFallbackText(e.target.value)} placeholder="Paste questions here..." className="w-full h-32 bg-surface border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-primary mb-3" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowFallback(false)} className="px-4 py-2 text-xs font-semibold text-muted hover:text-foreground">Cancel</button>
                  <button onClick={handleManualExtract} disabled={extracting || !fallbackText.trim()} className="px-4 py-2 text-xs font-semibold bg-primary text-[#0A0A0F] rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {extracting ? <><span className="w-2 h-2 rounded-full border-2 border-[#0A0A0F] border-t-transparent animate-spin" /> Extracting...</> : 'Extract Questions'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right — chat panel or progress */}
      <div className="lg:sticky lg:top-8 self-start space-y-4">
        {chatQuestion ? (
          <QuestionChatPanel
            key={chatQuestion.idx}
            opportunityId={id}
            questionIdx={chatQuestion.idx}
            question={chatQuestion.question}
            wordLimit={chatQuestion.wordLimit}
            currentDraft={opportunity.draftedAnswers?.find(a => a.questionIndex === chatQuestion.idx)?.content ?? null}
            onUpdate={onUpdate}
            onClose={() => setChatQuestion(null)}
          />
        ) : (
          <>
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Progress</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted">Drafted</span>
                    <span className="font-semibold text-foreground">{draftCount} / {totalCount}</span>
                  </div>
                  <div className="w-full bg-elevated rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: totalCount ? `${(draftCount / totalCount) * 100}%` : '0%' }} />
                  </div>
                </div>
                {finalCount > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted">Finalised</span>
                      <span className="font-semibold text-success">{finalCount} / {totalCount}</span>
                    </div>
                    <div className="w-full bg-elevated rounded-full h-1.5">
                      <div className="bg-success h-1.5 rounded-full transition-all" style={{ width: totalCount ? `${(finalCount / totalCount) * 100}%` : '0%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {totalCount > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Questions</h3>
                <div className="space-y-1.5">
                  {opportunity.scrapedQuestions.map((q, idx) => {
                    const draft = opportunity.draftedAnswers?.find(a => a.questionIndex === idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => document.getElementById(`question-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        className="w-full flex items-center gap-2.5 text-left group"
                      >
                        <div className={`w-4 h-4 rounded-full flex-none flex items-center justify-center ${
                          draft?.status === 'final' ? 'bg-success/20 border border-success/50' :
                          draft ? 'bg-primary/20 border border-primary/50' :
                          'bg-elevated border border-border'
                        }`}>
                          {draft?.status === 'final' && <CheckIcon size={8} />}
                          {draft && draft.status !== 'final' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <span className={`text-xs leading-snug group-hover:text-foreground transition-colors truncate ${draft ? 'text-foreground/70' : 'text-muted'}`}>
                          {q.question.length > 55 ? q.question.slice(0, 55) + '...' : q.question}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">How Refinement Works</h3>
              <div className="space-y-2.5">
                {[
                  { icon: '⚡', text: 'Auto-Draft: fast batch, no chat' },
                  { icon: '💬', text: '"Chat draft" to build interactively' },
                  { icon: '✦', text: '"Refine" on any draft to iterate' },
                  { icon: '✓', text: 'Mark final when happy — tracked separately' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <span className="text-sm flex-none mt-0.5">{icon}</span>
                    <p className="text-xs text-muted leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
