'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Welcome to Pitchrr</h1>
          <p className="text-sm text-muted mt-2">Log in to access your intelligence engine.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-danger text-xs font-semibold text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-[#0A0A0F] font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          Don't have an account? <Link href="/register" className="text-primary hover:underline font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
