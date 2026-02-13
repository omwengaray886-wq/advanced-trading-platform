import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { PageLoader } from './components/ui/PageLoader';
import LogicSentinel from './components/features/LogicSentinel';

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Markets = lazy(() => import('./pages/Markets'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Account = lazy(() => import('./pages/Account'));
const Education = lazy(() => import('./pages/Education'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const RiskCalculator = lazy(() => import('./pages/RiskCalculator'));
const TradeSetups = lazy(() => import('./pages/TradeSetups'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const RiskDisclosure = lazy(() => import('./pages/RiskDisclosure'));
const Refund = lazy(() => import('./pages/Refund'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Support = lazy(() => import('./pages/Support'));
const Performance = lazy(() => import('./pages/Performance'));
const SignalLab = lazy(() => import('./pages/SignalLab'));
const MarketScanner = lazy(() => import('./pages/MarketScanner'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Alerts = lazy(() => import('./pages/Alerts'));

// Protected Route wrapper - Bypassed for open access (Phase 70)
const ProtectedRoute = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <LogicSentinel />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Navigate to="/login" replace />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/risk-disclosure" element={<RiskDisclosure />} />
                  <Route path="/refund" element={<Refund />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/performance" element={<Performance />} />

                  {/* App Routes (Protected) */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/app" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="markets" element={<Markets />} />
                      <Route path="setups" element={<TradeSetups />} />
                      <Route path="risk" element={<RiskCalculator />} />
                      <Route path="account" element={<Account />} />
                      <Route path="education" element={<Education />} />
                      <Route path="education/:id" element={<ArticleDetail />} />
                      <Route path="lab" element={<SignalLab />} />
                      <Route path="scanner" element={<MarketScanner />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="alerts" element={<Alerts />} />
                      <Route path="*" element={<Navigate to="/app" replace />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
