import { Navigate } from 'react-router';
import { useAuth } from '../context/useAuth';
import PageLoading from './PageLoading';

function GuestRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <PageLoading>Loading…</PageLoading>;

    if (user) return <Navigate to="/transactions" replace />;

    return children;
}

export default GuestRoute;