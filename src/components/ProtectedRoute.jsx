import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-teal/30 border-t-teal animate-spin" />
          <p className="mt-4 text-sm text-ink/50 font-display">Opening the ward…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
