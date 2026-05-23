'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { formatDistanceToNow } from 'date-fns';

interface Opportunity {
  _id: string;
  programmeName: string;
  organisation: string;
  deadline: string | null;
  status: string;
  scrapedQuestions: { question: string }[];
  draftedAnswers: { questionIndex: number }[];
}

const COLUMNS = [
  { id: 'discovered', label: 'Discovered' },
  { id: 'analyzing', label: 'Analyzing' },
  { id: 'drafting', label: 'Drafting' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'interview', label: 'Interview' },
];

export default function PipelineDashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputData, setInputData] = useState('');
  const [processingUrl, setProcessingUrl] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/opportunities');
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputData.trim()) return;
    
    setProcessingUrl(true);
    setIntakeError(null);

    const isUrl = inputData.trim().startsWith('http://') || inputData.trim().startsWith('https://');

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: isUrl ? inputData.trim() : undefined,
          rawText: !isUrl ? inputData.trim() : undefined,
        }),
      });

      if (res.ok) {
        const opp = await res.json();
        setInputData('');
        router.push(`/opportunity/${opp._id}`);
      } else {
        const data = await res.json();
        setIntakeError(data.error || 'Failed to analyze opportunity — try pasting the raw text instead');
        setProcessingUrl(false);
      }
    } catch (err) {
      setIntakeError('Network error — check your connection and try again');
      setProcessingUrl(false);
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
      if (res.ok) setOpportunities(prev => prev.filter(o => o._id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const archiveOpportunity = async (id: string) => {
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) setOpportunities(prev => prev.filter(o => o._id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmArchive(null);
    }
  };

  const getDeadlineText = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline';
    const date = new Date(dateStr);
    const now = new Date();
    if (date < now) return 'Passed';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Application Pipeline</h1>
            <p className="text-muted text-sm">Strategic tracking for all opportunities.</p>
          </div>
          
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleIntake} className="flex gap-2">
              <textarea
                value={inputData}
                onChange={(e) => { setInputData(e.target.value); setIntakeError(null); }}
                placeholder="Paste opportunity URL or raw page text here..."
                required
                rows={1}
                className="flex-1 bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-y min-h-[44px] max-h-32"
              />
              <button
                type="submit"
                disabled={processingUrl || !inputData.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap self-start"
              >
                {processingUrl ? 'Analyzing...' : 'Add & Analyze'}
              </button>
            </form>
            {intakeError && (
              <p className="mt-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{intakeError}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted">Loading pipeline...</div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
            {COLUMNS.map(col => {
              const colOpps = opportunities.filter(o => o.status === col.id);
              return (
                <div key={col.id} className="flex-none w-80 flex flex-col snap-start">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full status-${col.id} bg-current border border-current`} />
                      {col.label}
                    </h3>
                    <span className="text-xs font-medium text-muted bg-elevated px-2 py-0.5 rounded-full">
                      {colOpps.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-h-[200px] p-2 -mx-2 rounded-xl bg-surface/50">
                    {colOpps.map(opp => (
                      <div
                        key={opp._id}
                        onClick={() => {
                          if (confirmDelete !== opp._id && confirmArchive !== opp._id && menuOpen !== opp._id) router.push(`/opportunity/${opp._id}`);
                        }}
                        className="glass-card p-4 cursor-pointer hover:border-primary/50 relative group"
                      >
                        {confirmDelete === opp._id ? (
                          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <p className="text-sm font-semibold text-foreground">Delete permanently?</p>
                            <p className="text-xs text-muted line-clamp-1">{opp.programmeName}</p>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => deleteOpportunity(opp._id)}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-elevated text-muted border border-border hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : confirmArchive === opp._id ? (
                          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <p className="text-sm font-semibold text-foreground">Archive this application?</p>
                            <p className="text-xs text-muted line-clamp-1">{opp.programmeName}</p>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => archiveOpportunity(opp._id)}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                              >
                                Archive
                              </button>
                              <button
                                onClick={() => setConfirmArchive(null)}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-elevated text-muted border border-border hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-xs font-semibold ${opp.deadline && new Date(opp.deadline) < new Date() ? 'text-danger' : 'text-muted'}`}>
                                {getDeadlineText(opp.deadline)}
                              </span>
                              {/* Action menu */}
                              <div className="relative" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setMenuOpen(v => v === opp._id ? null : opp._id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground transition-all p-0.5 rounded"
                                  title="Actions"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                                </button>
                                {menuOpen === opp._id && (
                                  <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border rounded-xl shadow-xl py-1 min-w-[130px]">
                                    <button
                                      onClick={() => { setMenuOpen(null); setConfirmArchive(opp._id); }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-elevated transition-colors flex items-center gap-2"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                                      Archive
                                    </button>
                                    <button
                                      onClick={() => { setMenuOpen(null); setConfirmDelete(opp._id); }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <h4 className="font-medium text-foreground line-clamp-2 leading-snug mb-1">
                              {opp.programmeName}
                            </h4>
                            <p className="text-xs text-muted truncate mb-2">
                              {opp.organisation}
                            </p>
                            {opp.scrapedQuestions?.length > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${((opp.draftedAnswers?.length || 0) / opp.scrapedQuestions.length) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted flex-none">
                                  {opp.draftedAnswers?.length || 0}/{opp.scrapedQuestions.length}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {colOpps.length === 0 && (
                      <div className="text-center py-8 text-xs text-subtle border border-dashed border-border rounded-lg">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
