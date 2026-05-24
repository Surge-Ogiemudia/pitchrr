'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [persona, setPersona] = useState<'startup' | 'career'>('startup');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, persona }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      // Automatically log in after registration
      await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-8 w-full max-w-md my-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Create your Account</h1>
          <p className="text-sm text-muted mt-2">Choose your mode and set up your intelligence engine.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5 ml-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Your Name"
            />
          </div>
          
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

          <div className="pt-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2 ml-1">Select Persona</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPersona('startup')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  persona === 'startup' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-elevated border-border text-muted hover:border-primary/50'
                }`}
              >
                <div className="font-bold text-sm mb-1">Startup Founder</div>
                <div className="text-[10px] leading-tight">Apply for grants, accelerators, and VC funds.</div>
              </button>
              
              <button
                type="button"
                onClick={() => setPersona('career')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  persona === 'career' 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                    : 'bg-elevated border-border text-muted hover:border-emerald-500/50'
                }`}
              >
                <div className="font-bold text-sm mb-1">Career / Job Seeker</div>
                <div className="text-[10px] leading-tight">Apply for jobs, tailor CVs, and write cover letters.</div>
              </button>
            </div>
          </div>

          {error && <p className="text-danger text-xs font-semibold text-center mt-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-[#0A0A0F] font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 mt-6"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          Already have an account? <Link href="/login" className="text-primary hover:underline font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
