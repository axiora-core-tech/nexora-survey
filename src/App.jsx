import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PageLoader from "./pages/PageLoader";

// ── Loading context ───────────────────────────────────────────────
import { LoadingProvider, useLoading } from './context/LoadingContext';

// ── Layout & guards ──────────────────────────────────────────────
import DashboardLayout  from './components/DashboardLayout';
import ProtectedRoute   from './components/ProtectedRoute';

// ── Pages ────────────────────────────────────────────────────────
import LandingPage      from './pages/Landing';
import LoginPage        from './pages/Login';
import RegisterPage     from './pages/Register';
import Dashboard        from './pages/Dashboard';
import SurveyList       from './pages/SurveyList';
import SurveyCreate     from './pages/SurveyCreate';
import SurveyEdit       from './pages/SurveyEdit';
import SurveyAnalytics  from './pages/SurveyAnalytics';
import SurveyRespond    from './pages/SurveyRespond';
import EmbedView        from './pages/EmbedView';
import TeamManagement   from './pages/TeamManagement';
import Settings         from './pages/Settings';
import ResetPassword    from './pages/ResetPassword';
import UpdatePassword   from './pages/UpdatePassword';

// ── Auth store ───────────────────────────────────────────────────
import useAuthStore from './hooks/useAuth';

/**
 * GlobalSpinner
 * Reads isLoading from context (derived from location.key during render —
 * no effect timing issues) and shows the full-page overlay when true.
 */
function GlobalSpinner() {
  const { isLoading } = useLoading();
  return isLoading ? <PageLoader /> : null;
}

function AppRoutes() {
  const { initialize, initialized, user } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  if (!initialized) return <PageLoader />;

  return (
    <>
      <GlobalSpinner />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Syne, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            background: '#160F08',
            color: '#FDF5E8',
            borderRadius: 12,
            padding: '12px 18px',
          },
          success: { iconTheme: { primary: '#FF4500', secondary: '#FDF5E8' } },
          error:   { iconTheme: { primary: '#D63B1F', secondary: '#FDF5E8' } },
        }}
      />

      <Routes>
        {/* ── Public ── */}
        <Route path="/"               element={initialized && user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* ── Public survey response (no auth needed) ── */}
        <Route path="/s/:slug"      element={<SurveyRespond />} />
        <Route path="/embed/:slug"  element={<EmbedView />} />

        {/* ── Protected app (all children require auth) ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"              element={<Dashboard />} />
            <Route path="/surveys"                element={<SurveyList />} />
            <Route path="/surveys/new"            element={<SurveyCreate />} />
            <Route path="/surveys/:id/edit"       element={<SurveyEdit />} />
            <Route path="/surveys/:id/analytics"  element={<SurveyAnalytics />} />
            <Route path="/team"                   element={<TeamManagement />} />
            <Route path="/settings"               element={<Settings />} />
          </Route>
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={initialized && user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <LoadingProvider>
      <AppRoutes />
    </LoadingProvider>
  );
}
