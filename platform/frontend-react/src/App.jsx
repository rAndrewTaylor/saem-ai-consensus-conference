import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/hooks/useTheme';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScrollToTop } from '@/components/ScrollToTop';
import { PageLoader } from '@/components/ui/page-loader';

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
          <Route path="/try" element={<TryPage />} />
          <Route path="/survey/:wgNumber/:roundName" element={<SurveyPage />} />
          <Route path="/rank/:wgNumber" element={<PairwisePage />} />
          <Route path="/vote/:sessionId" element={<ConferencePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/results/:wgNumber" element={<ResultsPage />} />
          <Route path="/guide" element={<GettingStartedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <ScrollToTop />
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
