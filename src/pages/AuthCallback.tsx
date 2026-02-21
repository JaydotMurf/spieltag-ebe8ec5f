import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AuthCallback() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/holdings" replace />;
  return <Navigate to="/" replace />;
}
