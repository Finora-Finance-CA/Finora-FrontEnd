import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/useAuth';
import PageLoading from './PageLoading';

function GuestRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <PageLoading>Loading…</PageLoading>;

    // Signed in (e.g. just now): back to the page the user was sent here from, with its
    // search and filters, or to Transactions.
    if (user) {
        const from = location.state?.from;
        const to = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/transactions';
        return <Navigate to={to} replace />;
    }

    return children;
}

export default GuestRoute;
