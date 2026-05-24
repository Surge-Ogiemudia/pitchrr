'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: '/', label: 'Pipeline', icon: '⚡' },
    { href: '/fill', label: 'Fill', icon: '⬡' },
    { href: '/profile', label: 'Profile', icon: '◉' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-[#0A0A0F] font-bold text-base sm:text-lg shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              P
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">
              Pitchrr
            </span>
            {session?.user && (
              <span className={`hidden sm:inline-flex ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                session.user.persona === 'career' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'
              }`}>
                {session.user.persona} Mode
              </span>
            )}
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? 'bg-primary/10 text-primary-light border border-primary/20'
                      : 'text-muted hover:text-foreground hover:bg-elevated'
                  }`}
                >
                  <span className="mr-1 sm:mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
            
            {session?.user && (
              <div className="flex items-center gap-3 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-border">
                <span className="text-xs font-semibold text-muted hidden md:block">
                  {session.user.name}
                </span>
                <button 
                  onClick={() => signOut()}
                  className="text-xs font-bold text-muted hover:text-danger transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
            
            <a
              href={process.env.NEXT_PUBLIC_PREPARR_URL || 'https://preprr.vercel.app/'}
              className="text-primary hover:text-primary-light font-bold text-xl sm:text-2xl ml-1 sm:ml-2 transition-colors"
              title="Go to Preparr"
            >
              »
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
