'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import Navbar from '@/components/Navbar';

interface Opportunity {
  _id: string;
  programmeName: string;
  organisation: string;
  deadline: string | null;
  status: string;
}

export default function ArchivePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/opportunities?archived=true')
      .then(r => r.ok ? r.json() : [])
      .then(setOpportunities)
      .finally(() => setLoading(false));
  }, []);

  const restoreOpportunity = async (id: string) => {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) setOpportunities(prev => prev.filter(o => o._id !== id));
  };

  const deleteOpportunity = async (id: string) => {
    const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
    if (res.ok) setOpportunities(prev => prev.filter(o => o._id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
          ← Back to Pipeline
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Archive</h1>
          <p className="text-muted text-sm">Opportunities you've set aside. Restore any time.</p>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted">Loading archive...</div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-24 text-subtle border border-dashed border-border rounded-2xl">
            Nothing archived yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {opportunities.map(opp => (
              <div
                key={opp._id}
                className="glass-card p-4 flex items-center gap-4 group"
                style={{ transform: 'none' }}
              >
                {confirmDelete === opp._id ? (
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="text-sm text-foreground flex-1">
                      Permanently delete <span className="font-semibold">{opp.programmeName}</span>?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteOpportunity(opp._id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-elevated text-muted border border-border hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/opportunity/${opp._id}`)}
                    >
                      <p className="font-medium text-foreground truncate">{opp.programmeName}</p>
                      <p className="text-xs text-muted truncate">{opp.organisation}</p>
                    </div>
                    <div className="shrink-0 text-right hidden sm:block">
                      {opp.deadline ? (
                        <span className="text-xs text-subtle">
                          {new Date(opp.deadline) < new Date()
                            ? `Passed ${formatDistanceToNow(new Date(opp.deadline), { addSuffix: true })}`
                            : format(new Date(opp.deadline), 'dd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-subtle">No deadline</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => restoreOpportunity(opp._id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => setConfirmDelete(opp._id)}
                        className="p-1.5 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete permanently"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
