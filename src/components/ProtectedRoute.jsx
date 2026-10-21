import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/useAuth';
import PageLoading from './PageLoading';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <PageLoading>Loading…</PageLoading>;

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}

export default ProtectedRoute;