import { Fragment } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/useAuth';
import PageLoading from './PageLoading';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // While the saved session is restored (e.g. after a refresh), wait: redirecting now
    // would lose the page and its filters for a user who is signed in.
    if (loading) return <PageLoading>Loading…</PageLoading>;

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Keyed by the user, so if a different user signs in (e.g. in another tab) every
    // signed-in page starts again from nothing and loads that user's data (US-59).
    return <Fragment key={user.id ?? user.email}>{children}</Fragment>;
}

export default ProtectedRoute;
