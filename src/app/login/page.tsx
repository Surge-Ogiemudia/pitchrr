'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      <div className="glass-card p-8 w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light mx-auto flex items-center justify-center text-[#0A0A0F] font-bold text-3xl shadow-xl shadow-primary/20 mb-6">
            P
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Pitchrr</h1>
          <p className="text-muted text-sm">Strategic Application Engine</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-center font-mono tracking-widest"
              autoFocus
            />
          </div>
          
          {error && <p className="text-danger text-sm text-center">{error}</p>}
          
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Accessing...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
