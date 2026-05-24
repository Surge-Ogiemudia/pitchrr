'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface Question { question: string; wordLimit: number | null; }
interface Draft { questionIndex: number; content: string; }
interface Opp {
  _id: string;
  programmeName: string;
  organisation: string;
  status: string;
  scrapedQuestions: Question[];
  draftedAnswers: Draft[];
}

export default function FillPage() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Opp | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'info' | 'ok' | 'err'; text: string } | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  // Sequential fill mode
  const [seqMode, setSeqMode] = useState(false);
  const [seqIdx, setSeqIdx] = useState(0);
  const [seqCopied, setSeqCopied] = useState(false);

  useEffect(() => {
    fetch('/api/opportunities')
      .then(r => r.ok ? r.json() : [])
      .then(setOpps)
      .finally(() => setLoading(false));
  }, []);

  const reload = async (id: string): Promise<Opp | null> => {
    const r = await fetch(`/api/opportunities/${id}`);
    if (!r.ok) return null;
    const updated: Opp = await r.json();
    setOpps(prev => prev.map(o => o._id === id ? updated : o));
    return updated;
  };

  const draftAll = async (opp: Opp) => {
    setDrafting(true);
    const total = opp.scrapedQuestions?.length || 0;
    let draftedSoFar = opp.draftedAnswers?.length || 0;
    const needed = total - draftedSoFar;
    let justDrafted = 0;

    for (let i = 0; i < needed; i++) {
      setMsg({ type: 'info', text: `Drafting answer ${draftedSoFar + 1} of ${total}...` });
      try {
        const res = await fetch(`/api/opportunities/${opp._id}/autodraft`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const alreadyDone = justDrafted > 0;
          setMsg({
            type: alreadyDone ? 'ok' : 'err',
            text: alreadyDone
              ? `${justDrafted} answer${justDrafted !== 1 ? 's' : ''} drafted. Tap again to continue.`
              : (data.error || 'Drafting failed — tap again to retry'),
          });
          const updated = await reload(opp._id);
          if (updated) setSelected(updated);
          setDrafting(false);
          return;
        }
        draftedSoFar++;
        justDrafted++;
        const updated = await reload(opp._id);
        if (updated) setSelected(updated);
        if (data.remaining === 0) break;
      } catch {
        const alreadyDone = justDrafted > 0;
        setMsg({
          type: alreadyDone ? 'ok' : 'err',
          text: alreadyDone
            ? `${justDrafted} answer${justDrafted !== 1 ? 's' : ''} drafted. Tap again to continue.`
            : 'Connection timed out — tap again to continue',
        });
        const updated = await reload(opp._id);
        if (updated) setSelected(updated);
        setDrafting(false);
        return;
      }
    }

    setMsg({ type: 'ok', text: `All ${total} answers drafted. Ready to fill.` });
    setDrafting(false);
  };

  const extractAndDraft = async (opp: Opp) => {
    if (!pasteText.trim()) return;
    setExtracting(true);
    setMsg({ type: 'info', text: 'Extracting questions...' });
    try {
      const res = await fetch(`/api/opportunities/${opp._id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'No questions found in that text' }); return; }
      setPasteText('');
      const updated = await reload(opp._id);
      if (updated) { setSelected(updated); await draftAll(updated); }
    } catch {
      setMsg({ type: 'err', text: 'Network error' });
    } finally {
      setExtracting(false);
    }
  };

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const enterSeqMode = useCallback(async (opp: Opp) => {
    setSeqIdx(0);
    setSeqMode(true);
    setSeqCopied(false);
    const draftedIndices = (opp.scrapedQuestions || [])
      .map((_, i) => i)
      .filter(i => opp.draftedAnswers?.some(a => a.questionIndex === i));
    const draft = opp.draftedAnswers?.find(a => a.questionIndex === draftedIndices[0]);
    if (draft) {
      await navigator.clipboard.writeText(draft.content);
      setSeqCopied(true);
    }
  }, []);

  const seqNext = useCallback(async (opp: Opp, nextSeqIdx: number) => {
    const draftedIndices = (opp.scrapedQuestions || [])
      .map((_, i) => i)
      .filter(i => opp.draftedAnswers?.some(a => a.questionIndex === i));
    setSeqIdx(nextSeqIdx);
    setSeqCopied(false);
    const draft = opp.draftedAnswers?.find(a => a.questionIndex === draftedIndices[nextSeqIdx]);
    if (draft) {
      await navigator.clipboard.writeText(draft.content);
      setSeqCopied(true);
    }
  }, []);

  const msgClass = msg?.type === 'ok'
    ? 'bg-success/10 border-success/20 text-success'
    : msg?.type === 'err'
    ? 'bg-danger/10 border-danger/20 text-danger'
    : 'bg-primary/10 border-primary/20 text-primary';

  // ── Sequential fill mode ──
  if (selected && seqMode) {
    const questions = selected.scrapedQuestions || [];
    const draftedIndices = questions
      .map((_, i) => i)
      .filter(i => selected.draftedAnswers?.some(a => a.questionIndex === i));
    const currentQIdx = draftedIndices[seqIdx];
    const q = questions[currentQIdx];
    const draft = selected.draftedAnswers?.find(a => a.questionIndex === currentQIdx);
    const isLast = seqIdx === draftedIndices.length - 1;

    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSeqMode(false)}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              ← Back to all answers
            </button>
            <span className="text-xs font-semibold text-subtle bg-elevated px-3 py-1.5 rounded-full border border-border">
              {seqIdx + 1} / {draftedIndices.length}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-6 justify-center">
            {draftedIndices.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < seqIdx ? 'bg-success flex-1' :
                  i === seqIdx ? 'bg-primary flex-[2]' :
                  'bg-elevated flex-1'
                }`}
              />
            ))}
          </div>

          <div className="glass-card p-5 mb-4">
            <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">
              Question {seqIdx + 1}{q?.wordLimit ? ` · ${q.wordLimit} words` : ''}
            </p>
            <p className="text-sm text-foreground leading-relaxed mb-4">{q?.question}</p>

            {draft ? (
              <div className="bg-elevated rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{draft.content}</p>
              </div>
            ) : (
              <p className="text-xs text-subtle italic">No answer drafted for this question.</p>
            )}
          </div>

          {/* Clipboard status */}
          <div className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            seqCopied
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-elevated border-border text-subtle'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {seqCopied
                ? <><polyline points="20 6 9 17 4 12"/></>
                : <><rect x="9" y="2" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
              }
            </svg>
            {seqCopied ? 'Answer copied — switch to the form and paste' : 'Copying to clipboard...'}
          </div>

          {isLast ? (
            <button
              onClick={() => setSeqMode(false)}
              className="w-full py-4 rounded-xl bg-success/15 text-success border border-success/30 font-bold text-sm transition-all active:scale-95"
            >
              Done — all answers filled
            </button>
          ) : (
            <button
              onClick={() => seqNext(selected, seqIdx + 1)}

              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Next answer
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          )}

          <p className="text-center text-[10px] text-subtle mt-3">
            Tap Next, switch to your form, paste (Cmd+V / long-press), come back and repeat
          </p>
        </main>
      </div>
    );
  }

  // ── Detail view ──
  if (selected) {
    const hasQ = selected.scrapedQuestions?.length > 0;
    const undrafted = hasQ ? selected.scrapedQuestions.length - (selected.draftedAnswers?.length || 0) : 0;

    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <button
            onClick={() => { setSelected(null); setMsg(null); setPasteText(''); }}
            className="text-sm text-primary hover:underline mb-5 inline-block"
          >
            ← All opportunities
          </button>

          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-0.5">{selected.programmeName}</h1>
          <p className="text-sm text-muted mb-5">{selected.organisation}</p>

          {msg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${msgClass}`}>
              {msg.text}
            </div>
          )}

          {/* No questions — show paste fallback */}
          {!hasQ && (
            <div className="mb-5 glass-card p-4" style={{ transform: 'none' }}>
              <p className="text-sm text-muted mb-3">No questions were found when this was scanned. Paste the application form text below and we'll extract the questions and draft answers instantly.</p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste the full application form text here..."
                rows={6}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-y mb-3"
              />
              <button
                onClick={() => extractAndDraft(selected)}
                disabled={extracting || drafting || !pasteText.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
              >
                {extracting ? 'Extracting...' : drafting ? 'Drafting answers...' : 'Extract & Draft All Answers'}
              </button>
            </div>
          )}

          {/* Has questions but not all drafted */}
          {hasQ && undrafted > 0 && (
            <button
              onClick={() => draftAll(selected)}
              disabled={drafting}
              className="w-full mb-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
            >
              {drafting
                ? 'Drafting answers...'
                : undrafted === selected.scrapedQuestions.length
                  ? 'Draft All Answers'
                  : `Draft Remaining ${undrafted} Answer${undrafted !== 1 ? 's' : ''}`}
            </button>
          )}

          {/* Fill actions — shown as soon as any answer is drafted */}
          {hasQ && (selected.draftedAnswers?.length || 0) > 0 && (
            <button
              onClick={() => enterSeqMode(selected)}
              className="w-full mb-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Fill one by one
            </button>
          )}

          {/* Questions + answers */}
          {hasQ && (
            <div className="flex flex-col gap-3">
              {selected.scrapedQuestions.map((q, idx) => {
                const draft = selected.draftedAnswers?.find(a => a.questionIndex === idx);
                return (
                  <div key={idx} className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-1.5">
                      Q{idx + 1}{q.wordLimit ? ` · ${q.wordLimit} words` : ''}
                    </p>
                    <p className="text-sm text-foreground leading-snug mb-3">{q.question}</p>
                    {draft ? (
                      <>
                        <p className="text-xs text-muted leading-relaxed mb-3 bg-elevated rounded-xl px-3 py-3 border border-border whitespace-pre-wrap">
                          {draft.content}
                        </p>
                        <button
                          onClick={() => copy(draft.content, idx)}
                          className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            copiedIdx === idx
                              ? 'bg-success/15 text-success border border-success/30'
                              : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                          }`}
                        >
                          {copiedIdx === idx ? 'Copied!' : 'Copy Answer'}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-subtle italic">Not drafted yet — tap Draft above</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href={`/opportunity/${selected._id}`}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Open full opportunity in Pitchrr →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Quick Fill</h1>
          <p className="text-sm text-muted">Pick an opportunity, draft answers, copy and paste into the form.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted text-sm">Loading...</div>
        ) : opps.length === 0 ? (
          <div className="text-center py-16 text-subtle border border-dashed border-border rounded-2xl text-sm">
            No opportunities yet. <Link href="/" className="text-primary hover:underline">Add one from the pipeline.</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {opps.map(opp => {
              const total = opp.scrapedQuestions?.length || 0;
              const drafted = opp.draftedAnswers?.length || 0;
              const pct = total > 0 ? Math.round((drafted / total) * 100) : 0;
              const ready = total > 0 && drafted >= total;
              return (
                <button
                  key={opp._id}
                  onClick={() => { setSelected(opp); setMsg(null); }}
                  className="glass-card p-4 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full status-${opp.status}`}>
                      {opp.status.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-semibold ${ready ? 'text-success' : total === 0 ? 'text-warning' : 'text-muted'}`}>
                      {total === 0 ? 'Needs form text' : ready ? 'Ready to fill' : `${drafted}/${total} drafted`}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm leading-snug mb-0.5">{opp.programmeName}</p>
                  <p className="text-xs text-muted mb-3">{opp.organisation}</p>
                  {total > 0 && (
                    <div className="h-1 bg-elevated rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ready ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
