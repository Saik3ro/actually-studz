
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react'; // Assuming lucide-react is installed

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
