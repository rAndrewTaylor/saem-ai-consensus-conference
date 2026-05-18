import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/hooks/useTheme';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScrollToTop } from '@/components/ScrollToTop';
import { PageLoader } from '@/components/ui/page-loader';
import { StageFollowOrchestrator } from '@/components/conference/StageFollowOrchestrator';
import { lazyWithReload, clearChunkReloadFlag } from '@/lib/lazyWithReload';

// Alias `lazy` to our reload-on-stale-chunk wrapper so a Railway deploy
// doesn't crash already-open tabs.
const lazy = lazyWithReload;

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const SurveyPage = lazy(() => import('@/pages/SurveyPage').then(m => ({ default: m.SurveyPage })));
const PairwisePage = lazy(() => import('@/pages/PairwisePage').then(m => ({ default: m.PairwisePage })));
const ConferencePage = lazy(() => import('@/pages/ConferencePage').then(m => ({ default: m.ConferencePage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ResultsPage = lazy(() => import('@/pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const GettingStartedPage = lazy(() => import('@/pages/GettingStartedPage').then(m => ({ default: m.GettingStartedPage })));
const WorkingGroupPage = lazy(() => import('@/pages/WorkingGroupPage').then(m => ({ default: m.WorkingGroupPage })));
const InvitePage = lazy(() => import('@/pages/InvitePage').then(m => ({ default: m.InvitePage })));
const TryPage = lazy(() => import('@/pages/TryPage').then(m => ({ default: m.TryPage })));
const LeadClaimPage = lazy(() => import('@/pages/LeadClaimPage').then(m => ({ default: m.LeadClaimPage })));
const LeadDashboardPage = lazy(() => import('@/pages/LeadDashboardPage').then(m => ({ default: m.LeadDashboardPage })));
const JoinPage = lazy(() => import('@/pages/JoinPage').then(m => ({ default: m.JoinPage })));
const Round1ReportPage = lazy(() => import('@/pages/Round1ReportPage').then(m => ({ default: m.Round1ReportPage })));
const Round2ReportPage = lazy(() => import('@/pages/Round2ReportPage').then(m => ({ default: m.Round2ReportPage })));
const ConferenceDayPage = lazy(() => import('@/pages/ConferenceDayPage').then(m => ({ default: m.ConferenceDayPage })));
const WelcomePage = lazy(() => import('@/pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const StagePage = lazy(() => import('@/pages/StagePage').then(m => ({ default: m.StagePage })));
const CommandPage = lazy(() => import('@/pages/CommandPage').then(m => ({ default: m.CommandPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/wg" element={<Navigate to="/#working-groups" replace />} />
          <Route path="/wg/:wgNumber" element={<WorkingGroupPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          {/* Alias for emails that used /join/<token> as a path (older
              templates). Same component as /invite/:token. */}
          <Route path="/join/:token" element={<InvitePage />} />
          <Route path="/try" element={<TryPage />} />
          <Route path="/lead/claim/:token" element={<LeadClaimPage />} />
          <Route path="/lead" element={<LeadDashboardPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/survey/:wgNumber/:roundName" element={<SurveyPage />} />
          <Route path="/rank/:wgNumber" element={<PairwisePage />} />
          <Route path="/vote/:sessionId" element={<ConferencePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/results/:wgNumber" element={<ResultsPage />} />
          <Route path="/reports/round1" element={<Round1ReportPage />} />
          <Route path="/reports/round2" element={<Round2ReportPage />} />
          <Route path="/day" element={<ConferenceDayPage />} />
          <Route path="/stage" element={<StagePage />} />
          <Route path="/command" element={<CommandPage />} />
          <Route path="/conference-day" element={<Navigate to="/day" replace />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/guide" element={<GettingStartedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  // First successful mount means the current bundle is intact; clear
  // the chunk-reload flag so a future stale-chunk error can recover.
  useEffect(() => { clearChunkReloadFlag(); }, []);
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <ScrollToTop />
              <StageFollowOrchestrator />
              <Layout>
                <AnimatedRoutes />
              </Layout>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
