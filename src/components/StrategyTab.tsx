'use client';

import { useState } from 'react';

interface Props {
  opportunity: any;
  onUpdate: (patch: any) => void;
}

function SectionHeader({ title, count, countLabel, description }: {
  title: string;
  count?: number;
  countLabel?: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2.5 flex-wrap">
          {title}
          {count !== undefined && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              {count}{countLabel ? ` ${countLabel}` : ''}
            </span>
          )}
        </h3>
        {description && <p className="text-xs text-muted mt-0.5 leading-snug max-w-lg">{description}</p>}
      </div>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="glass-card p-5 text-center">
      <p className="text-xs text-muted italic">{message}</p>
    </div>
  );
}

export default function StrategyTab({ opportunity, onUpdate }: Props) {
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const [togglingCapital, setTogglingCapital] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const gaps = (opportunity.alignmentEvidenceMap || []).filter((a: any) => a.hasGap);
  const allFlags = opportunity.redFlags || [];
  const highFlags = allFlags.filter((f: any) => f.severity === 'high');
  const medFlags = allFlags.filter((f: any) => f.severity === 'medium');
  const lowFlags = allFlags.filter((f: any) => f.severity === 'low');
  const orderedFlags = [...highFlags, ...medFlags, ...lowFlags];
  const socialCapital: any[] = opportunity.socialCapital || [];
  const timingContext = opportunity.timingContext;
  const askCalibration = opportunity.askCalibration;
  const programmeVibe = opportunity.programmeVibe;
  const reviewerPersona = opportunity.reviewerPersona;
  const unfairAdvantages: string[] = opportunity.unfairAdvantages || [];
  const winnerArchetype = opportunity.winnerArchetype;

  const pendingCapital = socialCapital.filter((c: any) => c.status !== 'activated').length;
  const totalActions = gaps.length + highFlags.length + medFlags.length + pendingCapital;

  const hasAnyIntel = gaps.length > 0 || allFlags.length > 0 || socialCapital.length > 0
    || timingContext || programmeVibe?.tone || unfairAdvantages.length > 0 || askCalibration || reviewerPersona?.name;

  const handleToggleSocialCapital = async (idx: number) => {
    setTogglingCapital(idx);
    const updated = socialCapital.map((c: any, i: number) =>
      i === idx ? { ...c, status: c.status === 'activated' ? 'pending' : 'activated' } : c
    );
    try {
      const res = await fetch(`/api/opportunities/${opportunity._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialCapital: updated }),
      });
      if (res.ok) onUpdate({ socialCapital: updated });
    } finally {
      setTogglingCapital(null);
    }
  };

  const copyToClipboard = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  if (!hasAnyIntel) {
    return (
      <div className="glass-card p-14 text-center">
        <p className="text-4xl mb-4">🗺️</p>
        <h3 className="text-lg font-bold text-foreground mb-2">Generate your intelligence first</h3>
        <p className="text-sm text-muted max-w-sm mx-auto">
          The strategy tab synthesizes intelligence into a pre-submission action plan. Go to the Intelligence tab and generate Alignment Map, Red Flags, Social Capital, Timing Context, and Positioning sections.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Left: Action plan */}
      <div className="lg:col-span-2 space-y-10">

        {/* Summary bar */}
        {totalActions > 0 && (
          <div className="glass-card p-5 flex items-center gap-5">
            <div className="text-3xl font-black text-primary leading-none">{totalActions}</div>
            <div className="border-l border-border pl-5">
              <p className="text-sm font-bold text-foreground">actions before submitting</p>
              <p className="text-xs text-muted mt-0.5">
                {gaps.length > 0 && `${gaps.length} gap${gaps.length !== 1 ? 's' : ''} to close`}
                {gaps.length > 0 && (highFlags.length + medFlags.length) > 0 && ' · '}
                {(highFlags.length + medFlags.length) > 0 && `${highFlags.length + medFlags.length} flag${highFlags.length + medFlags.length !== 1 ? 's' : ''} to neutralise`}
                {(gaps.length > 0 || (highFlags.length + medFlags.length) > 0) && pendingCapital > 0 && ' · '}
                {pendingCapital > 0 && `${pendingCapital} outreach to activate`}
              </p>
            </div>
          </div>
        )}

        {/* Alignment Gaps */}
        <section>
          <SectionHeader
            title="Gaps to Close"
            count={gaps.length}
            description="Evaluation criteria with no strong proof point in your profile. Answer these before you draft."
          />
          {gaps.length === 0 ? (
            <EmptySection message="No gaps detected — or generate the Alignment Map in Intelligence first." />
          ) : (
            <div className="space-y-3">
              {gaps.map((gap: any, i: number) => (
                <div key={i} className="glass-card p-4 border-l-2 border-warning/60">
                  <p className="text-[10px] font-bold text-warning uppercase tracking-wider mb-1">{gap.criterion}</p>
                  <p className="text-sm text-foreground font-medium leading-snug mb-2">{gap.improvementQuestion}</p>
                  {gap.proofPoint && (
                    <p className="text-xs text-muted italic leading-snug">Weak proof found: {gap.proofPoint}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Red Flags */}
        <section>
          <SectionHeader
            title="Red Flags to Neutralise"
            count={allFlags.length}
            description="A reviewer will notice these. Get ahead of each one in your drafts — don't wait to be asked."
          />
          {allFlags.length === 0 ? (
            <EmptySection message="No red flags yet — generate them in the Intelligence tab." />
          ) : (
            <div className="space-y-3">
              {orderedFlags.map((flag: any, i: number) => (
                <div key={i} className={`glass-card p-4 border-l-2 ${
                  flag.severity === 'high' ? 'border-danger/70' :
                  flag.severity === 'medium' ? 'border-warning/60' :
                  'border-border'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-none mt-0.5 uppercase ${
                      flag.severity === 'high' ? 'text-danger bg-danger/15 border border-danger/30' :
                      flag.severity === 'medium' ? 'text-warning bg-warning/15 border border-warning/30' :
                      'text-muted bg-elevated border border-border'
                    }`}>{flag.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium leading-snug mb-2">{flag.concern}</p>
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-success uppercase tracking-wide flex-none mt-0.5">Reframe</span>
                        <p className="text-xs text-foreground/80 leading-relaxed">{flag.reframe}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Social Capital */}
        <section>
          <SectionHeader
            title="Social Capital Outreach"
            count={pendingCapital || undefined}
            countLabel="pending"
            description="Warm introductions before you submit. A known name in the application changes the dynamic entirely."
          />
          {socialCapital.length === 0 ? (
            <EmptySection message="No social capital identified yet — generate it in the Intelligence tab." />
          ) : (
            <div className="space-y-3">
              {socialCapital.map((contact: any, i: number) => (
                <div key={i} className={`glass-card p-4 transition-all ${contact.status === 'activated' ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-foreground">{contact.connection}</p>
                        <span className="text-[10px] text-muted border border-border px-1.5 py-0.5 rounded uppercase tracking-wide">{contact.relationship}</span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{contact.actionSuggested}</p>
                    </div>
                    <button
                      onClick={() => handleToggleSocialCapital(i)}
                      disabled={togglingCapital === i}
                      className={`flex-none text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                        contact.status === 'activated'
                          ? 'text-success bg-success/10 border-success/30'
                          : 'text-muted bg-elevated border-border hover:text-success hover:border-success/30'
                      } disabled:opacity-50`}
                    >
                      {togglingCapital === i ? '...' : contact.status === 'activated' ? '✓ Done' : 'Mark done'}
                    </button>
                  </div>
                  {contact.messageDraft && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => setExpandedMessage(expandedMessage === i ? null : i)}
                        className="text-[10px] font-semibold text-primary hover:text-primary-light transition-colors uppercase tracking-wide"
                      >
                        {expandedMessage === i ? '▲ Hide message draft' : '▼ View message draft'}
                      </button>
                      {expandedMessage === i && (
                        <div className="mt-2 p-3.5 bg-elevated rounded-lg border border-border relative">
                          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pr-16">{contact.messageDraft}</p>
                          <button
                            onClick={() => copyToClipboard(contact.messageDraft, i)}
                            className="absolute top-3 right-3 text-[10px] font-semibold text-muted hover:text-foreground border border-border hover:border-primary/50 px-2 py-1 rounded transition-colors"
                          >
                            {copied === i ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Timing Hooks */}
        {timingContext && (
          <section>
            <SectionHeader
              title="Timing Hooks"
              description="Weave these into your answers to show you are current and contextually aware. Reviewers notice."
            />
            <div className="glass-card p-5">
              {timingContext.currentEvents?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {timingContext.currentEvents.map((event: string, i: number) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-snug">
                      {event}
                    </span>
                  ))}
                </div>
              )}
              {timingContext.relevanceNote && (
                <p className="text-sm text-foreground/80 leading-relaxed">{timingContext.relevanceNote}</p>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Right: Positioning brief — sticky quick-reference */}
      <div className="lg:sticky lg:top-8 self-start space-y-4">

        {/* Primary unfair advantage */}
        {unfairAdvantages.length > 0 && (
          <div className="glass-card p-5 border border-primary/20">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Lead With This</p>
            <p className="text-sm font-semibold text-foreground leading-snug mb-3">{unfairAdvantages[0]}</p>
            {unfairAdvantages.length > 1 && (
              <div className="space-y-1.5 pt-3 border-t border-border">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Supporting edges</p>
                {unfairAdvantages.slice(1).map((adv: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary/60 text-xs flex-none">·</span>
                    <p className="text-xs text-foreground/70 leading-snug">{adv}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Programme vibe / language guide */}
        {programmeVibe?.tone && (
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Write Like This</p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Tone</p>
                <p className="text-sm text-foreground">{programmeVibe.tone}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Energy</p>
                <p className="text-sm text-foreground">{programmeVibe.energy}</p>
              </div>
              {programmeVibe.positioningGuidance && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Positioning</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{programmeVibe.positioningGuidance}</p>
                </div>
              )}
              {programmeVibe.languageToUse?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-1.5">Use</p>
                  <div className="flex flex-wrap gap-1.5">
                    {programmeVibe.languageToUse.map((w: string) => (
                      <span key={w} className="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">{w}</span>
                    ))}
                  </div>
                </div>
              )}
              {programmeVibe.languageToAvoid?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-1.5">Avoid</p>
                  <div className="flex flex-wrap gap-1.5">
                    {programmeVibe.languageToAvoid.map((w: string) => (
                      <span key={w} className="text-[11px] px-2 py-0.5 rounded bg-danger/10 text-muted border border-danger/20 line-through decoration-danger/40">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviewer persona */}
        {reviewerPersona?.name && (
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Writing For</p>
            <p className="text-sm font-semibold text-foreground mb-2">{reviewerPersona.name}</p>
            {reviewerPersona.values?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {reviewerPersona.values.map((v: string) => (
                  <span key={v} className="text-[11px] px-2 py-0.5 rounded bg-elevated border border-border text-muted">{v}</span>
                ))}
              </div>
            )}
            {reviewerPersona.languageGuidance && (
              <p className="text-xs text-foreground/70 leading-relaxed">{reviewerPersona.languageGuidance}</p>
            )}
          </div>
        )}

        {/* Ask calibration */}
        {askCalibration?.recommendedAsk && (
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Ask Calibration</p>
            <p className="text-2xl font-black text-primary mb-1 leading-none">{askCalibration.recommendedAsk}</p>
            {askCalibration.typicalRange && (
              <p className="text-xs text-muted mb-3">Range: {askCalibration.typicalRange}</p>
            )}
            {askCalibration.rationale && (
              <p className="text-xs text-foreground/70 leading-relaxed">{askCalibration.rationale}</p>
            )}
          </div>
        )}

        {/* Winner pattern */}
        {winnerArchetype?.commonTraits?.length > 0 && (
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Winner Pattern</p>
            {winnerArchetype.typicalStage && (
              <p className="text-xs text-muted mb-2">Typical stage: <span className="text-foreground font-medium">{winnerArchetype.typicalStage}</span></p>
            )}
            <div className="space-y-1.5">
              {winnerArchetype.commonTraits.slice(0, 5).map((trait: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-primary/60 text-xs flex-none mt-0.5">·</span>
                  <p className="text-xs text-foreground/70 leading-snug">{trait}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
