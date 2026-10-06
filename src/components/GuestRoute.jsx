import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

function GuestRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <p>Loading...</p>;

    if (user) return <Navigate to="/transactions" replace />;

    return children;
}

export default GuestRoute;