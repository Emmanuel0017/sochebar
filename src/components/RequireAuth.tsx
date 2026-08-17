import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './Spinner';
import type { RoleName } from '../types';

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: RoleName[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
