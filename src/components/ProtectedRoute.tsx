import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // No partial render before redirect
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
