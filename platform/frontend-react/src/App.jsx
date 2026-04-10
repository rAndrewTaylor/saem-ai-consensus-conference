import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/survey/:wgNumber/:roundName" element={<SurveyPage />} />
          <Route path="/rank/:wgNumber" element={<PairwisePage />} />
          <Route path="/vote/:sessionId" element={<ConferencePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/results/:wgNumber" element={<ResultsPage />} />
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
