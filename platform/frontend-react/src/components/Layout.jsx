import { Link, useLocation } from 'react-router-dom';
import { BrainCircuit, Home, LayoutDashboard, BookOpen, Menu, X, Sun, Moon, Beaker, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/guide', label: 'Guide', icon: BookOpen },
  { to: '/join', label: 'Join', icon: UserPlus, highlight: true },
  { to: '/try', label: 'Demo', icon: Beaker },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { theme, toggle } = useTheme();

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
            <span className="text-lg font-bold tracking-tight text-white">SAEM AI Consensus</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            {navLinks.map(({ to, label, icon: Icon, highlight }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-white/[0.1] text-white"
                      : highlight
                        ? "border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                        : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="ml-2 rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-1 sm:hidden">
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
          <div className="border-t border-white/[0.06] px-4 py-2 sm:hidden" style={{ backgroundColor: 'var(--th-surface)' }}>
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  location.pathname === to
                    ? "bg-white/[0.1] text-white"
                    : "text-white/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main content */}
      <main id="main-content" className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10" style={{ backgroundColor: 'var(--th-base)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* SAEM26 event logo */}
          <div className="flex justify-center">
            <img
              src="/images/saem26-logo.png"
              alt="SAEM26 Annual Meeting"
              className="h-14 transition hover:opacity-80"
            />
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-medium text-white/40">
              AI Consensus Conference &middot; May 21, 2026 &middot; Atlanta
            </p>
            <p className="mt-1 text-xs text-white/20">
              AI-Enhanced Modified Delphi Method
            </p>
          </div>

          {/* Supporter logos — each in a white pill so they render cleanly on any theme */}
          <div className="mt-8 border-t border-white/[0.04] pt-6">
            <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
              Supported by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex h-14 items-center rounded-lg bg-white px-5 shadow-sm transition hover:shadow-md">
                <img
                  src="/images/saem-logo.png"
                  alt="Society for Academic Emergency Medicine"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div className="flex h-14 items-center rounded-lg bg-white px-5 shadow-sm transition hover:shadow-md">
                <img
                  src="/images/uva-sponsor.jpeg"
                  alt="University of Virginia School of Medicine — Department of Emergency Medicine"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div className="flex h-14 items-center rounded-lg bg-white px-5 shadow-sm transition hover:shadow-md">
                <img
                  src="/images/cord-logo.jpg"
                  alt="CORD — Council of Residency Directors in Emergency Medicine"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div className="flex h-14 items-center rounded-lg bg-white px-5 shadow-sm transition hover:shadow-md">
                <img
                  src="/images/abem-logo-full.png"
                  alt="American Board of Emergency Medicine"
                  className="h-9 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
