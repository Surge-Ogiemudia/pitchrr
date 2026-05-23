'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '@/components/Navbar';
import IntelligenceTab from '@/components/IntelligenceTab';
import DraftingTab from '@/components/DraftingTab';
import StrategyTab from '@/components/StrategyTab';
import ReviewTab from '@/components/ReviewTab';
import { computeIntelligenceScores } from '@/lib/intelligence-scores';

type Tab = 'intelligence' | 'strategy' | 'drafting' | 'review';

const STATUS_OPTIONS = [
  'discovered', 'analyzing', 'drafting', 'reviewing',
  'submitted', 'confirmed', 'interview', 'decision', 'won', 'lost',
] as const;

export default function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [opportunity, setOpportunity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('intelligence');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    setStatusMenuOpen(false);
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setOpportunity((prev: any) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetch(`/api/opportunities/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOpportunity(data); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = (patch: Partial<any>) => {
    setOpportunity((prev: any) => prev ? { ...prev, ...patch } : prev);
  };

  if (loading) return <div className="min-h-screen pt-24 text-center text-muted">Loading opportunity...</div>;
  if (!opportunity) return <div className="min-h-screen pt-24 text-center text-danger">Opportunity not found.</div>;

  const scores = computeIntelligenceScores(opportunity);
  const draftCount = opportunity.draftedAnswers?.length || 0;
  const questionCount = opportunity.scrapedQuestions?.length || 0;

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: 'intelligence', label: 'Intelligence', badge: `${scores.overall}%` },
    { id: 'strategy', label: 'Strategy' },
    { id: 'drafting', label: 'Drafting', badge: questionCount > 0 ? `${draftCount}/${questionCount}` : undefined },
    { id: 'review', label: 'Review' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
          ← Back to Pipeline
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {/* Clickable status badge */}
              <div className="relative">
                <button
                  onClick={() => setStatusMenuOpen(v => !v)}
                  disabled={updatingStatus}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border status-${opportunity.status} flex items-center gap-1.5 disabled:opacity-60`}
                >
                  {updatingStatus ? '...' : opportunity.status.toUpperCase()}
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {statusMenuOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-30 glass-card p-1.5 shadow-xl min-w-[160px] border border-border">
                    {STATUS_OPTIONS.filter(s => s !== opportunity.status).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-elevated transition-colors text-muted hover:text-foreground"
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {opportunity.deadline && (
                <span className="text-xs sm:text-sm font-medium text-warning bg-warning/10 px-3 py-1 rounded-full">
                  Due {formatDistanceToNow(new Date(opportunity.deadline), { addSuffix: true })}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-1 leading-tight">{opportunity.programmeName}</h1>
            <p className="text-sm sm:text-lg text-muted">{opportunity.organisation}</p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center text-base sm:text-lg font-bold ${scores.overall >= 70 ? 'border-success text-success shadow-[0_0_15px_rgba(16,185,129,0.15)]' : scores.overall >= 40 ? 'border-warning text-warning' : 'border-border text-muted'}`}>
              {scores.overall}
            </div>
            <span className="text-[10px] text-muted mt-1 font-medium uppercase tracking-wider">Intel Score</span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 mb-8">
          <div className="flex gap-1 bg-elevated p-1 rounded-xl border border-border w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-[#0A0A0F]' : 'text-muted hover:text-foreground'}`}
              >
                {tab.label}
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-[#0A0A0F]/20 text-[#0A0A0F]' : 'bg-surface text-muted border border-border'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'intelligence' && (
          <IntelligenceTab opportunity={opportunity} onUpdate={handleUpdate} />
        )}
        {activeTab === 'strategy' && <StrategyTab opportunity={opportunity} onUpdate={handleUpdate} />}
        {activeTab === 'drafting' && (
          <DraftingTab
            opportunity={opportunity}
            onUpdate={handleUpdate}
          />
        )}
        {activeTab === 'review' && <ReviewTab opportunity={opportunity} />}
      </main>
    </div>
  );
}
