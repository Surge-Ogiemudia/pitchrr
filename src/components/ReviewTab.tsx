'use client';

import { useState } from 'react';

interface Question { question: string; wordLimit: number | null; section: string; }
interface DraftedAnswer { questionIndex: number; content: string; status: string; }

interface ReviewResult {
  overallScore: number;
  verdict: string;
  priorityFixes: { fix: string; impact: 'high' | 'medium' | 'low'; questionIndex: number | null }[];
  narrativeIssues: { issue: string; questionIndices: number[]; fix: string }[];
  redFlagCoverage: { concern: string; severity: string; addressed: boolean; evidence: string; suggestedAddition?: string }[];
  alignmentCoverage: { criterion: string; strength: 'strong' | 'partial' | 'missing'; note: string }[];
  strengths: string[];
}

interface Props {
  opportunity: {
    _id: string;
    programmeName: string;
    organisation: string;
    deadline?: string;
    prizeAmount?: string;
    scrapedQuestions: Question[];
    draftedAnswers: DraftedAnswer[];
  };
}

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const IMPACT_STYLES = {
  high: 'text-danger bg-danger/10 border-danger/30',
  medium: 'text-warning bg-warning/10 border-warning/30',
  low: 'text-muted bg-elevated border-border',
};

const STRENGTH_STYLES = {
  strong: 'text-success bg-success/10 border-success/30',
  partial: 'text-warning bg-warning/10 border-warning/30',
  missing: 'text-danger bg-danger/10 border-danger/30',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? 'text-success border-success shadow-[0_0_20px_rgba(16,185,129,0.2)]'
    : score >= 55 ? 'text-warning border-warning shadow-[0_0_20px_rgba(245,158,11,0.2)]'
    : 'text-danger border-danger shadow-[0_0_20px_rgba(239,68,68,0.2)]';
  return (
    <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-black text-3xl flex-none ${color}`}>
      {score}
    </div>
  );
}

export default function ReviewTab({ opportunity }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = opportunity.scrapedQuestions || [];
  const drafts = opportunity.draftedAnswers || [];
  const totalQ = questions.length;
  const draftedCount = drafts.length;
  const finalCount = drafts.filter(a => a.status === 'final').length;
  const missingCount = totalQ - draftedCount;

  const wordLimitIssues = questions
    .map((q, idx) => {
      const draft = drafts.find(a => a.questionIndex === idx);
      if (!draft || !q.wordLimit) return null;
      const wc = countWords(draft.content);
      return wc > q.wordLimit ? { idx, wc, limit: q.wordLimit } : null;
    })
    .filter(Boolean) as { idx: number; wc: number; limit: number }[];

  const handleRunReview = async () => {
    if (draftedCount === 0) return;
    setReviewing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunity._id}/review`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Review failed');
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Network error — try again');
    } finally {
      setReviewing(false);
    }
  };

  const handleExport = () => {
    let content = `# ${opportunity.programmeName}\n\n`;
    content += `**Organisation:** ${opportunity.organisation}\n`;
    if (opportunity.deadline) content += `**Deadline:** ${new Date(opportunity.deadline).toLocaleDateString()}\n`;
    content += `**Prize/Funding:** ${opportunity.prizeAmount || 'Not specified'}\n\n---\n\n## Application Answers\n\n`;
    questions.forEach((q, idx) => {
      content += `### Question ${idx + 1}\n${q.question}\n\n`;
      const draft = drafts.find(a => a.questionIndex === idx);
      content += draft ? `${draft.content}\n\n` : `*[Not answered yet]*\n\n`;
    });
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${opportunity.programmeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_application.md`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Left: Review */}
      <div className="lg:col-span-2 space-y-8">

        {/* Run review panel */}
        <div className="glass-card p-6">
          {reviewing ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin flex-none" />
              <div>
                <p className="text-sm font-semibold text-foreground">Reading all your answers together...</p>
                <p className="text-xs text-muted mt-0.5">Checking narrative consistency, red flag coverage, alignment. This takes 15-20 seconds.</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex items-center gap-5">
              <ScoreRing score={result.overallScore} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Application Score</p>
                <p className="text-base font-bold text-foreground leading-snug mb-3">{result.verdict}</p>
                <button onClick={handleRunReview} className="text-xs font-semibold text-muted hover:text-primary transition-colors underline-offset-2 hover:underline">
                  Re-run review
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Full Application Review</h3>
                <p className="text-xs text-muted leading-snug">
                  AI reads all {draftedCount} draft{draftedCount !== 1 ? 's' : ''} together and checks narrative consistency, red flag coverage, and alignment — things you cannot see one question at a time.
                </p>
              </div>
              <button
                onClick={handleRunReview}
                disabled={draftedCount === 0}
                className="flex-none px-5 py-2.5 rounded-xl bg-primary text-[#0A0A0F] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Run Review
              </button>
            </div>
          )}
          {error && <p className="mt-4 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Review results */}
        {result && (
          <>
            {/* Priority fixes */}
            {result.priorityFixes.length > 0 && (
              <section>
                <div className="flex items-center gap-2.5 mb-4">
                  <h3 className="text-base font-bold text-foreground">Priority Fixes</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30">{result.priorityFixes.length}</span>
                </div>
                <div className="space-y-3">
                  {result.priorityFixes.map((fix, i) => (
                    <div key={i} className={`glass-card p-4 border-l-2 ${fix.impact === 'high' ? 'border-danger/60' : fix.impact === 'medium' ? 'border-warning/60' : 'border-border'}`}>
                      <div className="flex items-start gap-3">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase flex-none mt-0.5 border ${IMPACT_STYLES[fix.impact]}`}>{fix.impact}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{fix.fix}</p>
                          {fix.questionIndex !== null && (
                            <p className="text-[10px] text-muted mt-1 uppercase tracking-wide">Q{fix.questionIndex + 1}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Narrative issues */}
            {result.narrativeIssues.length > 0 && (
              <section>
                <div className="flex items-center gap-2.5 mb-4">
                  <h3 className="text-base font-bold text-foreground">Narrative Issues</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">{result.narrativeIssues.length}</span>
                </div>
                <div className="space-y-3">
                  {result.narrativeIssues.map((item, i) => (
                    <div key={i} className="glass-card p-4 border-l-2 border-warning/50">
                      <p className="text-sm text-foreground font-medium mb-2">{item.issue}</p>
                      {item.questionIndices.length > 0 && (
                        <p className="text-[10px] text-muted uppercase tracking-wide mb-2">
                          Affects: {item.questionIndices.map(q => `Q${q + 1}`).join(', ')}
                        </p>
                      )}
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-success uppercase tracking-wide flex-none mt-0.5">Fix</span>
                        <p className="text-xs text-foreground/80 leading-relaxed">{item.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Red flag coverage */}
            {result.redFlagCoverage.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-foreground mb-4">Red Flag Coverage</h3>
                <div className="space-y-3">
                  {result.redFlagCoverage.map((flag, i) => (
                    <div key={i} className={`glass-card p-4 border-l-2 ${flag.addressed ? 'border-success/50' : 'border-danger/60'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex-none border-2 flex items-center justify-center mt-0.5 ${flag.addressed ? 'bg-success border-success' : 'border-danger'}`}>
                          {flag.addressed
                            ? <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-danger"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground leading-snug">{flag.concern}</p>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase flex-none border ${flag.severity === 'high' ? 'text-danger bg-danger/15 border-danger/30' : flag.severity === 'medium' ? 'text-warning bg-warning/15 border-warning/30' : 'text-muted bg-elevated border-border'}`}>{flag.severity}</span>
                          </div>
                          <p className="text-xs text-muted leading-relaxed mb-2">{flag.evidence}</p>
                          {!flag.addressed && flag.suggestedAddition && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wide flex-none mt-0.5">Add</span>
                              <p className="text-xs text-foreground/80 leading-relaxed">{flag.suggestedAddition}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Alignment coverage */}
            {result.alignmentCoverage.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-foreground mb-4">Criterion Coverage</h3>
                <div className="space-y-2">
                  {result.alignmentCoverage.map((item, i) => (
                    <div key={i} className="glass-card p-3.5 flex items-start gap-3">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase flex-none mt-0.5 border ${STRENGTH_STYLES[item.strength]}`}>
                        {item.strength}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground mb-0.5">{item.criterion}</p>
                        <p className="text-xs text-muted leading-snug">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-foreground mb-4">What Reads Well</h3>
                <div className="glass-card p-5 space-y-3">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-none mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <p className="text-sm text-foreground/80 leading-snug">{s}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !reviewing && draftedCount === 0 && (
          <div className="glass-card p-10 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">No drafts yet</p>
            <p className="text-xs text-muted">Go to the Drafting tab to write your answers, then come back here for a full review.</p>
          </div>
        )}
      </div>

      {/* Right: Checklist + export */}
      <div className="lg:sticky lg:top-8 self-start space-y-4">

        {/* Completeness */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Checklist</h3>
          <div className="space-y-3">
            <CheckItem
              done={totalQ > 0 && draftedCount === totalQ}
              label={`All questions answered`}
              detail={missingCount > 0 ? `${missingCount} missing` : undefined}
            />
            <CheckItem
              done={finalCount > 0}
              label={`Answers marked final`}
              detail={finalCount > 0 ? `${finalCount} / ${totalQ}` : 'none marked final yet'}
            />
            <CheckItem
              done={wordLimitIssues.length === 0 && draftedCount > 0}
              label="Within word limits"
              detail={wordLimitIssues.length > 0 ? `${wordLimitIssues.length} over limit` : undefined}
            />
            <CheckItem
              done={result !== null && result.priorityFixes.filter(f => f.impact === 'high').length === 0}
              label="No high-priority fixes"
              detail={!result ? 'run review to check' : undefined}
            />
          </div>
        </div>

        {/* Word limit violations */}
        {wordLimitIssues.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-danger uppercase tracking-wider mb-3">Over Word Limits</h3>
            <div className="space-y-2">
              {wordLimitIssues.map(({ idx, wc, limit }) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted truncate">Q{idx + 1}: {questions[idx]?.question.slice(0, 35)}...</span>
                  <span className="text-xs font-bold text-danger flex-none">{wc}/{limit}w</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draft summary */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Draft Summary</h3>
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const draft = drafts.find(a => a.questionIndex === idx);
              const wc = draft ? countWords(draft.content) : null;
              const isOver = wc !== null && q.wordLimit !== null && wc > q.wordLimit;
              return (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex-none border flex items-center justify-center ${
                    draft?.status === 'final' ? 'bg-success border-success' :
                    draft ? 'bg-primary/20 border-primary/50' :
                    'border-border bg-elevated'
                  }`}>
                    {draft?.status === 'final' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <span className={`text-xs flex-1 truncate ${draft ? 'text-foreground/70' : 'text-muted'}`}>Q{idx + 1}</span>
                  {wc !== null && (
                    <span className={`text-[10px] flex-none ${isOver ? 'text-danger font-bold' : 'text-muted'}`}>
                      {wc}{q.wordLimit ? `/${q.wordLimit}w` : 'w'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Export */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Export</h3>
          <p className="text-xs text-muted mb-4 leading-snug">Download the full application as a Markdown document.</p>
          <button
            onClick={handleExport}
            disabled={draftedCount === 0}
            className="w-full py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export Application
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex-none border-2 flex items-center justify-center mt-0.5 transition-colors ${done ? 'bg-success border-success' : 'border-border'}`}>
        {done && (
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-success' : 'text-muted'}`}>{label}</p>
        {detail && <p className="text-xs text-muted mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}
