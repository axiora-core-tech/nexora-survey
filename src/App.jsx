import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './hooks/useAuth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SurveyList from './pages/SurveyList';
import SurveyCreate from './pages/SurveyCreate';
import SurveyEdit from './pages/SurveyEdit';
import SurveyAnalytics from './pages/SurveyAnalytics';
import SurveyRespond from './pages/SurveyRespond';
import TeamManagement from './pages/TeamManagement';
import Settings from './pages/Settings';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex gap-1">
        {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-pulse" style={{animationDelay:`${i*150}ms`}}/>)}
      </div>
    </div>
  );
}

export default function App() {
  const { initialize, loading, initialized } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);
  if (!initialized || loading) return <Loader />;

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3500, style: {
        borderRadius:'10px', background:'#1c1917', color:'#fafaf9', fontSize:'13px',
        fontFamily:'"DM Sans",sans-serif', padding:'10px 16px', maxWidth:'420px',
      }}} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/s/:slug" element={<SurveyRespond />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/surveys" element={<SurveyList />} />
            <Route path="/surveys/new" element={<SurveyCreate />} />
            <Route path="/surveys/:id/edit" element={<SurveyEdit />} />
            <Route path="/surveys/:id/analytics" element={<SurveyAnalytics />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
