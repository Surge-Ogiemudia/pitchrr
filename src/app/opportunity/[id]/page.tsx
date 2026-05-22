'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Opportunity {
  _id: string;
  programmeName: string;
  organisation: string;
  url: string;
  deadline: string | null;
  prizeAmount: string;
  eligibilityCriteria: string;
  evaluationCriteria: string;
  status: string;
  fitScore: {
    overall: number;
    breakdown: { category: string; score: number; maxScore: number; explanation: string }[];
  };
  scrapedQuestions: { question: string; wordLimit: number | null; section: string }[];
  draftedAnswers: { questionIndex: number; content: string; status: string }[];
}

interface AutoDraftState {
  running: boolean;
  currentIdx: number | null;
  remaining: number[];
  stopped: boolean;
  done: boolean;
  streamText: string;
}

const TrashIcon = ({ size = 13 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

export default function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackText, setFallbackText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState<number | null>(null);

  // Full auto-draft-all state
  const [autoDraft, setAutoDraft] = useState<AutoDraftState>({
    running: false, currentIdx: null, remaining: [], stopped: false, done: false, streamText: '',
  });
  const [correctionInput, setCorrectionInput] = useState('');
  const [savingRule, setSavingRule] = useState(false);
  const stopSignal = useRef(false);

  // Per-field single-draft stream state
  const [singleDraft, setSingleDraft] = useState<{ idx: number; text: string } | null>(null);

  // Per-field manual edit state
  const [editMode, setEditMode] = useState<{ idx: number; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const router = useRouter();
  const isAnyDrafting = autoDraft.running || singleDraft !== null;

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
  }, [id]);

  // Scroll active field into view during auto-draft-all
  useEffect(() => {
    if (autoDraft.currentIdx !== null) {
      document.getElementById(`question-${autoDraft.currentIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoDraft.currentIdx]);

  // ─── Streaming helpers ──────────────────────────────────────────────────────

  const saveDraft = async (idx: number, content: string) => {
    await fetch(`/api/opportunities/${id}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: idx, content, status: 'draft' }),
    });
    setOpportunity(prev => {
      if (!prev) return prev;
      const existing = prev.draftedAnswers.findIndex(a => a.questionIndex === idx);
      const newDraft = { questionIndex: idx, content, status: 'draft' };
      return {
        ...prev,
        draftedAnswers: existing >= 0
          ? prev.draftedAnswers.map((a, j) => j === existing ? newDraft : a)
          : [...prev.draftedAnswers, newDraft],
      };
    });
  };

  // ─── Auto-draft all ─────────────────────────────────────────────────────────

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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIndex: idx }),
        });

        if (!res.ok || !res.body) continue;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let aborted = false;

        while (true) {
          if (stopSignal.current) {
            reader.cancel();
            aborted = true;
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setAutoDraft(prev => ({ ...prev, streamText: fullText }));
        }

        if (aborted) {
          setAutoDraft(prev => ({ ...prev, running: false, stopped: true, remaining: queue.slice(i), streamText: '', currentIdx: null }));
          return;
        }

        await saveDraft(idx, fullText);
      } catch (err) {
        console.error('Auto-draft error for question', idx, err);
      }

      setAutoDraft(prev => ({ ...prev, streamText: '', currentIdx: null }));
    }

    setAutoDraft({ running: false, currentIdx: null, remaining: [], stopped: false, done: true, streamText: '' });
    setTimeout(() => setAutoDraft(prev => ({ ...prev, done: false })), 5000);
  };

  const handleBeginAutoDraft = () => {
    if (!opportunity) return;
    const missing = opportunity.scrapedQuestions
      .map((_, idx) => idx)
      .filter(idx => !opportunity.draftedAnswers?.some(a => a.questionIndex === idx));
    if (missing.length === 0) return;
    setAutoDraft({ running: true, currentIdx: null, remaining: missing, stopped: false, done: false, streamText: '' });
    startAutoDraft(missing);
  };

  const handleStop = () => { stopSignal.current = true; };

  const handleResume = async (saveRule: boolean) => {
    const remaining = autoDraft.remaining;
    if (saveRule && correctionInput.trim()) {
      setSavingRule(true);
      try {
        await fetch('/api/profile/drafting-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule: correctionInput.trim() }),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSavingRule(false);
      }
    }
    setCorrectionInput('');
    setAutoDraft(prev => ({ ...prev, stopped: false, running: true }));
    startAutoDraft(remaining);
  };

  const handleCancelAutoDraft = () => {
    setCorrectionInput('');
    setAutoDraft({ running: false, currentIdx: null, remaining: [], stopped: false, done: false, streamText: '' });
  };

  // ─── Single-field stream ─────────────────────────────────────────────────────

  const handleSingleStream = async (idx: number) => {
    if (isAnyDrafting) return;
    setSingleDraft({ idx, text: '' });
    setEditMode(null);

    try {
      const res = await fetch(`/api/opportunities/${id}/draft-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIndex: idx }),
      });

      if (!res.ok || !res.body) { setSingleDraft(null); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setSingleDraft({ idx, text: fullText });
      }

      await saveDraft(idx, fullText);
    } catch (err) {
      console.error('Single draft error', err);
    } finally {
      setSingleDraft(null);
    }
  };

  // ─── Manual edit ─────────────────────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!editMode) return;
    setSavingEdit(true);
    try {
      await saveDraft(editMode.idx, editMode.text);
      setEditMode(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Delete helpers ──────────────────────────────────────────────────────────

  const handleClearAllDrafts = async () => {
    try {
      const res = await fetch(`/api/opportunities/${id}/draft`, { method: 'DELETE' });
      if (res.ok) setOpportunity(prev => prev ? { ...prev, draftedAnswers: [] } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmClearAll(false);
    }
  };

  const handleDeleteDraft = async (questionIndex: number) => {
    try {
      const res = await fetch(`/api/opportunities/${id}/draft?questionIndex=${questionIndex}`, { method: 'DELETE' });
      if (res.ok) {
        setOpportunity(prev => prev ? {
          ...prev,
          draftedAnswers: prev.draftedAnswers.filter(a => a.questionIndex !== questionIndex),
        } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDeleteDraft(null);
    }
  };

  const handleManualExtract = async () => {
    if (!fallbackText.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/opportunities/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: fallbackText }),
      });
      if (res.ok) {
        setFallbackText('');
        setShowFallback(false);
        const refreshRes = await fetch(`/api/opportunities/${id}`);
        if (refreshRes.ok) setOpportunity(await refreshRes.json());
      } else {
        alert('Failed to extract questions');
      }
    } catch (err) {
      console.error(err);
      alert('Error extracting questions');
    } finally {
      setExtracting(false);
    }
  };

  if (loading) return <div className="min-h-screen pt-24 text-center text-muted">Loading opportunity...</div>;
  if (!opportunity) return <div className="min-h-screen pt-24 text-center text-danger">Opportunity not found</div>;

  const missingCount = opportunity.scrapedQuestions?.filter(
    (_, idx) => !opportunity.draftedAnswers?.some(a => a.questionIndex === idx)
  ).length ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
          ← Back to Pipeline
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border status-${opportunity.status}`}>
                {opportunity.status.toUpperCase()}
              </span>
              {opportunity.deadline && (
                <span className="text-sm font-medium text-warning bg-warning/10 px-3 py-1 rounded-full">
                  Due {formatDistanceToNow(new Date(opportunity.deadline), { addSuffix: true })}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{opportunity.programmeName}</h1>
            <p className="text-xl text-muted">{opportunity.organisation}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-2xl font-bold border-primary text-primary shadow-[0_0_20px_var(--primary-glow)]">
              {opportunity.fitScore?.overall || 0}
            </div>
            <span className="text-xs text-muted mt-2 font-medium">FIT SCORE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-6">

              {/* Header row */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary">⚡</span> Application Questions
                </h2>

                {opportunity.scrapedQuestions?.length > 0 && (
                  <div className="flex items-center gap-2">
                    {autoDraft.done ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-success px-3 py-1.5 bg-success/10 border border-success/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        All Drafted!
                      </span>
                    ) : autoDraft.running ? (
                      <button onClick={handleStop} className="px-4 py-2 text-xs font-bold bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 rounded-lg transition-colors flex items-center gap-2">
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

              {/* Paused / correction panel */}
              {autoDraft.stopped && (
                <div className="mb-6 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-warning">
                      Paused — {autoDraft.remaining.length} question{autoDraft.remaining.length !== 1 ? 's' : ''} remaining
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => handleResume(false)} disabled={savingRule} className="px-3 py-1.5 text-xs font-bold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 rounded-lg transition-colors">Continue</button>
                      <button onClick={handleCancelAutoDraft} className="px-3 py-1.5 text-xs font-bold bg-elevated text-muted border border-border hover:text-foreground rounded-lg transition-colors">Cancel</button>
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-2">Add a correction rule <span className="text-warning/70">(saved permanently — AI will never repeat this mistake)</span></p>
                  <div className="flex gap-2">
                    <input
                      value={correctionInput}
                      onChange={e => setCorrectionInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && correctionInput.trim() && handleResume(true)}
                      placeholder="e.g. Don't mention Joy's story for technical questions"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-warning transition-colors"
                    />
                    <button onClick={() => handleResume(true)} disabled={savingRule || !correctionInput.trim()} className="px-4 py-2 text-xs font-bold bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                      {savingRule ? 'Saving...' : 'Save & Continue'}
                    </button>
                  </div>
                </div>
              )}

              {/* Questions list */}
              {opportunity.scrapedQuestions?.length > 0 ? (
                <div className="space-y-6">
                  {opportunity.scrapedQuestions.map((q, idx) => {
                    const draft = opportunity.draftedAnswers?.find(a => a.questionIndex === idx);
                    const isFullStreaming = autoDraft.currentIdx === idx;
                    const isSingleStreaming = singleDraft?.idx === idx;
                    const isEditing = editMode?.idx === idx;
                    const isStreaming = isFullStreaming || isSingleStreaming;
                    const streamingText = isFullStreaming ? autoDraft.streamText : (isSingleStreaming ? singleDraft!.text : '');

                    return (
                      <div key={idx} id={`question-${idx}`} className="border-b border-border pb-6 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2 gap-4">
                          <h3 className={`font-medium text-sm leading-relaxed transition-colors ${isStreaming ? 'text-primary' : 'text-foreground'}`}>
                            {q.question}
                          </h3>
                          {q.wordLimit && (
                            <span className="text-xs text-muted whitespace-nowrap px-2 py-1 bg-elevated rounded-md">{q.wordLimit} words</span>
                          )}
                        </div>

                        {/* Field body */}
                        {isStreaming ? (
                          <div className="mt-3 p-4 bg-elevated rounded-lg border border-primary/40">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Writing...</span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {streamingText}
                              <span className="inline-block w-px h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                            </p>
                          </div>
                        ) : isEditing ? (
                          <div className="mt-3">
                            <textarea
                              value={editMode.text}
                              onChange={e => setEditMode(prev => prev ? { ...prev, text: e.target.value } : null)}
                              autoFocus
                              rows={6}
                              className="w-full bg-elevated border border-primary/40 rounded-lg p-4 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-y leading-relaxed"
                            />
                            <div className="flex gap-2 justify-end mt-2">
                              <button onClick={() => setEditMode(null)} className="px-4 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors">Cancel</button>
                              <button onClick={handleSaveEdit} disabled={savingEdit} className="px-4 py-1.5 text-xs font-bold bg-primary text-[#0A0A0F] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5">
                                {savingEdit ? <><span className="w-2 h-2 rounded-full border-2 border-[#0A0A0F] border-t-transparent animate-spin" /> Saving...</> : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : draft ? (
                          <div className="mt-3 p-4 bg-elevated rounded-lg border border-border">
                            {confirmDeleteDraft === idx ? (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted flex-1">Delete this draft?</span>
                                <button onClick={() => handleDeleteDraft(idx)} className="px-3 py-1 text-xs font-bold bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 rounded-lg transition-colors">Delete</button>
                                <button onClick={() => setConfirmDeleteDraft(null)} className="px-3 py-1 text-xs font-bold bg-surface text-muted border border-border hover:text-foreground rounded-lg transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${draft.status === 'final' ? 'text-success bg-success/10' : 'text-primary bg-primary/10'}`}>
                                    {draft.status}
                                  </span>
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      onClick={() => setEditMode({ idx, text: draft.content })}
                                      title="Edit manually"
                                      className="text-muted hover:text-foreground transition-colors"
                                    >
                                      <PencilIcon />
                                    </button>
                                    <button
                                      onClick={() => handleSingleStream(idx)}
                                      disabled={isAnyDrafting}
                                      title="Re-draft with AI"
                                      className="text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <BoltIcon />
                                    </button>
                                    <button onClick={() => setConfirmDeleteDraft(idx)} title="Delete draft" className="text-muted hover:text-danger transition-colors">
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-muted whitespace-pre-wrap">{draft.content}</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 mt-3">
                            <button
                              onClick={() => handleSingleStream(idx)}
                              disabled={isAnyDrafting}
                              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <BoltIcon size={12} /> Draft this
                            </button>
                            <span className="text-border text-xs">|</span>
                            <button
                              onClick={() => router.push(`/opportunity/${opportunity._id}/draft?q=${idx}`)}
                              className="text-sm text-muted hover:text-foreground transition-colors font-medium"
                            >
                              + Open in Chat
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">No questions extracted yet.</p>
              )}

              {/* Fallback Question Extraction UI */}
              <div className="mt-8 pt-6 border-t border-border">
                {!showFallback ? (
                  <button onClick={() => setShowFallback(true)} className="text-sm font-semibold text-primary hover:text-primary-light transition-colors">
                    + Extract Missing Questions
                  </button>
                ) : (
                  <div className="bg-elevated p-4 rounded-xl border border-border">
                    <h4 className="text-sm font-bold text-foreground mb-2">Paste Form Questions</h4>
                    <p className="text-xs text-muted mb-4">Paste the raw text of the questions (e.g. from a Google Form) and Pitchrr will automatically extract and structure them.</p>
                    <textarea
                      value={fallbackText}
                      onChange={e => setFallbackText(e.target.value)}
                      placeholder="Paste questions here..."
                      className="w-full h-32 bg-surface border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-primary mb-3"
                    />
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

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider text-muted">Opportunity Intel</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="block text-xs text-muted mb-1">Prize/Funding</span>
                  <span className="font-medium text-success">{opportunity.prizeAmount || 'Not specified'}</span>
                </div>
                <div>
                  <span className="block text-xs text-muted mb-1">Source URL</span>
                  <a href={opportunity.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{opportunity.url}</a>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider text-muted">Fit Breakdown</h3>
              {opportunity.fitScore?.breakdown?.length > 0 ? (
                <div className="space-y-3">
                  {opportunity.fitScore.breakdown.map((b, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">{b.category}</span>
                        <span className="font-medium text-foreground">{b.score}/{b.maxScore}</span>
                      </div>
                      <div className="w-full bg-elevated rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(b.score / b.maxScore) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No fit breakdown available.</p>
              )}
            </div>

            <button className="w-full py-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-semibold">
              Generate Briefing Document
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
