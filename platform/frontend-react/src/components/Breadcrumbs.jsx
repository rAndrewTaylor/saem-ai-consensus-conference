import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
  survey: 'Survey',
  rank: 'Pairwise Ranking',
  vote: 'Conference Voting',
  dashboard: 'Dashboard',
  results: 'Results',
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = routeLabels[seg] || (seg.startsWith('round') ? seg.replace('_', ' ') : `WG ${seg}`);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link to="/" className="text-white/30 hover:text-white/60 transition">
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {crumbs.map(({ path, label, isLast }) => (
          <li key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-white/20" />
            {isLast ? (
              <span className="font-medium text-white/70">{label}</span>
            ) : (
              <Link to={path} className="text-white/30 hover:text-white/60 transition">{label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
