import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, profile, loading } = useAuthStore();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
