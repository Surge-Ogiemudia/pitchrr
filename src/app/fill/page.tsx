'use client';

import { useState, useEffect } from 'react';
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
    setMsg({ type: 'info', text: 'Writing answers using your profile — takes about 30 seconds...' });
    try {
      const res = await fetch(`/api/opportunities/${opp._id}/autodraft`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Drafting failed' }); return; }
      const updated = await reload(opp._id);
      if (updated) setSelected(updated);
      setMsg({ type: 'ok', text: `${data.count} answer${data.count !== 1 ? 's' : ''} drafted. Ready to copy.` });
    } catch {
      setMsg({ type: 'err', text: 'Network error during drafting' });
    } finally {
      setDrafting(false);
    }
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

  const msgClass = msg?.type === 'ok'
    ? 'bg-success/10 border-success/20 text-success'
    : msg?.type === 'err'
    ? 'bg-danger/10 border-danger/20 text-danger'
    : 'bg-primary/10 border-primary/20 text-primary';

  // ── Detail view ──
  if (selected) {
    const hasQ = selected.scrapedQuestions?.length > 0;
    const allDrafted = hasQ && (selected.draftedAnswers?.length || 0) >= selected.scrapedQuestions.length;
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
          {hasQ && !allDrafted && (
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
                    <span className={`text-[10px] font-semibold ${ready ? 'text-success' : 'text-muted'}`}>
                      {total === 0 ? 'No questions yet' : ready ? 'Ready to fill' : `${drafted}/${total} drafted`}
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
