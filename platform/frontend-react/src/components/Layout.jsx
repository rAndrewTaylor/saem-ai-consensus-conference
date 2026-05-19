import { Link, useLocation } from 'react-router-dom';
import { BrainCircuit, LayoutDashboard, Menu, X, Sun, Moon, LogIn, LayoutGrid } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { getActiveWg } from '@/lib/api';

// Conference-day routes get no global chrome — no nav, no footer.
// Audience members on /day or /vote/:id only see what the
// SignedInChip + StageFollowOrchestrator render. Projector /stage
// already has its own chrome (admin strip + SAEM footer).
const NO_CHROME_PATTERNS = [
  /^\/welcome$/,
  /^\/day$/,
  /^\/vote\//,
  /^\/stage$/,
  /^\/command$/,
];

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { theme, toggle } = useTheme();

  // All hooks must run unconditionally before any early return — otherwise
  // toggling between chrome'd and no-chrome routes (e.g. clicking the
  // Conference Day tab from /reports/round1) changes the hook count
  // between renders and React throws.
  const wgNumber = getActiveWg();
  const isSignedIn = wgNumber !== null;

  // Day-of nav: visitors hit the landing page first. The primary slot
  // is the entry point — when signed out it reads "Sign in" (→ /join,
  // which lands them on /welcome after sign-in); once signed in it
  // becomes "Consensus Day" (→ /welcome) so they can navigate back to
  // the tile grid from anywhere. Admin lives next to it and gates
  // itself.
  const navLinks = useMemo(() => {
    return [
      isSignedIn
        ? { to: '/welcome', label: 'Consensus Day', icon: LayoutGrid, highlight: true }
        : { to: '/join', label: 'Sign in', icon: LogIn, highlight: true },
      { to: '/dashboard', label: 'Admin', icon: LayoutDashboard },
    ];
  }, [isSignedIn]);

  const isActiveLink = (link) => {
    if (link.hash) return false; // hash links don't get active state
    if (link.to === '/') return location.pathname === '/';
    return location.pathname.startsWith(link.to);
  };

  const noChrome = NO_CHROME_PATTERNS.some((re) => re.test(location.pathname));
  if (noChrome) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--th-base)' }}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-[#1B5E8A] focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <main id="main-content">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--th-base)' }}>
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-[#1B5E8A] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl" style={{ backgroundColor: 'var(--th-nav-bg)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 transition hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0C2340] to-[#00B4D8]">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div className="hidden min-[480px]:block">
              <span className="text-lg font-bold tracking-tight text-white">SAEM AI Consensus</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActiveLink(link);
              return (
                <Link
                  key={link.to + (link.hash || '')}
                  to={link.to + (link.hash || '')}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-white/[0.1] text-white"
                      : link.highlight
                        ? "border border-[#00B4D8]/30 bg-[#00B4D8]/10 text-[#48CAE4] hover:bg-[#00B4D8]/15 hover:text-[#48CAE4]"
                        : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* Theme toggle */}
            <div className="mx-1.5 h-5 w-px bg-white/[0.08]" />
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06]"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              className="rounded-lg p-2 text-white/60 hover:bg-white/[0.06]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-white/[0.06] px-4 py-2 md:hidden" style={{ backgroundColor: 'var(--th-surface)' }}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to + (link.hash || '')}
                  to={link.to + (link.hash || '')}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActiveLink(link)
                      ? "bg-white/[0.1] text-white"
                      : "text-white/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

          </div>
        )}
      </nav>

      {/* Main content */}
      <main id="main-content" className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10" style={{ backgroundColor: 'var(--th-base)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-medium text-white/40">
              AI Consensus Conference &middot; May 21, 2026 &middot; Atlanta
            </p>
            <p className="mt-1 text-xs text-white/20">
              AI-Enhanced Modified Delphi Method
            </p>
          </div>

          {/* Supporters */}
          <div className="mt-8 border-t border-white/[0.04] pt-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
              Supported by
            </p>
            <p className="mt-2 text-xs text-white/40">
              SAEM &middot; UVA Department of Emergency Medicine &middot; CORD &middot; ABEM
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
