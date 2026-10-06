import { Navigate, Route, Routes } from 'react-router';
import TransactionsPage from './pages/TransactionsPage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';

function App() {
    const { user, loading, signOut } = useAuth();

    return (
        <>
            <div style={{ padding: '0.5rem', background: '#eee' }}>
                {loading
                    ? 'Checking session...'
                    : user
                        ? <>Logged in as {user.email} <button onClick={signOut}>Log out</button></>
                        : 'Not logged in'}
            </div>

            <Routes>
                <Route path="/login" element={
                    <GuestRoute><AuthPage key="login" mode="login" /></GuestRoute>
                } />
                <Route path="/register" element={
                    <GuestRoute><AuthPage key="register" mode="register" /></GuestRoute>
                } />
                <Route path="/" element={<Navigate to="/transactions" replace />} />
                <Route path="/transactions" element={
                    <ProtectedRoute><TransactionsPage /></ProtectedRoute>
                } />
            </Routes>
        </>
    );
}

export default App;