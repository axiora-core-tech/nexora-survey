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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center animate-pulse">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="bottom-center" toastOptions={{ duration:3000, style:{
        borderRadius:'12px', background:'#1C1917', color:'#fff', fontSize:'14px',
        fontFamily:'"DM Sans",sans-serif', padding:'12px 18px', boxShadow:'0 12px 32px rgba(0,0,0,0.12)',
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
