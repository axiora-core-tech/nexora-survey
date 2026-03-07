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

export default function App() {
  const { initialize, loading, initialized } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  if (!initialized || loading) return (
    <div className="h-screen flex items-center justify-center bg-dark">
      <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{animationDelay:`${i*200}ms`}}/>)}</div>
    </div>
  );

  return (
    <>
      <Toaster position="bottom-center" toastOptions={{ duration: 3000, style: {
        borderRadius: '100px', background: '#0A0A0A', color: '#fff', fontSize: '14px',
        fontFamily: 'Outfit, sans-serif', padding: '12px 24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
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
