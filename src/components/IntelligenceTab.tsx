'use client';

import { useEffect, useRef, useState } from 'react';
import { computeIntelligenceScores } from '@/lib/intelligence-scores';

interface Message { role: 'user' | 'assistant'; content: string; timestamp?: string; }

interface ImprovementTask {
  section: string;
  task: string;
  type: 'question' | 'file' | 'resource' | 'action';
  completed: boolean;
}

interface Opportunity {
  _id: string;
  programmeName: string;
  organisation: string;
  evaluationCriteria: string;
  opportunityDnaLog?: Message[];
  winnersDnaLog?: Message[];
  winnerProfiles?: { name: string; source: string; patterns: string }[];
  winnerArchetype?: { commonTraits: string[]; typicalStage: string; alignmentSignals: string[] };
  evaluationFramework?: { summary: string; weights: { category: string; weight: number; rationale: string }[]; dealbreakers: string[]; keySignals: string[]; generatedAt: string } | null;
  alignmentEvidenceMap?: { criterion: string; proofPoint: string; hasGap: boolean; improvementQuestion: string }[];
  redFlags?: { concern: string; reframe: string; severity: 'low' | 'medium' | 'high' }[];
  programmeVibe?: { tone: string; energy: string; positioningGuidance: string; languageToUse: string[]; languageToAvoid: string[]; generatedAt: string } | null;
  reviewerPersona?: { name: string; background: string; previousFunds: string[]; values: string[]; languageGuidance: string; generatedAt: string } | null;
  competitiveIntel?: { likelyCompetitors: string[]; differentiators: string[]; competitiveAdvantage: string };
  socialCapital?: { connection: string; relationship: string; actionSuggested: string; messageDraft: string; status: string }[];
  unfairAdvantages?: string[];
  timingContext?: { currentEvents: string[]; relevanceNote: string; generatedAt: string } | null;
  askCalibration?: { typicalRange: string; recommendedAsk: string; rationale: string } | null;
  improvementTasks?: ImprovementTask[];
}

interface Props {
  opportunity: Opportunity;
  onUpdate: (updated: Partial<Opportunity>) => void;
}

const DNA_OPENING_OPP = (prog: string, org: string) =>
  `I've read what's publicly on the ${prog} page by ${org}. Now I need to go deeper.\n\nStart by pouring in everything you have found or know about this organisation — their website, any articles, things you have heard, anything at all. Do not worry about structure. Just share everything and I will make sense of it.\n\nOnce you have shared, I will tell you exactly what is still missing and where to go get it.`;

const DNA_OPENING_WINNERS = (prog: string) =>
  `Let's build the winner archetype for ${prog}.\n\nShare everything you have found on past selectees or winners — LinkedIn profiles, cohort announcements, news articles, pitch descriptions, anything. Paste it all in, even if it is scattered or incomplete.\n\nOnce you share, I will extract the patterns and tell you exactly what else to find and where.`;

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-success bg-success/10 border-success/30' : score >= 40 ? 'text-warning bg-warning/10 border-warning/30' : 'text-muted bg-elevated border-border';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>{score}%</span>;
}

function Spinner() {
  return <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />;
}

function DnaChat({ opportunityId, mode, initialMessages, openingMessage, onSave }: {
  opportunityId: string;
  mode: 'opportunity-dna' | 'winners-dna';
  initialMessages: Message[];
  openingMessage: string;
  onSave: (messages: Message[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasOpening = true;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };

    const history = messages.length === 0
      ? [{ role: 'assistant' as const, content: openingMessage }, userMsg]
      : [...messages, userMsg];

    setMessages(history);
    setInput('');
    setStreaming(true);
    setStreamText('');

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/intelligence/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: history }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamText(fullText);
      }
      const assistantMsg: Message = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() };
      const updated = [...history, assistantMsg];
      setMessages(updated);
      setStreamText('');

      await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [mode === 'opportunity-dna' ? 'opportunityDnaLog' : 'winnersDnaLog']: updated }),
      });
      onSave(updated);
    } catch (err) {
      console.error('DNA chat error', err);
    } finally {
      setStreaming(false);
    }
  };

  const displayMessages: Message[] = messages.length === 0
    ? [{ role: 'assistant', content: openingMessage }]
    : messages;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 max-h-72">
        {displayMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === 'user' ? 'chat-message-user' : 'chat-message-assistant text-foreground'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {streaming && streamText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed chat-message-assistant text-foreground">
              {streamText}<span className="inline-block w-px h-3.5 bg-primary ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}
        {streaming && !streamText && (
          <div className="flex justify-start">
            <div className="chat-message-assistant px-3 py-2 rounded-xl">
              <div className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Share what you know..."
          rows={2}
          disabled={streaming}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
        />
        <button onClick={send} disabled={!input.trim() || streaming} className="px-4 py-2 bg-primary text-[#0A0A0F] rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 self-end">
          {streaming ? <Spinner /> : 'Send'}
        </button>
      </div>
    </div>
  );
}

const TASK_TYPE_STYLES: Record<string, string> = {
  question: 'text-primary bg-primary/10 border-primary/20',
  action: 'text-warning bg-warning/10 border-warning/20',
  file: 'text-muted bg-elevated border-border',
  resource: 'text-success bg-success/10 border-success/20',
};

function ChevronDown() {
  return (
    <svg className="w-3.5 h-3.5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function GeneratedCard({ title, score, hasData, generating, children, improvementTasks, expanded, onToggle, onGenerate, onRegenerate, onToggleTask }: {
  title: string; score: number; hasData: boolean; generating: boolean;
  children?: React.ReactNode;
  improvementTasks?: ImprovementTask[];
  expanded: boolean;
  onToggle: () => void;
  onGenerate: () => void; onRegenerate: () => void;
  onToggleTask?: (task: string, completed: boolean) => void;
}) {
  const pendingTasks = (improvementTasks || []).filter(t => !t.completed);
  const completedTasks = (improvementTasks || []).filter(t => t.completed);
  const hasTasks = (improvementTasks || []).length > 0;
  const canExpand = hasData && !generating;

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div
        className={`flex items-center justify-between gap-2 ${canExpand ? 'cursor-pointer select-none' : ''}`}
        onClick={canExpand ? onToggle : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-none ${score >= 75 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-muted'}`} />
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {pendingTasks.length > 0 && (
            <span className="text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-full">
              {pendingTasks.length}
            </span>
          )}
          <ScoreBadge score={score} />
          {canExpand && (
            <span className={`text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              <ChevronDown />
            </span>
          )}
        </div>
      </div>

      {generating ? (
        <div className="flex items-center gap-2 text-xs text-primary">
          <Spinner /> <span>Analyzing...</span>
        </div>
      ) : hasData ? (
        expanded ? (
          <>
            <div className="max-h-60 overflow-y-auto pr-1 text-xs text-muted leading-relaxed">
              <div className="space-y-2">{children}</div>
              {hasTasks && (
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-2">Improvement Tasks</p>
                  <div className="space-y-2">
                    {[...pendingTasks, ...completedTasks].map((t, i) => (
                      <label key={i} className="flex items-start gap-2 cursor-pointer group" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={e => onToggleTask?.(t.task, e.target.checked)}
                          className="mt-0.5 flex-none accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs leading-snug ${t.completed ? 'line-through text-subtle' : 'text-muted group-hover:text-foreground transition-colors'}`}>
                            {t.task}
                          </span>
                          <span className={`ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded border ${TASK_TYPE_STYLES[t.type] || TASK_TYPE_STYLES.action}`}>
                            {t.type}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onRegenerate(); }}
              className="text-xs text-muted hover:text-foreground transition-colors self-end"
            >
              Regenerate
            </button>
          </>
        ) : (
          <div className="relative max-h-12 overflow-hidden text-xs text-muted leading-relaxed">
            {children}
            <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#12121A] to-transparent pointer-events-none" />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-subtle">Not analyzed yet.</p>
          <button onClick={onGenerate} className="w-full py-2 text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg transition-colors">
            Generate Analysis
          </button>
        </div>
      )}
    </div>
  );
}

export default function IntelligenceTab({ opportunity, onUpdate }: Props) {
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (key: string) =>
    setExpandedSection(prev => (prev === key ? null : key));

  const scores = computeIntelligenceScores(opportunity as any);

  const handleToggleTask = async (section: string, taskText: string, completed: boolean) => {
    const updated = (opportunity.improvementTasks || []).map(t =>
      t.section === section && t.task === taskText ? { ...t, completed } : t
    );
    onUpdate({ improvementTasks: updated });
    await fetch(`/api/opportunities/${opportunity._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ improvementTasks: updated }),
    });
  };

  const tasksFor = (section: string) =>
    (opportunity.improvementTasks || []).filter(t => t.section === section);

  const generate = async (section: string) => {
    if (generatingSection) return;
    setGeneratingSection(section);
    try {
      const res = await fetch(`/api/opportunities/${opportunity._id}/intelligence/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
      });
      if (res.ok) {
        const refreshRes = await fetch(`/api/opportunities/${opportunity._id}`);
        if (refreshRes.ok) {
          const updated = await refreshRes.json();
          onUpdate(updated);
        }
      }
    } catch (err) { console.error('Generate error', err); }
    finally { setGeneratingSection(null); }
  };

  const ALL_SECTIONS = ['evaluation-framework', 'alignment-map', 'red-flags', 'programme-vibe', 'reviewer-persona', 'competitive-intel', 'social-capital', 'unfair-advantages', 'timing-context', 'ask-calibration'];

  const generateAll = async () => {
    setGeneratingAll(true);
    for (const section of ALL_SECTIONS) {
      setGeneratingSection(section);
      try {
        const res = await fetch(`/api/opportunities/${opportunity._id}/intelligence/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section }),
        });
        if (!res.ok) console.error(`Failed to generate ${section}`);
      } catch (err) { console.error(`Error generating ${section}`, err); }
    }
    const refreshRes = await fetch(`/api/opportunities/${opportunity._id}`);
    if (refreshRes.ok) onUpdate(await refreshRes.json());
    setGeneratingSection(null);
    setGeneratingAll(false);
  };

  const opp = opportunity as any;

  const overallColor = scores.overall >= 70 ? 'text-success' : scores.overall >= 40 ? 'text-warning' : 'text-danger';
  const completeSections = Object.values(scores).filter((v, i) => i < 12 && (v as number) > 0).length;

  return (
    <div className="space-y-8">
      <div className="glass-card p-5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center">
            <div className={`text-3xl font-bold ${overallColor}`}>{scores.overall}%</div>
            <div className="text-xs text-muted mt-0.5">Intelligence Ready</div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-elevated rounded-full h-2 mb-2">
              <div className={`h-2 rounded-full transition-all ${scores.overall >= 70 ? 'bg-success' : scores.overall >= 40 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${scores.overall}%` }} />
            </div>
            <p className="text-xs text-muted">{completeSections} of 12 sections have data. Stronger intelligence = stronger drafts.</p>
          </div>
        </div>
        <button
          onClick={generateAll}
          disabled={generatingAll || !!generatingSection}
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
        >
          {generatingAll ? <><Spinner /> Generating...</> : 'Generate All Analysis'}
        </button>
      </div>

      <div>
        <h2 className="text-base font-bold text-foreground mb-1">Understand the Opportunity</h2>
        <p className="text-xs text-muted mb-4">Pour in everything you know. The more you give, the sharper the analysis.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Opportunity DNA</h3>
                <p className="text-xs text-muted mt-0.5">Organisation culture, history, what they really want</p>
              </div>
              <ScoreBadge score={scores.opportunityDna} />
            </div>
            <DnaChat
              opportunityId={opportunity._id}
              mode="opportunity-dna"
              initialMessages={opp.opportunityDnaLog || []}
              openingMessage={DNA_OPENING_OPP(opportunity.programmeName, opportunity.organisation)}
              onSave={(msgs) => onUpdate({ opportunityDnaLog: msgs })}
            />
          </div>

          <div className="glass-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Winners DNA</h3>
                <p className="text-xs text-muted mt-0.5">Past selectees, archetypes, patterns to match</p>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBadge score={scores.winnersDna} />
                {(opp.winnersDnaLog?.filter((m: Message) => m.role === 'user').length || 0) > 0 && (
                  <button
                    onClick={() => generate('winners')}
                    disabled={!!generatingSection}
                    className="text-xs font-bold text-primary hover:text-primary-light transition-colors disabled:opacity-40"
                  >
                    {generatingSection === 'winners' ? <Spinner /> : 'Extract'}
                  </button>
                )}
              </div>
            </div>
            <DnaChat
              opportunityId={opportunity._id}
              mode="winners-dna"
              initialMessages={opp.winnersDnaLog || []}
              openingMessage={DNA_OPENING_WINNERS(opportunity.programmeName)}
              onSave={(msgs) => onUpdate({ winnersDnaLog: msgs })}
            />
          </div>
        </div>

        {(opp.winnerProfiles?.length > 0 || opp.winnerArchetype?.commonTraits?.length > 0) && (
          <div className="mt-4 glass-card p-5">
            <h4 className="text-sm font-bold text-foreground mb-3">Winner Archetype</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted">
              <div>
                <span className="text-subtle uppercase tracking-wider text-[10px]">Typical Stage</span>
                <p className="text-foreground mt-1">{opp.winnerArchetype?.typicalStage || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-subtle uppercase tracking-wider text-[10px]">Common Traits</span>
                <ul className="mt-1 space-y-0.5">
                  {(opp.winnerArchetype?.commonTraits || []).map((t: string, i: number) => <li key={i} className="text-foreground">{t}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold text-foreground mb-1">AI Analysis</h2>
        <p className="text-xs text-muted mb-4">Strategic intelligence generated from your research. Each section informs how your answers are drafted.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          <GeneratedCard
            title="Evaluation Framework"
            score={scores.evaluationFramework}
            hasData={!!opp.evaluationFramework?.generatedAt}
            generating={generatingSection === 'evaluation-framework'}
            improvementTasks={tasksFor('evaluation-framework')}
            expanded={expandedSection === 'evaluation-framework'}
            onToggle={() => toggleSection('evaluation-framework')}
            onGenerate={() => generate('evaluation-framework')}
            onRegenerate={() => generate('evaluation-framework')}
            onToggleTask={(task, completed) => handleToggleTask('evaluation-framework', task, completed)}
          >
            {opp.evaluationFramework && (
              <div className="space-y-2">
                <p>{opp.evaluationFramework.summary}</p>
                {opp.evaluationFramework.dealbreakers?.length > 0 && (
                  <div>
                    <span className="text-danger font-semibold">Dealbreakers: </span>
                    {opp.evaluationFramework.dealbreakers.join(', ')}
                  </div>
                )}
              </div>
            )}
          </GeneratedCard>

          <GeneratedCard
            title="Alignment Map"
            score={scores.alignmentMap}
            hasData={(opp.alignmentEvidenceMap?.length || 0) > 0}
            generating={generatingSection === 'alignment-map'}
            improvementTasks={tasksFor('alignment-map')}
            expanded={expandedSection === 'alignment-map'}
            onToggle={() => toggleSection('alignment-map')}
            onGenerate={() => generate('alignment-map')}
            onRegenerate={() => generate('alignment-map')}
            onToggleTask={(task, completed) => handleToggleTask('alignment-map', task, completed)}
          >
            {(opp.alignmentEvidenceMap || []).slice(0, 4).map((item: any, i: number) => (
              <div key={i} className={`flex items-start gap-1.5 ${i > 0 ? 'mt-1.5' : ''}`}>
                <span className={`flex-none mt-0.5 ${item.hasGap ? 'text-danger' : 'text-success'}`}>{item.hasGap ? '✗' : '✓'}</span>
                <span className={item.hasGap ? 'text-danger' : ''}>{item.criterion}</span>
              </div>
            ))}
            {(opp.alignmentEvidenceMap?.length || 0) > 4 && <p className="mt-1 text-subtle">+{opp.alignmentEvidenceMap.length - 4} more criteria</p>}
          </GeneratedCard>

          <GeneratedCard
            title="Red Flags"
            score={scores.redFlags}
            hasData={(opp.redFlags?.length || 0) > 0}
            generating={generatingSection === 'red-flags'}
            improvementTasks={tasksFor('red-flags')}
            expanded={expandedSection === 'red-flags'}
            onToggle={() => toggleSection('red-flags')}
            onGenerate={() => generate('red-flags')}
            onRegenerate={() => generate('red-flags')}
            onToggleTask={(task, completed) => handleToggleTask('red-flags', task, completed)}
          >
            {(opp.redFlags || []).slice(0, 3).map((flag: any, i: number) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <span className={`font-semibold ${flag.severity === 'high' ? 'text-danger' : flag.severity === 'medium' ? 'text-warning' : 'text-muted'}`}>[{flag.severity}] </span>
                {flag.concern}
              </div>
            ))}
          </GeneratedCard>

          <GeneratedCard
            title="Programme Vibe"
            score={scores.programmeVibe}
            hasData={!!opp.programmeVibe?.generatedAt}
            generating={generatingSection === 'programme-vibe'}
            improvementTasks={tasksFor('programme-vibe')}
            expanded={expandedSection === 'programme-vibe'}
            onToggle={() => toggleSection('programme-vibe')}
            onGenerate={() => generate('programme-vibe')}
            onRegenerate={() => generate('programme-vibe')}
            onToggleTask={(task, completed) => handleToggleTask('programme-vibe', task, completed)}
          >
            {opp.programmeVibe && (
              <div className="space-y-1.5">
                <p><span className="text-foreground font-medium">Tone:</span> {opp.programmeVibe.tone}</p>
                <p><span className="text-foreground font-medium">Energy:</span> {opp.programmeVibe.energy}</p>
                <p>{opp.programmeVibe.positioningGuidance}</p>
              </div>
            )}
          </GeneratedCard>

          <GeneratedCard
            title="Reviewer Persona"
            score={scores.reviewerPersona}
            hasData={!!opp.reviewerPersona?.generatedAt}
            generating={generatingSection === 'reviewer-persona'}
            improvementTasks={tasksFor('reviewer-persona')}
            expanded={expandedSection === 'reviewer-persona'}
            onToggle={() => toggleSection('reviewer-persona')}
            onGenerate={() => generate('reviewer-persona')}
            onRegenerate={() => generate('reviewer-persona')}
            onToggleTask={(task, completed) => handleToggleTask('reviewer-persona', task, completed)}
          >
            {opp.reviewerPersona && (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">{opp.reviewerPersona.name}</p>
                <p>{opp.reviewerPersona.background}</p>
                <p className="text-foreground font-medium mt-1">Values: </p>
                <p>{opp.reviewerPersona.values?.join(', ')}</p>
              </div>
            )}
          </GeneratedCard>

          <GeneratedCard
            title="Competitive Intel"
            score={scores.competitiveIntel}
            hasData={(opp.competitiveIntel?.likelyCompetitors?.length || 0) > 0}
            generating={generatingSection === 'competitive-intel'}
            improvementTasks={tasksFor('competitive-intel')}
            expanded={expandedSection === 'competitive-intel'}
            onToggle={() => toggleSection('competitive-intel')}
            onGenerate={() => generate('competitive-intel')}
            onRegenerate={() => generate('competitive-intel')}
            onToggleTask={(task, completed) => handleToggleTask('competitive-intel', task, completed)}
          >
            {opp.competitiveIntel?.competitiveAdvantage && (
              <div className="space-y-1.5">
                <p className="text-success font-medium">Your edge:</p>
                <p>{opp.competitiveIntel.competitiveAdvantage}</p>
                {opp.competitiveIntel.likelyCompetitors?.length > 0 && (
                  <p className="text-subtle">Competing against: {opp.competitiveIntel.likelyCompetitors.slice(0, 2).join(', ')}</p>
                )}
              </div>
            )}
          </GeneratedCard>

          <GeneratedCard
            title="Social Capital"
            score={scores.socialCapital}
            hasData={(opp.socialCapital?.length || 0) > 0}
            generating={generatingSection === 'social-capital'}
            improvementTasks={tasksFor('social-capital')}
            expanded={expandedSection === 'social-capital'}
            onToggle={() => toggleSection('social-capital')}
            onGenerate={() => generate('social-capital')}
            onRegenerate={() => generate('social-capital')}
            onToggleTask={(task, completed) => handleToggleTask('social-capital', task, completed)}
          >
            {(opp.socialCapital || []).slice(0, 2).map((sc: any, i: number) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <p className="font-medium text-foreground">{sc.connection}</p>
                <p>{sc.actionSuggested}</p>
              </div>
            ))}
          </GeneratedCard>

          <GeneratedCard
            title="Unfair Advantages"
            score={scores.unfairAdvantages}
            hasData={(opp.unfairAdvantages?.length || 0) > 0}
            generating={generatingSection === 'unfair-advantages'}
            improvementTasks={tasksFor('unfair-advantages')}
            expanded={expandedSection === 'unfair-advantages'}
            onToggle={() => toggleSection('unfair-advantages')}
            onGenerate={() => generate('unfair-advantages')}
            onRegenerate={() => generate('unfair-advantages')}
            onToggleTask={(task, completed) => handleToggleTask('unfair-advantages', task, completed)}
          >
            {(opp.unfairAdvantages || []).map((adv: string, i: number) => (
              <div key={i} className={`flex items-start gap-1.5 ${i > 0 ? 'mt-1.5' : ''}`}>
                <span className="text-primary flex-none">★</span>
                <span>{adv}</span>
              </div>
            ))}
          </GeneratedCard>

          <GeneratedCard
            title="Timing Context"
            score={scores.timingContext}
            hasData={!!opp.timingContext?.generatedAt}
            generating={generatingSection === 'timing-context'}
            improvementTasks={tasksFor('timing-context')}
            expanded={expandedSection === 'timing-context'}
            onToggle={() => toggleSection('timing-context')}
            onGenerate={() => generate('timing-context')}
            onRegenerate={() => generate('timing-context')}
            onToggleTask={(task, completed) => handleToggleTask('timing-context', task, completed)}
          >
            {opp.timingContext && (
              <div className="space-y-1.5">
                <p>{opp.timingContext.relevanceNote}</p>
                {opp.timingContext.currentEvents?.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground mt-1">Current events:</p>
                    {opp.timingContext.currentEvents.slice(0, 2).map((ev: string, i: number) => <p key={i} className="text-subtle">{ev}</p>)}
                  </div>
                )}
              </div>
            )}
          </GeneratedCard>

          <div className="md:col-start-2">
            <GeneratedCard
              title="Ask Calibration"
              score={scores.askCalibration}
              hasData={!!opp.askCalibration?.recommendedAsk}
              generating={generatingSection === 'ask-calibration'}
              improvementTasks={tasksFor('ask-calibration')}
              expanded={expandedSection === 'ask-calibration'}
              onToggle={() => toggleSection('ask-calibration')}
              onGenerate={() => generate('ask-calibration')}
              onRegenerate={() => generate('ask-calibration')}
              onToggleTask={(task, completed) => handleToggleTask('ask-calibration', task, completed)}
            >
              {opp.askCalibration && (
                <div className="space-y-1.5">
                  <p className="font-semibold text-primary">{opp.askCalibration.recommendedAsk}</p>
                  <p className="text-subtle">Range: {opp.askCalibration.typicalRange}</p>
                  <p>{opp.askCalibration.rationale}</p>
                </div>
              )}
            </GeneratedCard>
          </div>

        </div>
      </div>
    </div>
  );
}
