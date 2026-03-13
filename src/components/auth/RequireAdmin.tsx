import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/shared/LoadingState';
import Forbidden from '@/pages/Forbidden';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingState /></div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
