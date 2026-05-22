'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Pipeline', icon: '⚡' },
    { href: '/profile', label: 'Profile', icon: '◉' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-[#0A0A0F] font-bold text-lg shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              P
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">
              Pitchrr
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === link.href
                      ? 'bg-primary/10 text-primary-light border border-primary/20'
                      : 'text-muted hover:text-foreground hover:bg-elevated'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
            <a
              href={process.env.NEXT_PUBLIC_PREPARR_URL || 'https://preprr.vercel.app/'}
              className="text-primary hover:text-primary-light font-bold text-2xl ml-2 transition-colors"
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
