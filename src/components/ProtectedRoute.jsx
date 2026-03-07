import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import PageLoader from '../pages/PageLoader';

export default function ProtectedRoute() {
  const { user, loading } = useAuthStore();

  // BUG FIX: Was returning null during loading, causing a blank white flash
  // every time a protected page was visited or the app was first loaded.
  // Now shows the branded PageLoader instead.
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
