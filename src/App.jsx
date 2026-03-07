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
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse" style={{animationDelay:`${i*200}ms`}}/>)}</div>
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
        borderRadius: '8px', background: '#1A1A1A', color: '#fff', fontSize: '13px',
        fontFamily: 'Inter, sans-serif', padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
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
